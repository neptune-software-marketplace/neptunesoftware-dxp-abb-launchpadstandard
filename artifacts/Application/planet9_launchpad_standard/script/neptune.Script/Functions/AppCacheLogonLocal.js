let AppCacheLogonLocal = {
    autoLoginKey: '_p9_log',

    Logon: function () {
        sap.ui.core.BusyIndicator.show();

        let rec = {
            username: AppCache_inUsername.getValue().toLowerCase(),
            password: AppCache_inPassword.getValue(),
            loginid: AppCache_loginTypes.getSelectedKey()
        };

        AppCache.Auth = Base64.encode(JSON.stringify(rec));

        refreshingAuth = true;
        jsonRequest({
            url: AppCache.Url + '/user/logon/local' + AppCache._getLoginQuery(),
            data: JSON.stringify(rec),
            headers: {
                'login-path': getLoginPath(),
            },
            success: function (data) {
                refreshingAuth = false;
                AppCache.clearLoadQueueAfterAuthRefresh();

                if (data.status && data.status === 'UpdatePassword' && !isCordova()) {
                    const url = new URL(data.link, location.href);
                    url.searchParams.append('reason', data.reason || 'other');
                    url.searchParams.append('redirect', encodeURIComponent(location.href));
                    location.replace(url.toString());
                } else {
                    AppCache.getUserInfo();
                    AppCacheLogonLocal.AutoLoginSet();
                }
            },
            error: function (result, status) {
                if (result.status === 401) sap.m.MessageToast.show(AppCache_tWrongUserNamePass.getText());
                if (result.status === 0) sap.m.MessageToast.show(AppCache_tNoConnection.getText());
                AppCacheLogonLocal.AutoLoginRemove();
                sap.ui.core.BusyIndicator.hide();
            }
        });
    },

    AutoLoginSet: function () {
        if (AppCache_inRememberMe.getSelected()) {
            if (isSecureKeyStorePluginAvailableOnCordova()) {
                cordova.plugins.SecureKeyStore.set(
                    function (res) { },
                    function (error) {
                        localStorage.setItem(AppCacheLogonLocal.autoLoginKey, AppCache.Auth);
                    }, AppCacheLogonLocal.autoLoginKey, AppCache.Auth);
            } else {
                localStorage.setItem(AppCacheLogonLocal.autoLoginKey, AppCache.Auth);
            }

            AppCache.enableAutoLogin = true;
        } else {
            AppCacheLogonLocal.AutoLoginRemove();
        }
    },

    AutoLoginRemove: function () {
        AppCache.enableAutoLogin = false;
        if (isSecureKeyStorePluginAvailableOnCordova()) {
            cordova.plugins.SecureKeyStore.remove(function (res) {
                
            }, function (error) {
                localStorage.removeItem(AppCacheLogonLocal.autoLoginKey);
            }, AppCacheLogonLocal.autoLoginKey);
        } else {
            localStorage.removeItem(AppCacheLogonLocal.autoLoginKey);
        }
    },

    AutoLoginGet: function () {
        return new Promise(function (resolve, reject) {
            if (isSecureKeyStorePluginAvailableOnCordova()) {
                cordova.plugins.SecureKeyStore.get(
                    function (res) {
                        resolve(res);
                    },
                    function (error) {
                        resolve(localStorage.getItem(AppCacheLogonLocal.autoLoginKey));
                    }, AppCacheLogonLocal.autoLoginKey);
            } else {
                resolve(localStorage.getItem(AppCacheLogonLocal.autoLoginKey));
            }
        });
    },

    Relog: function (auth, process) {
        refreshingAuth = true;
        return new Promise(function (resolve, reject) {
            let rec;
            try {
                rec = Base64.decode(auth);
                rec = JSON.parse(rec);
            } catch (e) {
                appCacheError(e);
                return resolve('ERROR');
            }

            jsonRequest({
                url: AppCache.Url + '/user/logon/local' + AppCache._getLoginQuery(),
                data: JSON.stringify(rec),
                headers: {
                    'login-path': getLoginPath(),
                },  
                success: function (data) {
                    refreshingAuth = false;
                    AppCache.clearLoadQueueAfterAuthRefresh();

                    if (data.status && data.status === 'UpdatePassword') {
                        const url = new URL(data.link, location.href);
                        url.searchParams.append('reason', data.reason || 'other');
                        url.searchParams.append('redirect', encodeURIComponent(location.href));
                        location.replace(url.toString());
                        resolve('ERROR');
                    } else {
                        resolve('OK');
                    }
                },
                error: function (result, status) {
                    refreshingAuth = false;
                    if (result.status === 0) {
                        resolve('OK');
                        onOffline();
                    } else {
                        resolve('ERROR');
                    }
                }
            });
        });
    },

    Logoff: function () {
        p9UserLogout('Local');
    },

    Init: function () { }
}

window.AppCacheLogonLocal = AppCacheLogonLocal;