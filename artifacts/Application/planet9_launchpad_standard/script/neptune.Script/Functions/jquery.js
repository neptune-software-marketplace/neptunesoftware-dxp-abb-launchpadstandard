jQuery.sap.require('sap.m.MessageBox');
jQuery.sap.require('jquery.sap.storage');

// common jQuery funcs
function serializeDataForQueryString(data) {
    return jQuery.param(data);
}

function isCordovaFilePluginAvailable() {
    return typeof cordova.file !== 'undefined' && typeof cordova.file === 'object';
}

// read file from cordova app storage
function cordovaReadFile(path, readAs = 'ArrayBuffer') {
    return new Promise((resolve, reject) => {
        if (!isCordovaFilePluginAvailable()) return reject('cordova file plugin is not available');

        const filePath = `${cordova.file.applicationDirectory}${path}`;
        window.resolveLocalFileSystemURL(filePath, (fileEntry) => {
            fileEntry.file((file) => {
                const reader = new FileReader();
                reader.onloadend = function () {
                    resolve(this.result);
                };
                
                if (readAs === 'ArrayBuffer') reader.readAsArrayBuffer(file);
                else if (readAs === 'Text') reader.readAsText(file);
                else if (readAs === 'DataURL') reader.readAsDataURL(file)
                else reject(`invalid readAs type specified in cordovaReadFile: ${filePath}`);
            }, function (err) {
                console.error(`cordovaReadFile - error reading file ${filePath}`, err);
            });
        }, (err) => {
            console.error(`cordovaReadFile - error resolving file system url ${filePath}`, err);
        });
    });
}

/**
 * cordovaRequest is a proxy for jQuery.request
 * on mobile devices handling support for XHR, CORS and Cookies
 * 
 * a Promise is returned which calls either success/resolve or error/reject method
 * 
 * headers
 *  key: value
 */
function cordovaRequest(opts) {
    return new Promise((resolve, reject) => {
        let url = '';
        try {
            if (opts.url.startsWith('/')) {
                url = new URL(opts.url, AppCache.Url);
            } else if (opts.url.startsWith('public/')) {
                url = new URL(opts.url, location.origin);
            } else {
                url = new URL(opts.url);
            }
        } catch (err) {
            console.error('cordovaRequest', err);
        }
        
        const method = opts.type.toLowerCase();
        let data = {};
        let headers = {};
        let params = {};

        if (opts.headers && typeof headers === 'object') {
            headers = opts.headers;
        }

        const { contentType } = opts;
        if (contentType) {
            headers['Content-Type'] = contentType;

            if (contentType.includes('json')) {
                cordova.plugin.http.setDataSerializer('json');
            }

            if(contentType.includes('application/x-www-form-urlencoded')) {
                cordova.plugin.http.setDataSerializer('urlencoded');
            }
        }

        // we pass json as string into jQuery.request
        if (typeof opts.data !== 'undefined') {
            if (typeof opts.data === 'string') {
                data = JSON.parse(opts.data);
            } else if (typeof opts.data === 'object') {
                data = opts.data;
            }
        }

        // jQuery.request (success, error) functions we already pass as options
        const { success, error } = opts;

        for (const [key, value] of url.searchParams.entries()) {
            params[key] = value;
        }

        const options = {
            method,
            data: Object.keys(data).length > 0 ? data : {},
        };
        if (Object.keys(params).length > 0) options.params = params;
        if (Object.keys(headers).length > 0) options.headers = headers;

        // https://www.npmjs.com/package/cordova-plugin-advanced-http
        cordova.plugin.http.sendRequest(
            `${url.origin}${url.pathname}`, options, (res) => {
                let result;
                if (typeof res.data !== 'undefined') {
                    try {
                        result = JSON.parse(res.data);
                    } catch (e) {
                        // if JSON is not parsed correctly. e.g. in case of OK being returned from server after correct login
                        // we will just set result to res.data
                        result = res.data;
                    }
                }

                if (result.status && result.status === 'UpdatePassword') {
                    let newUrl = new URL(AppCache.Url + result.link);
                    newUrl.searchParams.append('reason', result.reason || 'other');
                    newUrl.searchParams.append('redirect', encodeURIComponent(location.href));
                    location.replace(newUrl.href.toString());
                }

                success && success(result, 'success', {
                    headers: res.headers,
                    getResponseHeader: function (key) {
                        return this.headers[key.toLowerCase()];
                    }
                });
                resolve(result);
            },
            (err) => {
                // this is not a an error, but when the plugin parses 'OK'
                // as response from p9 server from e.g. /user/logon/local
                // json parsing fails, so we end up here
                if (
                    err.error &&
                    err.error.includes('Unexpected identifier "OK"')
                ) {
                    success && success(err.error);
                    resolve(err.error);
                    return;
                }

                let result = {
                    status: err.status,
                };
                if (typeof err.data !== 'undefined') {
                    result.data = JSON.parse(err.data);
                }

                error && error(result, err.status);
                reject(result, err.status);
            },
        );
    });
}

function request(opts) {
    if (typeof opts.url === undefined) throw new Error('request: no url provided for the request');
    
    // handling requests on cordova
    if (
        isCordova() &&
        cordova.plugin &&
        cordova.plugin.http
    ) {
        if (typeof AppCache.clientRequestTimeout === 'number' && AppCache.clientRequestTimeout > 0) {
            cordova.plugin.http.setRequestTimeout(AppCache.clientRequestTimeout);
        }

        return cordovaRequest(opts);
    }

    return jQuery.ajax(Object.assign({}, opts));
}
window._request = request;

function jsonRequest(opts) {
    return request(
        Object.assign({}, {
            type: 'POST',
            contentType: 'application/json',
        }, opts)
    );
}
window._jsonRequest = jsonRequest;

function sapLoadLanguage(lang) {
    return jQuery.sap.loadResource(`sap/ui/core/cldr/${lang}.json`, {
        'async': true,
        dataType: 'json',
        failOnError: true,
    });
}

function sapStorageGet(k) {
    return jQuery.sap.storage(jQuery.sap.storage.Type.session).get(k);
}

function sapStoragePut(k, v) {
    return jQuery.sap.storage(jQuery.sap.storage.Type.session).put(k, v);
}