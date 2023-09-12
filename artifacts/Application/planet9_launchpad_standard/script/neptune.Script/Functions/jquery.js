jQuery.sap.require('sap.m.MessageBox');
jQuery.sap.require('jquery.sap.storage');

// common jQuery funcs
function serializeDataForQueryString(data) {
    return jQuery.param(data);
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
        const url = opts.url[0] === '/' ? new URL(opts.url, AppCache.Url) : new URL(opts.url);
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

        // https://www.npmjs.com/package/cordova-plugin-advanced-http
        cordova.plugin.http.sendRequest(
            `${url.origin}${url.pathname}`,
            {
                params,
                method,
                data,
                headers,
            },
            (res) => {
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

                success && success(result, 'success', {
                    headers: res.headers,
                    getResponseHeader: function (key) {
                        return this.headers[key.toLowerCase()];
                    }});
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
    ) return cordovaRequest(opts);

    return jQuery.ajax(Object.assign({}, opts));
}

function jsonRequest(opts) {
    return request(
        Object.assign({}, {
            type: 'POST',
            contentType: 'application/json',
        }, opts)
    );
}

function sapLoadLanguage(lang) {
    return jQuery.sap.loadResource(`sap/ui/core/cldr/${lang}.json`, {
        'async': true,
        dataType: 'json',
        failOnError: true,
    });
}

function sapStorageGet(k) {
    return jQuery.sap.storage(jQuery.sap.storage.Type.local).get(k);
}

function sapStoragePut(k, v) {
    return jQuery.sap.storage(jQuery.sap.storage.Type.local).put(k, v);
}