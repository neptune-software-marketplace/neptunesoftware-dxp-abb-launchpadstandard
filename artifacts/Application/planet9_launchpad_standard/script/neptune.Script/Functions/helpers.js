let globalTabIndex = -1;

function isTouchScreen() {
    return sap.ui.Device.support.touch;
}

function isWidthGTE(width = 1000) {
    return window.innerWidth >= width;
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
    document.getElementById('textDiv').innerHTML = html;
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
    const s = document.createElement('style');
    s.appendChild(document.createTextNode(cssText))
    return s;
}

function appendStyle(targetEl, style) {
    if (!targetEl) return;
    targetEl.appendChild(style);
}

function isRTL() {
    return querySelector('html').getAttribute('dir').toLowerCase() === 'rtl';
}

function addCustomData(sapELm, list) {
    for (const [key, value] of Object.entries(list)) {
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

const iconTypes = ['shortcut icon', 'icon', 'apple-touch-icon'];
function setiOSPWAIcons() {
    if (!sap.ui.Device.os.ios) {
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

function setSelectedLoginType(type) {
    localStorage.setItem('selectedLoginType', type);
    AppCacheUserActionPassword.setVisible(type === 'local');
}

function clearSelectedLoginType() {
    localStorage.removeItem('selectedLoginType');
}

function emptyBase64Image() {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgDTD2qgAAAAASUVORK5CYII=';
}

const _lazyLoadImagesList = [];
let downloadingImage = false;
function lazyLoadImage(src, target, type) {
    _lazyLoadImagesList.push({ src, target, type });
    downloadLazyLoadImages();
}

if (document.readyState === 'complete') {
    downloadLazyLoadImages();
} else {
    window.addEventListener('load', () => {
        downloadLazyLoadImages();
    });
}

function downloadLazyLoadImages() {
    if (document.readyState !== 'complete' || downloadingImage || _lazyLoadImagesList.length === 0) {
        return;
    }

    downloadingImage = true;

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
        downloadLazyLoadImages();
        return;
    }

    fetch(src).then(res => {
        if (!res.ok) return;
        return res.blob();
    }).then(res => {
        setImageSrc(URL.createObjectURL(res), target, type);
        downloadingImage = false;
        downloadLazyLoadImages();
    }).catch(() => {
        downloadingImage = false;
        downloadLazyLoadImages();
    });
}

function setPWAInstallQueryStatus() {
    diaPWAInstall.close();
    modeldiaPWAInstall.setData({ visible: false });
    setCachediaPWAInstall();
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
