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

function setAccessibilityFocusIndicator() {
    if (AppCache.config.showAccessibilityFocusIndicator === false) {
        addClass(document.body, ['wcag-hide-focus']);
        return;
    }

    addClass(document.body, ['wcag-focus']);
}

function setOpenUI5Version() {
    const version = sap.ui.version.split('.').slice(0, 2).join('-');
    addClass(document.body, [`ui5-${version}`]);
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
    if (!_pwadeferredPrompt) {
        appCacheError("beforeinstallprompt was not called or it did not set _pwadeferredPrompt correctly.");
        return;
    }

    _pwadeferredPrompt.prompt();
    _pwadeferredPrompt.userChoice
        .then(function(choiceResult) {
            const { outcome } = choiceResult;
            if (outcome === 'accepted') {
                diaPWAInstall.close();
                appCacheLog('User accepted the install prompt.');
            } else if (outcome === 'dismissed') {
                appCacheLog('User dismissed the install prompt.');
            }
        }).finally(() => {
            // The deferredPrompt can only be used once.
            _pwadeferredPrompt = null;
        })
}

function setLaunchpadIcons() {
    iconTypes.forEach((rel) => {
        let href = '';
        if (typeof AppCache.CustomLogo === 'string' && AppCache.CustomLogo.trim().length > 0) {
            href = AppCache.CustomLogo;
        } else {
            if (isP9VersionGreaterThanEqualTo(24)) {
                if (rel.includes('shortcut')) {
                    href = '/public/images/connect/favicon.svg';
                } else {
                    href = '/public/images/NeptuneIcon192px.png';
                }
            } else {
                if (rel.includes('shortcut')) {
                    href = '/public/images/favicon.png';
                } else {
                    href = '/public/images/NeptuneIcon192px.png';
                }
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
    if (AppCache.isOffline) {
        appCacheLog('Unable to fetchAppUpdates, user is offline');
        return
    }

    appCacheLog('FetchAppUpdates');
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

function getLoginPath() {
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
    let path = 'public/images/nsball.png';
    if (isP9VersionGreaterThanEqualTo(24)) {
        const svgImage = 'data:image/svg+xml;base64,PHN2ZyBpZD0ibmVwdHVuZS1jb25uZWN0LWxvZ28iIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgd2lkdGg9IjM2IiB2aWV3Qm94PSIwIDAgOTQwLjY5IDQ0MC41MiI+PHBhdGggc3R5bGU9ImZpbGw6IHJnYigyNTUsIDE1OCwgNTEpOyBzdHJva2Utd2lkdGg6IDBweDsiIGQ9Ik05NDAuNywyMjAuMjZsLTIzMy4wNC4xMi0xMTYuNDcsMjAxLjY2LTExMi43LTE5NS4xOWMtLjQ5LS45My0zLjgxLTYuMjgtMy44MS02LjI4LDAsMC0zLjMxLDUuMzMtMy43Nyw2LjIzLS4wMi4wMS0uMDIuMDItLjAzLjAzbC01OS4wNywxMDIuMjMtLjc3LDEuMzNjLTE5LjA0LDMyLjkxLTQ2LjM1LDYwLjQ1LTc5LjEsNzkuNzVzLTcwLjkyLDMwLjM4LTExMS42OCwzMC4zOEM5OC42Miw0NDAuNTIsMCwzNDEuOSwwLDIyMC4yNlM5OC42MiwwLDIyMC4yNiwwQzMwMS43OSwwLDM3Mi45OCw0NC4zLDQxMS4wNiwxMTAuMTR2LS4wMmw1OS44NCwxMDMuNTdoLjAxYy42MiwxLDMuNzksNi44NiwzLjc5LDYuODYsMCwwLDMuMDktNS43MSwzLjc0LTYuNzkuMDEtLjAxLjAxLS4wMi4wMi0uMDJsMTEyLjczLTE5NS4yN2gyMzNsMTE2LjUxLDIwMS43OVoiLz48L3N2Zz4=';
        AppCacheShellLogoDesktop.setSrc(svgImage).addStyleClass('nepConnectLogo sapUiTinyMarginEnd');
        AppCacheShellLogoMobile.setSrc(svgImage).addStyleClass('nepConnectLogo sapUiTinyMarginEnd');
        return;
    }

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
        AppCacheUserActionChangePassword.setVisible(false);
    }
}

function isExternalLogoutEnabled() {
    // defaults to true, as before we added it under configuration
    if (typeof AppCache.SystemConfig.logoutLaunchpadExternal === 'undefined') {
        return true;
    }

    return AppCache.SystemConfig.logoutLaunchpadExternal;
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

function isLogonTypesEmpty() {
    const { logonTypes } = modelDataSettings.getData();
    return !logonTypes;
}

function getLoginSettingsForLoginId(loginId) {
    const { logonTypes } = modelDataSettings.getData();
    if (Array.isArray(logonTypes)) {
        const loginSettings = logonTypes.find((loginType) => loginType.id === loginId);
        if (typeof loginSettings !== 'undefined') {
            return loginSettings;
        }
    }

    // defaults to local login
    return { type: 'local' };
}

function getAuthSettingsFromLoginType() {
    const loginId = AppCache_loginTypes.getSelectedKey();
    
    // when user arrives from cockpit login to launchpad, we might not have any logonSettings available.
    //  prioritize to using p9logonData from local storage if available, for backwards compatibility.
    if (isLogonTypesEmpty()) {
        const p9logonData = localStorage.getItem('p9logonData');
        if (typeof p9logonData === 'string') {
            try {
                const settings = JSON.parse(localStorage.getItem('p9logonData'));
                if (typeof settings === 'object' && Object.keys(settings).length > 0) return settings;
            } catch (err) {}
        }
    }

    const settings = getLoginSettingsForLoginId(loginId);
    if (settings) {
        return settings;
    }

    // default to local login
    return { type: 'local' };
}

function getAuthSettingsForUser() {
    // for backwards compatibility keeping logonData to store idp settings
    // if userInfo object is available and logonData is available on top of that object and is an object with defined type
    const userInfo = AppCache.userInfo;
    if (
        typeof userInfo === 'object' && 
        typeof userInfo.logonData === 'object' && 
        typeof userInfo.logonData.type === 'string' && 
        userInfo.logonData.type.length > 0
    ) {
        return userInfo.logonData;
    }

    return getAuthSettingsFromLoginType();
}

function addAriaLabel(ui5Elm, value) {
    ui5Elm.addCustomData(
        new sap.ui.core.CustomData({
            key: 'aria-label',
            value,
        })
    );
}

function userIsNotLoggedIn() {
    return (
        typeof AppCache.userInfo === 'undefined ' || 
        typeof AppCache.userInfo === 'string' || 
        Object.keys(AppCache.userInfo).length === 0
    );
}

function p9UserLogout(authenticationType = '') {
    if (isOffline()) {
        AppCache.clearCookies();
        return;
    }

    jsonRequest({
        url: `${AppCache.Url}/user/logout`,
        success: (data) => {
            AppCache.clearCookies();
            appCacheLog(`${authenticationType}: Successfully logged out`);

            if (!AppCache.isMobile) {
                const logoutUrl = AppCache.userInfo?.logonData?.logoutUrl
                if (logoutUrl) {
                    location.href = logoutUrl;
                    return;
                }

                location.hash = '';
                location.reload();
            }
        },
        error: (result, status) => {
            sap.ui.core.BusyIndicator.hide();
            AppCache.clearCookies();
            appCacheLog(`${authenticationType}: Successfully logged out, in offline mode`);
        }
    });
}

function externalAuthUserLogoutUsingPopup(url, closePopupAfterSecs=5000) {
    return new Promise((resolve, reject) => {
        const logoutPopup = window.open(url, '_blank', 'location=no,width=5,height=5,left=-1000,top=3000');
        
        // if pop-ups are blocked signout window.open will return null
        if (!logoutPopup) return resolve();
        
        logoutPopup.blur && logoutPopup.blur();

        if (isCordova()) {
            logoutPopup.addEventListener('loadstop', () => {
                logoutPopup.close();
                resolve();
            });
        } else {
            logoutPopup.onload = () => {
                logoutPopup.close();
                resolve();
            };

            logoutPopup.blur && logoutPopup.blur();

            setTimeout(() => {
                logoutPopup.close();
                resolve();
            }, closePopupAfterSecs);
        }
    });
}

function createScriptTag(src, attributes = {}) {
    const tag = document.createElement('script');
    tag.setAttribute('src', src);
    Object.entries(attributes).forEach(([k, v]) => {
        tag.setAttribute(k, v);
    });
    return tag;
}

function createPopupWindow(url, target='_blank', width=-1, height=-1) {
    if (isCordova()) {
        return window.open(url, target, 'location=no');
    }

    const winLeft = window.screenLeft ? window.screenLeft : window.screenX;
    const winTop = window.screenTop ? window.screenTop : window.screenY;
    const winWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const winHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

    // centering popup on the screen
    const left = ((winWidth/2) - (width/2)) + winLeft;
    const top = ((winHeight/2) - (height/2)) + winTop;

    return window.open(url, target, `location=no,width=${width},height=${height},left=${left},top=${top}`);
}

function watchPopupState(popupWin, finalState=[], logState=[], callbackFn) {
    let url = '';
    let intervalId = setInterval(() => {
        try {
            url = popupWin.location.href ?? '';
        } catch (err) {
            url = ''; // otherwise it would error out on accessing string functions

            if (err.name === 'SecurityError') {
                appCacheLog('we are unable to read location.href', popupWin, 'error', err);
            } else {
                appCacheLog('watchPopupState popupWin', popupWin, 'error', err);
            }
        }

        if (logState.some(param => url.includes(`${param}=`))) {
            appCacheLog(`watchPopupState logging url - ${url} because it matched one of the following parameters = ${logState.join(', ')} `)
        }

        if (popupWin.closed || url.includes('error=')) {
            clearInterval(intervalId);
        }

        if (finalState.some(param => url.includes(`${param}=`))) {
            appCacheLog(`watchPopupState final state reached - ${url}`);
            clearInterval(intervalId);
            popupWin.close();
            return callbackFn(url);
        }
    }, 100);
}

function parseJsonWebToken(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

function getHashParamsFromUrl(url) {
    if (typeof url !== 'string') return null;
    if (url.indexOf('?') > -1) url = url.split('?')[1];

    let params = url.replace(/^(#|\?)/, '');
    let hashParams = {};
    let e,
        a = /\+/g,
        r = /([^&;=]+)=?([^&;]*)/g,
        d = function (s) {
            return decodeURIComponent(s.replace(a, ' '));
        };
    while (e = r.exec(params)) {
        hashParams[d(e[1])] = d(e[2]);
    }
    return hashParams;
}

function saveView(viewName, data) {
    p9SaveView(viewName, data).then(()=> {
        appCacheLog(`Saved View: ${viewName}`)
    }).catch(() => {
        sapStoragePut(viewName, data);
    });
}

function sanitizeLanguageString(language) {
    return language.trim().trim("'").trim('"').trim();
}

function setLaunchpadLanguage(language = 'EN') {
    const data = {
        code: 'EN'
    };

    const code = sanitizeLanguageString(language);
    if (code && code.length > 0) {
        data.code = code;
    }

    setCacheAppCacheLanguage(data);
}

function getLaunchpadLanguage() {
    const saved = getCacheAppCacheLanguage();
    if (saved && saved.code) {
        return saved.code ?? 'EN';
    }

    // use language set for the user profile
    if (AppCache.userInfo.language) {
        setLaunchpadLanguage(AppCache.userInfo.language);
        return AppCache.userInfo.language;
    }

    return 'EN';
}

function getAppViewName(prefix, postfix) {
    return `app:${prefix}:${getLaunchpadLanguage()}:${postfix}`.toUpperCase();
}

function getWebAppViewName(prefix, postfix) {
    return `webapp:${prefix}:${postfix}`;
}

function replaceLanguageInAppViewName(viewName, newLanguage) {
    const parts = viewName.split(':')

    // only app: uses language as part of it's name, webapp: does not have the language in it's name
    if (parts[0].toLowerCase() !== 'app') {
        return viewName;
    }

    parts[parts.length-2] = newLanguage;
    return parts.join(':');
}

function isP9VersionGreaterThanEqualTo(version) {
    return parseInt(AppCache.p9Version.split('.')[0]) >= version;
}

function isP9VersionLessThan(version) {
    return parseInt(AppCache.p9Version.split('.')[0]) < version;
}

// support for inline translations without refresh is only available from 24-LTS onwards
function supportsInlineTranslations() {
    return parseInt(AppCache.p9Version.split('.')[0]) >= 24;
}

function fetchTranslations() {
    if (!supportsInlineTranslations()) return;
    if (AppCache.isOffline) return;
    jsonRequest({
        type: 'GET',
        url: `${AppCache.Url}/api/launchpad/${AppCache.launchpadID}/i18n`,
    }).then(data => {
        modelAppCacheTranslations.setData(data);
        setCacheAppCacheTranslations();
    });
}

function destroyTopAndSidebarOpenAppButtons() {
    openApps.getItems().forEach((item) => item.destroy());
    AppCacheShellOpenApps.getItems().forEach((item) => item.destroy());
}

function hasUserLoggedOut() {
    if (AppCache.isOffline || userIsNotLoggedIn()) {
        startHasUserLoggedOutTimer();
        return;
    }

    fetchUserInfo(
        () => {},
        ({ status }) => {
            if (status === 401 && !refreshingAuth) {
                diaSessionTimeout && diaSessionTimeout.open();
            }
        }
    );
    startHasUserLoggedOutTimer();
}

// return the number of seconds to check if the user has logged out
function calculateHasUserLoggedOutTimerInSecs() {
    const minTime = 300; // 5 minutes
    const maxTime = 3600; // 1 hour

    const data = modelDataSettings.getData();
    if (data && data.settings && data.settings.sessionTimeout) {
        // session timeout is in minutes, convert it to seconds
        const sessionTimeout = parseInt(data.settings.sessionTimeout) * 60;

        if (sessionTimeout <= minTime) return minTime;
        else if (sessionTimeout < maxTime) return sessionTimeout;
        else if (sessionTimeout >= maxTime) return maxTime;
    }

    return minTime;
}

function startHasUserLoggedOutTimer() {
    setTimeout(hasUserLoggedOut, calculateHasUserLoggedOutTimerInSecs() * 1000);
}

function isRunningInStandaloneMode() {
    return window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
}

let isInvalidLangSetWithQueryParamVisible = false;
function isLanguageSetInQueryParam() {
    // Language set in query string always takes precedence
    let langSearchParam = new URLSearchParams(location.search).get('lang') ?? false;
    if (!langSearchParam) {
        return {
            exists: false,
            language: getLaunchpadLanguage(),
        };
    }

    if (langSearchParam) {
        langSearchParam = langSearchParam.trim().toUpperCase();
    }

    if (!sap.n.Launchpad.isLanguageValid(langSearchParam)) {
        if (!isInvalidLangSetWithQueryParamVisible) {
            isInvalidLangSetWithQueryParamVisible = true;

            const supported = masterLanguages.filter(({ ISOCODE }) => AppCache.config.languages.includes(ISOCODE)).map(({ NAME }) => NAME).join(', ');
            sap.m.MessageBox.show(
                    `Language ${langSearchParam} is not supported. Only ${supported} is supported.`, {
                    icon: sap.m.MessageBox.Icon.ERROR,
                    title: "Unsupported Language",
                    actions: [sap.m.MessageBox.Action.OK],
                }
            );
            
            setTimeout(() => isInvalidLangSetWithQueryParamVisible = false, 10000);
        }
        
        return {
            exists: false,
            language: getLaunchpadLanguage(),
        };
    }
    
    return {
        exists: true,
        language: langSearchParam,
    };
}

function isMobileAppUpdateSupported() {
    return sap.ui.Device.os.windows || sap.ui.Device.os.android || sap.ui.Device.os.ios;
}

function getMobileAppUpdateUrlForOS(url) {
    if (sap.ui.Device.os.windows) {
        return url + 'Windows';
    } else if (sap.ui.Device.os.android) {
        return url + 'Android';
    } else if (sap.ui.Device.os.ios) {
        return 'itms-services://?action=download-manifest&url=' + encodeURIComponent(`${url}Ios.plist`);
    }

    return '';
}

function getSemanticObjectActionPathFromHashNavigation() {
    let hashPath = window.location.hash;
    if (hashPath.length > 0) hashPath = hashPath.substring(1);

    const navPath = hashPath.includes('-') ? hashPath.split('-') : [];
    return navPath.join('-').toLowerCase().trim();
}

function isSemanticObjectActionPathInHashNavigation() {
    const semanticPath = getSemanticObjectActionPathFromHashNavigation();
    if (semanticPath.length === 0) return false;

    // validate semantic object action path against tiles if they are available
    const tiles = modelAppCacheTiles.getData();
    if (tiles.length > 0) {
        const paths = tiles.map(({ navObject, navAction }) => {
            return navObject && navAction ? `${navObject}-${navAction}`.toLowerCase() : '';
        });
        return paths.includes(semanticPath);
    }

    // no tiles are present as of now, so assuming the semantic object path holds
    return true;
}

function openTileFromSemanticObjectActionPath(semanticPath) {
    if (semanticPath.length === 0) return;

    const tiles = modelAppCacheTiles.getData();
    if (!Array.isArray(tiles) || tiles.length === 0) return;

    // find tile to open, if the application is not already open or not already loaded
    // TODO check if app is already open, the activate it
    const filtered = tiles.filter(({ navObject, navAction }) => {
        return navObject && navAction && `${navObject}-${navAction}`.toLowerCase().trim() === semanticPath;
    });
    if (filtered.length === 0) return;

    const tile = filtered[0];

    function isTileInCategory(category) {
        return Array.isArray(category.tiles) && category.tiles.map(({ id }) => id).includes(tile.id);
    }

    const categories = modelAppCacheCategory.getData();
    if (Array.isArray(categories) && categories.length > 0) {
        const category = categories.find(isTileInCategory);
        if (typeof category !== 'undefined') {
            sap.n.Launchpad._HandleTilePress(tile, category);
            return;
        }
    }

    const categoryChilds = modelAppCacheCategoryChild.getData();
    if (Array.isArray(categoryChilds) && categoryChilds.length > 0) {
        const category = categoryChilds.find(isTileInCategory);
        if (typeof category !== 'undefined') {
            sap.n.Launchpad._HandleTilePress(tile, category);
            return;
        }
    }
}

function genericAuthRelogin(authType, auth) {
    switch (authType) {
        case 'saml':
            AppCacheLogonSaml.Relog(auth);
            break;
        case 'openid-connect':
            AppCacheLogonOIDC.Relog(auth);
            break;
        case 'azure-bearer':
            AppCacheLogonAzure.Relog(auth);
            break;
        case 'local':
            AppCacheLogonLocal.Relog(auth);
            break;
        case 'ldap':
            AppCacheLogonLdap.Relog(auth);
            break;
        case 'sap':
            AppCacheLogonSap.Relog(auth);
            break;
        default:
            return Promise.reject(new Error(`Unsupported auth type: ${auth.type}`, auth));
    }
}

function setSettingsDialogScreenChangesUIState() {
    const disabled = AppCache.isOffline || sap.n.Customization.isDisabled();
    
    msDisableScreenChanges.setVisible(disabled);
    chkAppCacheLockScreenChanges.setEnabled(!disabled);
    chkAppCacheDisableScreenChanges.setEnabled(!disabled);
    btnClearCustomizations.setEnabled(!disabled);
}

function ifSetLoadStartupAppOrWebApp() {
    if (AppCache.StartApp) {
        // We must load existing versions of the start app if we failed to fetch new ones
        AppCache.Load(AppCache.StartApp);
    } else if (AppCache.StartWebApp) {
        // Start WebApp
        AppCache.LoadWebApp(AppCache.StartWebApp);
    }
}

function waitForAuth() {
    if (!refreshingAuth) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        const check = () => {
            if (!refreshingAuth) {
                resolve();
            } else {
                setTimeout(check, 100);
            }
        };
        check();
    });
}

function persistAppCacheUsers() {
    if (modelAppCacheUsers.oData.length > 0) {
        modelAppCacheUsers.oData.forEach((user, idx) => {
            modelAppCacheUsers.setProperty(`/${idx}/authDecrypted`, null)
        });
    }

    setCacheAppCacheUsers();
}

function hideEmptyTileGroups(tiles, tilegroups) {
    if (!sap.n.Customization.isDisabled()) return false;

    if (tiles.length === 0 && tilegroups.length === 0) {
        return true;
    } else if (tiles.length === 0) {
        const groups = tilegroups.map(tg => {
            const category = sap.n.Customization.getCategory(tg.id);
            if (category) return category;

            const tilegroup = sap.n.Customization.getTileGroup(tg.id);
            if (tilegroup) return tilegroup;

            return false;
        }).filter(Boolean);

        if (groups.every(tg => tg.tiles.length === 0 && tg.tilegroups.length === 0)) {
            return true;
        }
    }

    return false;
}

function refreshUserLogonOnOfflineToOnlineMode() {
    const process = 'refresh';
    const user = AppCache.userInfo;

    if (user) {
        const { type } = getAuthSettingsForUser();
        const decrypted = user.authDecrypted;

        // if decryption fails we have nothing for relogin
        if (typeof decrypted === 'undefined') return;

        if (type === 'local') AppCacheLogonLocal.Relog(decrypted, process);
    }
}

function clearSAPCookies() {
    document.cookie.split(';').forEach((cookie) => {
        const name = cookie.split('=')[0].trim();
        if (name === 'MYSAPSSO2' || name.startsWith('SAP_SESSIONID') || name.startsWith('sap-')) {
            removeCookie(name);
        }
    });
}

function removeCookie(name) {
    const expires = 'expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    const domainParts = location.hostname.split('.');

    if (domainParts.length < 2) {
        document.cookie = `${name}=; ${expires};`;
        return;
    }

    for (let i = 0; i <= domainParts.length-2; i++) {
        const domain = domainParts.slice(i).join('.');
        document.cookie = `${name}=; ${expires}; domain=.${domain}`;
        document.cookie = `${name}=; ${expires};`;
    }
}

function setDeviceId() {
    AppCache.deviceID = localStorage.getItem('AppCacheID');

    if (!AppCache.deviceID) {
        AppCache.deviceID = ModelData.genID();
        localStorage.setItem('AppCacheID', AppCache.deviceID);
    }
}

function persistExistingDeviceId() {
    localStorage.setItem('AppCacheID', AppCache.deviceID);
}