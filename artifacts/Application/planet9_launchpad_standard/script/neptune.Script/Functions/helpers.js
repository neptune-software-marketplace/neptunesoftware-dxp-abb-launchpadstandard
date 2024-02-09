let globalTabIndex = -1;

function isTouchScreen() {
    return sap.ui.Device.support.touch;
}

function isWidthGTE(width = 1000) {
    return window.innerWidth >= width;
}

function endsWith(str, list) {
    return list.some((value) => str.endsWith(value));
}

function includes(str, list) {
    return list.some((value) => str.includes(value));
}

function nepPrefix() {
    return `__nep`;
}

function hasNepPrefix(className) {
    return className.startsWith(nepPrefix());
}

function nepId() {
    return `${nepPrefix()}${ModelData.genID()}`;
}

function includesJSView(id) {
    return id.includes('__jsview');
}

function sectionPrefix() {
    return '__nepsection';
}

function isSection(id) {
    return id.includes(sectionPrefix());
}

function closeContentNavigator() {
    launchpadContentNavigator.setWidth('0px');
}

// AppCache Logging
function appCacheLog(...args) {
    if (AppCache.enableLogging) console.log(...args);
}

function appCacheError(args) {
    if (AppCache.enableLogging) console.error(args);
}

function getFieldBindingText(field) {
    const k = field.name;
    return field.valueType ? `{${k}_value}` : `{${k}}`;
}

function setTextAndOpenDialogText(title, html) {
    AppCacheText.setTitle(title);
    
    const textDiv = document.getElementById('textDiv');
    if (textDiv) textDiv.innerHTML = html;

    diaText.open();
}

// DOM
function elById(id) {
    return document.getElementById(id);
}

function querySelector(path) {
    return document.querySelector(path);
}

function applyCSSToElmId(id, props) {
    const el = elById(id);
    if (!el) return;

    Object.entries(props).forEach(function ([k, v]) {
        el.style[k] = v;
    });
}

function insertBeforeElm(el, newEl) {
    if (!el || !newEl) return;
    
    const parent = el.parentNode;
    parent.insertBefore(newEl, el);
}

function addClass(el, list) {
    if (!el) return;

    list.forEach(function (name) {
        el.classList.add(name);
    });
}

function removeClass(el, list) {
    if (!el) return;

    list.forEach(function (name) {
        el.classList.remove(name);
    });
}

function getStyle(el, name) { return el.style[name]; }
function setStyle(el, name, value) { el.style[name] = value; }

function getWidth(el) { return el ? el.offsetWidth : 0; }
function getHeight(el) { return el ? el.offsetHeight : 0; }

function setWidth(el, width) { return el && (el.style.width = `${width}px`); }
function setHeight(el, height) { return el && (el.style.height = `${height}px`); }

function hideChildren(elPath) {
    const el = document.querySelector(elPath);
    if (!el) return;

    [].slice.call(el.children).forEach(function (child) {
        child.style.display = 'none';
    });
}

function appendStylesheetToHead(href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = href;
    document.head.appendChild(link);
}

function appendIFrame(targetEl, params) {
    const iframe = document.createElement('iframe');
    Object.entries(params).forEach(function ([k, v]) {
        iframe.setAttribute(k, v);
    });
    targetEl.appendChild(iframe);
}

function createStyle(cssText) {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(cssText))
    return style;
}

function appendStyle(targetEl, style) {
    if (!targetEl) return;
    targetEl.appendChild(style);
}

function isRTL() {
    return querySelector('html').getAttribute('dir').toLowerCase() === 'rtl';
}

function addCustomData(sapELm, keyValueObjectList) {
    for (const [key, value] of Object.entries(keyValueObjectList)) {
        sapELm.addCustomData(
            new sap.ui.core.CustomData(undefined, {
                key, value, writeToDom: true,
            })
        );
    }
}

function getActivePageCategoryId() {
    return AppCacheNav.getCurrentPage().getDomRef().dataset.categoryId;
}

// Launchpad issues

function isLaunchpadNotFound(status) {
    return status !== undefined && typeof status === 'string' && status.toLowerCase().includes('unable to find the launchpad');
}

function showLaunchpadNotFoundError(status) {
    sap.m.MessageBox.show(status, {
        title: 'Launchpad Error',
        onClose: function (oAction) {
            if (AppCache.isMobile) {
                if (AppCache.enablePasscode) {
                    AppCache.Lock();
                } else {
                    AppCache.Logout();
                }
            }
        }
    });
}

function isAppleDevice() {
    // ios=iPhone, macintosh=iPad
    return sap.ui.Device.os.ios || sap.ui.Device.os.macintosh;
}

function isPWAEnabled() {
    return AppCache.enablePwa;
}

const iconTypes = ['shortcut icon', 'icon', 'apple-touch-icon'];
function setiOSPWAIcons() {
    if (!isAppleDevice()) {
        return;
    }
    
    jsonRequest({
        type: 'GET',
        url: `${AppCache.Url}/public/launchpad/${AppCache.launchpadID}/pwa.json`,
    }).then((data) => {
        if (!data.icons.length) {
            return;
        }

        function setIcon(rel, href) {
            if (!href) return;
            document.querySelector(`link[rel='${rel}'`).setAttribute('href', href);
        }
        
        const { src } = data.icons[0];
        iconTypes.forEach((rel) => {
            setIcon(rel, src)
        });
    });
}

// launchpad path is always like e.g. /launchpad/path-name
//      path is not like /launchpad/path-name[/something/here]
//      otherwise server throws a 404
function launchpadUrl() {
    return `${location.origin}${location.pathname}`;
}

async function isUrlInCache({ url, cacheName }) {
    const cache = await caches.open(cacheName);
    return await cache.match(url)
}

async function addUrlToCache({ url, method, cacheName }) {
    const response = await fetch(url, { method });
    if (response.ok) {
        const cache = await caches.open(cacheName);
        cache.put(url, response);
        appCacheLog(`added to cache ${cacheName}`, url);
    }
}

// If app is not offline, we can remove the launchpad main page from workbox cache
//  otherwise even after logout we will see the launchpad screen
function removeLaunchpadFromCache() {
    const url = `${location.origin}${location.pathname}`;
    if (!AppCache.isOffline) {
        let cacheName = '';
        if (new RegExp('/public/launchpad/').test(url)) cacheName = 'p9pwa-public';
        else if (new RegExp('/launchpad/').test(url)) cacheName = 'p9pwa-launchpad';

        if (cacheName.length > 0) {
            caches.open(cacheName).then(c => c.delete(url));
        }
    }
}

function determineCacheNameFromUrl(url) {
    if (new RegExp('/public/launchpad/').test(url)) return 'p9pwa-public';
    if (new RegExp('/launchpad/').test(url)) return 'p9pwa-launchpad';

    const publicRe = [
        new RegExp('/public/application/'),
        new RegExp('/public/neptune/'),
        new RegExp('/public/fontawesome/'),
        new RegExp('/public/highsuite/'),
        new RegExp('/public/css/')
    ];
    if (publicRe.some(re => re.test(url))) {
        return 'p9pwa-public';
    }

    if (new RegExp('https://openui5.hana.ondemand.com/').test(url)) return 'p9pwa-ui5-cdn';
    if (new RegExp('https://sapui5.hana.ondemand.com/').test(url)) return 'p9pwa-ui5-cdn';
    
    if (new RegExp('/public/openui5/').test(url)) return 'p9pwa-ui5';

    const mediaRe = [
        new RegExp('/public/images/'),
        new RegExp('/public/icons/'),
        new RegExp('/media/'),
        new RegExp('\.(png|jpg|jpeg|svg|gif|webp)$')
    ];
    if (mediaRe.some(re => re.test(url))) {
        return 'p9pwa-images';
    }

    if (new RegExp('/public/').test(url)) {
        return 'p9pwa-public';
    }

    // default
    return 'p9pwa-public';
}

// On first install PWA does not cache the launchpad
// since the install event occurs after the page has been loaded
// e.g. random login images or other requests which might be part 
const _pwaResources = {};
function setCachablePwaResources() {
    _pwaResources[launchpadUrl()] = { url: launchpadUrl(), method: 'GET', cacheName: determineCacheNameFromUrl(launchpadUrl()) };

    if (window && window.performance && window.performance.getEntriesByType) {
        const resources = window.performance.getEntriesByType("resource").map(r => r.name);
        const allowedExts = [
            'js', 'json',   // scripts, data
            'properties',   // translations
            'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp', // images
            'woff', 'woff2', // fonts
            'css', // stylesheets
        ];
        resources
            .filter(url => endsWith(url, allowedExts))
            .forEach(url => (_pwaResources[url] = { url, method: 'GET', cacheName: determineCacheNameFromUrl(url) }));

        const allowedApi = [
            '/user/logon/types',
        ];
        resources
            .filter(url => endsWith(url, allowedApi))
            .forEach(url => (_pwaResources[url] = { url, method: 'GET', cacheName: determineCacheNameFromUrl(url) }));
    }
}

function ensurePWACache() {
    if (!isPWAEnabled()) return;

    appCacheLog('ensure these pwa resources are available in cache', Object.keys(_pwaResources));

    Object.values(_pwaResources).forEach(async ({ url, method, cacheName }) => {
        if (await isUrlInCache({ url, cacheName })) {
            appCacheLog(url, 'already exists in cache');
        } else {
            addUrlToCache({ url, method, cacheName });
        }
    });
}

function setSelectedLoginType(type) {
    localStorage.setItem('selectedLoginType', type);
    AppCacheUserActionPassword.setVisible(!isChpassDisabled() && type === 'local');
}

function clearSelectedLoginType() {
    localStorage.removeItem('selectedLoginType');
}

function emptyBase64Image() {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgDTD2qgAAAAASUVORK5CYII=';
}

const _lazyLoadImagesList = [];
let lazyLoadImagesInProgress = false;
function lazyLoadImage(src, target, type) {
    _lazyLoadImagesList.push({ src, target, type });
    if (!lazyLoadImagesInProgress) downloadLazyLoadImages();
}

function downloadLazyLoadImages() {
    if (lazyLoadImagesInProgress || _lazyLoadImagesList.length === 0) {
        return;
    }

    lazyLoadImagesInProgress = true;

    function setImageSrc(src, target, type) {
        if (type === 'element' && target instanceof HTMLImageElement) {
            target.setAttribute('src', src);
        } else if (type === 'sap-component') {
            target.setSrc(src);
        } else if (type === 'style') {
            appendStyle(
                elById('NeptuneStyleDivDynamic'),
                createStyle(`
                    ${target} {
                        background-image: url(${src});
                    }
                `)
            );
        }
    }

    const { src, target, type } = _lazyLoadImagesList.shift();
    if (src.startsWith('data:')) {
        setImageSrc(src, target, type);
        lazyLoadImagesInProgress = false;
        downloadLazyLoadImages();
        return;
    }

    // set blob url's directly, otherwise domains have be explicitly
    //  added to Azure Blob Storage to prevent CORS errors on fetch
    if (src.includes('blob.core.windows.net')) {
        setImageSrc(src, target, type);
        return;
    }

    fetch(src).then(res => {
        if (!res.ok) return;
        return res.blob();
    }).then(res => {
        setImageSrc(URL.createObjectURL(res), target, type);
        lazyLoadImagesInProgress = false;
        downloadLazyLoadImages();
    }).catch(() => {
        lazyLoadImagesInProgress = false;
        downloadLazyLoadImages();
    });
}

function setPWAInstallQueryStatus() {
    diaPWAInstall.close();
    modeldiaPWAInstall.setData({ visible: false });
    setCachediaPWAInstall();
}

function showCookieDialog() {
    if (AppCache.config && AppCache.config.cookieDialogEnabled) {
        const data = modeldiaCookie.getData();
        if (typeof data === 'undefined' || Object.keys(data).length === 0 || data.visible) {
            const title = AppCache.config.cookieDialogTitle;
            const message = AppCache.config.cookieDialogMessage;

            if (!title && !message) {
                return;
            }

            diaCookieHeaderTitle.setText(title);
            diaCookieContent.setText(message);
            diaCookie.open();
        }
    }
}

function setCookieConfirmationQueryStatus() {
    diaCookie.close();
    modeldiaCookie.setData({ visible: false });
    setCachediaCookie();
}

function promptForPWAInstall() {
    _pwadeferredPrompt.prompt();
    _pwadeferredPrompt.userChoice
    .then(function(choiceResult) {
        if (choiceResult.outcome === 'accepted') {
            diaPWAInstall.close();
        }
        _pwadeferredPrompt = null;        
    });
}

function setLaunchpadIcons() {
    iconTypes.forEach((rel) => {
        let href = '';
        if (typeof AppCache.CustomLogo === 'string' && AppCache.CustomLogo.trim().length > 0) {
            href = AppCache.CustomLogo;
        } else {
            if (rel.includes('shortcut')) {
                href = '/public/images/favicon.png';
            } else {
                href = '/public/images/NeptuneIcon192px.png';
            }
        }

        const link = document.createElement('link');
        link.href = href;
        link.rel = rel;

        if (rel.includes('shortcut')) {
            link.type = 'image/x-icon';
        }

        document.head.appendChild(link);
    });
}

function fetchUserInfo(success, error){
    return sap.n.Planet9.function({
        id: dataSet,
        method: 'GetUserInfo',
        success,
        error,
    });
}

function downloadApp(tile) {
    // Application
    if (tile.actionApplication) {
        AppCache.Load(tile.actionApplication, {
            load: 'download',
            appPath: tile.urlApplication ?? '',
            appType: tile.urlType ?? '',
            appAuth: tile.urlAuth ?? '',
            sapICFNode: tile.sapICFNode,
        });
    }

    // Application in Tile
    if (tile.type === 'application' && tile.tileApplication) {
        AppCache.Load(tile.tileApplication, {
            load: 'download',
        });
    }
}

function fetchAppUpdates() {
    appCacheLog(`FetchAppUpdates`);
    Array.isArray(modelAppCacheTiles.oData) && modelAppCacheTiles.oData.forEach(function (tile) {
        downloadApp(tile);
    });
}

// in certain cases for backwards compatibility, some functions don't return promises as expected
// e.g. in 22.10.6 UpdateGetData return undefined from p9-library but we expect a promise
// for such cases we need to create a fakePromise to take the result and monitor a change in value or timeout
// defaultReturnValue in-case of promise timeout
// by default each timeout is awaited for 1 sec
function fakePromise(returnValue, model, fnExpectedValue, defaultReturnValue, timeout = 1000) {
    // returned value is already a promise, we can await for it in code
    if (returnValue instanceof Promise) {
        return returnValue;
    }

    // check every 10ms if value resolves
    function checkIfPromiseIsResolved(resolve) {
        if (fnExpectedValue(model)) return resolve(model.getData());
        setTimeout(() => checkIfPromiseIsResolved(resolve), 10);
    }

    // check returnValue
    return Promise.race([
        new Promise((resolve) => setTimeout(() => resolve(defaultReturnValue), timeout)),
        new Promise((resolve) => checkIfPromiseIsResolved(resolve))
    ]);
}

function getLoginData() {
    return `${AppCache?.CurrentConfig || location?.pathname || '/'}`;
}

function generateUrlForImgInArrayBuffer(fileName, buffer) {
    const fileExt = fileName.substring(fileName.lastIndexOf('.') + 1);
    const blob = new Blob([buffer], { type: `image/${fileExt}`})
    return URL.createObjectURL(blob);
}

function setCustomLogo() {
    if (isCordova() || location.protocol === 'file:') {
        cordovaReadFile('www/public/customlogo', 'ArrayBuffer').then((result) => {
            const src = generateUrlForImgInArrayBuffer(AppCache.CustomLogo, result);
            AppCacheShellLogoDesktop.setSrc(src);
            AppCacheShellLogoMobile.setSrc(src);
        });
        return;
    }

    AppCacheShellLogoDesktop.setSrc(AppCache.CustomLogo);
    AppCacheShellLogoMobile.setSrc(AppCache.CustomLogo);
}

function setPWACustomLogo() {
    if (isCordova() || location.protocol === 'file:') {
        cordovaReadFile('www/public/customlogo', 'ArrayBuffer').then((result) => {
            const src = generateUrlForImgInArrayBuffer(AppCache.CustomLogo, result);
            pwaInstallAppLogo.setSrc(src);
        });
        return;
    }
    
    pwaInstallAppLogo.setSrc(AppCache.CustomLogo);
}

function setDefaultLogo() {
    const path = 'public/images/nsball.png';
    if (isCordova() || location.protocol === 'file:') {
        AppCacheShellLogoDesktop.setSrc(path);
        AppCacheShellLogoMobile.setSrc(path);
        return;
    }

    AppCacheShellLogoDesktop.setSrc(`/${path}`);
    AppCacheShellLogoMobile.setSrc(`/${path}`);
}

function isChpassDisabled() {
    return AppCache.SystemConfig.disableLaunchpadChpass;
}

function disableChpass() {
    if (isChpassDisabled()) {
        AppCacheUserActionPassword.setVisible(false);
    }
}

function getOpenUI5BootstrapPath() {
    const src = document.getElementById('sap-ui-bootstrap').getAttribute('src');
    if (src.includes('openui5.hana.ondemand.com') || src.includes('sapui5.hana.ondemand.com')) {
        return {
            src,
            isCDN: true,
        }
    }
    
    return {
        src,
        isCDN: false,
    };
}

function getResourceBundlePath(ui5Lib) {
    const ui5Version = AppCache.coreLanguageHandler.getUI5version();
    const ui5LibConv = ui5Lib.replace(/[.]/g, '/');
    const { isCDN, src } = getOpenUI5BootstrapPath();

    if (isCordova() || location.protocol === 'file:') {
        return `public/openui5/${ui5Version}/${ui5LibConv}/messagebundle.properties`
    } else if (isCDN) {
        const resourcePath = src.substring(0, src.lastIndexOf('/'));
        return `${resourcePath}/${ui5LibConv}/messagebundle.properties`
    }
    
    return `/public/openui5/${ui5Version}/${ui5LibConv}/messagebundle.properties`;
}

function getLoginSettings() {
    // On mobile login types are store in model DataSettings
    //  we don't have p9logonData available inside local storage on mobile
    if (AppCache.isMobile) {
        const loginId = AppCache_loginTypes.getSelectedKey();
        const { logonTypes } = modelDataSettings.oData;
        if (Array.isArray(logonTypes)) {
            const loginSettings = logonTypes.find((loginType) => loginType.id === loginId);
            if (typeof loginSettings !== 'undefined') {
                return loginSettings;
            }
        }
    }

    try {
        const data = localStorage.getItem('p9logonData')
        return JSON.parse(data);
    } catch (err) {}

    if (AppCache.userInfo && AppCache.userInfo.logonData) {
        return AppCache.userInfo.logonData;
    }

    return null;
}

function addAriaLabel(ui5Elm, value) {
    ui5Elm.addCustomData(
        new sap.ui.core.CustomData({
            key: 'aria-label',
            value,
        })
    );
}
