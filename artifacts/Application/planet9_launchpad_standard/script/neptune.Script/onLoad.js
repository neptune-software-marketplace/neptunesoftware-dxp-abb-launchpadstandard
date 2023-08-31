// Neptune Namespace
sap.n = {
    Shell: {},
    Launchpad: {},
    Phonegap: {
        loaded: false
    },
    Fingerprint: {},
    Documentation: {},
    Push: {},
    PDF: {},
    Apps: {},
    Enhancement: {}
};

if (typeof nep === 'undefined') nep = {};

function isCordova() {
    return window.hasOwnProperty('cordova') || typeof (cordova) === 'object';
}

// Browser/Phonegap Startup
if (isCordova()) {
    document.addEventListener('deviceready', onDeviceReady, false);
} else {
    onDeviceReady();
}

// onDeviceReady
function onDeviceReady() {
    sap.n.Phonegap.loaded = true;
    // Catch error on Windows 10
    if (typeof MSApp !== 'undefined') {
        window.onerror = function (message, file, line, col, error) {
            console.error(message);
            return true;
        };

        alert = navigator.notification.alert;

        // Hide Backbutton on App
        setTimeout(function () {
            let currentView = Windows.UI.Core.SystemNavigationManager.getForCurrentView();
            currentView.appViewBackButtonVisibility = Windows.UI.Core.AppViewBackButtonVisibility.collapsed;
        }, 200);
    }

    document.addEventListener('pause', onPause, false);
    document.addEventListener('resume', onResume, false);
    document.addEventListener('backbutton', onBackButton, false);

    if (navigator.app) {
        try {
            navigator.app.overrideButton('menubutton', true);
        } catch (error) {

        }
    }

    document.addEventListener('menubutton', onMenuButton, false);

    if (isCordova()) {
        document.addEventListener('online', onOnline, false);
        document.addEventListener('offline', onOffline, false);
    } else {
        window.addEventListener('online', onOnline, false);
        window.addEventListener('offline', onOffline, false);
    }

    document.addEventListener('searchbutton', onSearchButton, false);
    document.addEventListener('volumedownbutton', onVolumeDownButton, false);
    document.addEventListener('volumeupbutton', onVolumeUpButton, false);

    // Android (API>19) supports VIBRATION natively - fallback for existing apps
    if (sap.ui.Device.os.android) {
        if (typeof navigator.notification === 'object' && typeof navigator.notification.vibrate === 'undefined') {
            navigator.notification.vibrate = function (mSecs) {
                navigator.vibrate(mSecs);
            }
        }
    }

    // Android SSL 
    if (isCordova() && cordova.plugins && cordova.plugins.certificates) cordova.plugins.certificates.trustUnsecureCerts(true);

    // InAppBrowser 
    if (isCordova()) window.open = cordova.InAppBrowser.open;

    if (isCordova() && sap.ui.Device.os.name !== "iOS") {
        let fnAjaxTransportProxy = function (options, originalOptions, jqXHR) {
            return {
                send: function (headers, completeCallback) {
                    if (isCordova() && cordova.plugin && cordova.plugin.http) {
                        cordovaRequest(options)
                            .then((result) => {
                                completeCallback(200, "success", {
                                    json: result,
                                });
                            })
                            .catch((err, status) => {
                                completeCallback(status, "error", {
                                    "*": err,
                                });
                            });
                        return;
                    }

                    return jQuery.ajax(Object.assign({}, options));
                },
                abort: function () {
                    console.log("abort", options);
                },
            };
        };

        jQuery.ajaxTransport("+*", fnAjaxTransportProxy);
    }
}

function isOffline() {
    if (isCordova()) {
        return navigator.connection.type === Connection.NONE;
    }

    return !window.navigator.onLine;
}

function onOffline() {
    AppCache.isOffline = true;
    AppCacheShellNetwork.setVisible(true);
    AppCache_butNewUser.setEnabled(false);

    if (AppCache.isMobile && AppCache.isRestricted) return;

    sap.n.Launchpad.RebuildTiles();

    if (typeof sap.n.Phonegap.onOfflineCustom === 'function') {
        sap.n.Phonegap.onOfflineCustom();
        return;
    }
}

function onOnline() {
    if (isCordova()) {
        AppCache.isOffline = navigator.connection.type === Connection.NONE;
    } else {
        AppCache.isOffline = false;
    }

    if (!AppCache.isOffline) {
        fetchAppUpdates();
    }
    
    AppCacheShellNetwork.setVisible(false);
    AppCache_butNewUser.setEnabled(true);

    if (AppCache.isMobile && AppCache.isRestricted) return;

    sap.n.Launchpad.RebuildTiles();

    if (typeof sap.n.Phonegap.onOnlineCustom === 'function') {
        sap.n.Phonegap.onOnlineCustom();
        return;
    }
}

window.onOffline = onOffline;
window.onOnline = onOnline;

function onPause() {
    AppCache.inBackground = true;

    if (typeof sap.n.Phonegap.onPauseCustom === 'function') {
        sap.n.Phonegap.onPauseCustom();
        return;
    }
}

function onResume() {
    setTimeout(function () {
        AppCache.inBackground = false;
        AppCache.isOffline = isOffline();

        if (typeof navigator.splashscreen !== 'undefined') navigator.splashscreen.hide();
        sap.ui.core.BusyIndicator.hide();

        if (typeof sap.n.Phonegap.onResumeCustom === 'function') {
            sap.n.Phonegap.onResumeCustom();
            return;
        }
    }, 100);
}

function onBackButton() {

    if (typeof sap.n.Phonegap.onBackButtonCustom === 'function') {
        sap.n.Phonegap.onBackButtonCustom();
        return;
    }

    if (AppCache.CurrentApp === AppCache.StartApp && AppCache.enablePasscode === true) {
        AppCache.Lock();
    }

}

function onMenuButton() {

    if (typeof sap.n.Phonegap.onMenuButtonCustom === 'function') {
        sap.n.Phonegap.onMenuButtonCustom();
        return;
    }

}

function onSearchButton() {

    if (typeof sap.n.Phonegap.onSearchButtonCustom === 'function') {
        sap.n.Phonegap.onSearchButtonCustom();
        return;
    }

}

function onVolumeDownButton() {

    if (typeof sap.n.Phonegap.onVolumeDownButtonCustom === 'function') {
        sap.n.Phonegap.onVolumeDownButtonCustom();
        return;
    }

}

function onVolumeUpButton() {

    if (typeof sap.n.Phonegap.onVolumeUpButtonCustom === 'function') {
        sap.n.Phonegap.onVolumeUpButtonCustom();
        return;
    }

}