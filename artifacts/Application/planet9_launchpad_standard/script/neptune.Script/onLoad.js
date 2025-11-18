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

function isSecureKeyStorePluginAvailableOnCordova() {
    return isCordova() && typeof cordova.plugins !== 'undefined' && typeof cordova.plugins.SecureKeyStore !== 'undefined';
}

async function configureSsl() {
    if (!isCordova()) return;

    // don't modify existing clients < 23.10.11 which do not have possibility to configure ssl
    if (!AppCache.ssl) return;
    
    const ssl = AppCache.ssl;
    const http = cordova.plugin && cordova.plugin.http;

    if (!http) return;

    if (ssl.skipSslCertificateCheck) {
        return http.setServerTrustMode('nocheck', () =>
            appCacheLog('[SSL] Trust mode: nocheck')
        );
    }

    if (ssl.useCorporateCertificate) {
        return http.setServerTrustMode('pinned', () =>
            appCacheLog('[SSL] Trust mode: pinned (corporate cert)')
        );
    }

    if (ssl.allowSystemCertificates || ssl.allowUserCertificates) {
        // NOTE: only 'default' mode respects network_security_config.xml
        return http.setServerTrustMode('default', () =>
            appCacheLog('[SSL] Trust mode: default (system + user if XML configured)')
        );
    }

    return http.setServerTrustMode('default', () =>
        appCacheLog('[SSL] Trust mode: default (fallback)')
    );
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

    document.addEventListener('beforeunload', () => {
        if (isAutoLockTimerEnabled()) {
            AutoLockTimer.stop();
        }
    });

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
    if (isCordova() && cordova.plugins && cordova.plugins.certificates) {
        cordova.plugins.certificates.trustUnsecureCerts(true);

        if (cordova.plugin && cordova.plugin.http) {
            cordova.plugin.http.setServerTrustMode('nocheck', () => {
                console.log('Server trust mode set to nocheck');
            },
            (err) => {
                console.error('Failed to set server trust mode', err);
            });
        }
    }
    
    // adding it just below existing settings, cordova.plugins.certificates is also conditional
    configureSsl();

    // InAppBrowser 
    if (isCordova()) window.open = cordova.InAppBrowser.open;

    if (isCordova() && cordova.plugin && cordova.plugin.http) {
        let fnAjaxTransportProxy = function (options, originalOptions, jqXHR) {
            const { dataType, dataTypes, contentType } = options;
            if (
                (dataType === "*" || (Array.isArray(dataTypes) && dataTypes.join("") === "*")) &&
                contentType.includes('json')
            ) {
                options.dataTypes = ["text", "json"];
            }

            return {
                send: function (headers, completeCallback) {
                    if (isCordova() && cordova.plugin && cordova.plugin.http) {
                        cordovaRequest(options)
                            .then((result) => {
                                let text = '';
                                let json = {};

                                try {
                                    json = result;
                                    text = JSON.stringify(json);
                                } catch (e) {}
                                
                                completeCallback(200, "success", {
                                    json,
                                    text,
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
    refreshingAuth = false;
    AppCache.isOffline = true;
    AppCacheShellNetwork.setVisible(true);
    AppCache_butNewUser.setEnabled(false);
    AppCacheUserActionChangePassword.setVisible(false);

    setSettingsDialogScreenChangesUIState();

    if (AppCache.isMobile && AppCache.isRestricted) return;

    if (typeof sap.n.Phonegap.onOfflineCustom === 'function') {
        sap.n.Phonegap.onOfflineCustom();
        return;
    }
}

function afterOnOnline() {
    const { type: authType } = getAuthSettingsForUser();
    AppCacheUserActionChangePassword.setVisible(!AppCache.isOffline && authType === 'local' && !isChpassDisabled());

    if (!AppCache.isOffline) {
        refreshUserLogonOnOfflineToOnlineMode();
        setSettingsDialogScreenChangesUIState();
        fetchAppUpdates();

        if (AutoLockTimer.hasElapsed()) {
            AutoLockTimer.onTimeout();
        }
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

function onOnline() {
    if (isCordova()) {
        AppCache.isOffline = navigator.connection.type === Connection.NONE;
    } else if (isElectron()) {
        AppCache.isOffline = navigator.onLine;
    } else {
        AppCache.isOffline = false;
    }

    const { type: authType } = getAuthSettingsForUser();
    AppCacheUserActionChangePassword.setVisible(!AppCache.isOffline && authType === 'local' && !isChpassDisabled());

    // user might get logged out if pincode is enabled and they are logged in, but their server session has timed out
    if (AppCache.enablePasscode && !AutoLockTimer.hasElapsed()) {
        AutoLockTimer.reset();
        AppCache.updateUserLoginTime();
        genericAuthRelogin(authType, AppCache.userInfo.authDecrypted);
        setTimeout(afterOnOnline, 3000);
    } else {
        afterOnOnline();
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