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

        jsonRequest({
            url: AppCache.Url + '/user/logon/local' + AppCache._getLoginQuery(),
            data: JSON.stringify(rec),
            headers: {
                'login-path': getLoginData(),
            },
            success: function (data) {
                if (data.status && data.status === 'UpdatePassword') {
                    const url = new URL(data.link, location.href);
                    url.searchParams.append('reason', data.reason || 'other');
                    location.replace(url.toString());
                } else {
                    setSelectedLoginType('local');
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
            if (typeof cordova !== 'undefined' && typeof cordova.plugins !== 'undefined' && typeof cordova.plugins.SecureKeyStore !== 'undefined') {
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
        if (typeof cordova !== 'undefined' && typeof cordova.plugins !== 'undefined' && typeof cordova.plugins.SecureKeyStore !== 'undefined') {
            cordova.plugins.SecureKeyStore.remove(
                function (res) { },
                function (error) {
                    localStorage.removeItem(AppCacheLogonLocal.autoLoginKey);
                }, AppCacheLogonLocal.autoLoginKey);
        } else {
            localStorage.removeItem(AppCacheLogonLocal.autoLoginKey);
        }
    },

    AutoLoginGet: function () {
        return new Promise(function (resolve, reject) {
            if (typeof cordova !== 'undefined' && typeof cordova.plugins !== 'undefined' && typeof cordova.plugins.SecureKeyStore !== 'undefined') {
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
        return new Promise(function (resolve, reject) {
            let rec = Base64.decode(auth);

            try {
                rec = JSON.parse(rec);
            } catch (e) {
                console.log(e);
                resolve('ERROR');
            }

            jsonRequest({
                url: AppCache.Url + '/user/logon/local' + AppCache._getLoginQuery(),
                data: JSON.stringify(rec),
                headers: {
                    'login-path': getLoginData(),
                },  
                success: function (data) {
                    if (data.status && data.status === 'UpdatePassword') {
                        const url = new URL(data.link, location.href);
                        url.searchParams.append('reason', data.reason || 'other');
                        location.replace(url.toString());
                        resolve('ERROR');
                    } else {
                        setSelectedLoginType('local');
                        resolve('OK');
                    }
                },
                error: function (result, status) {
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
        if (navigator.onLine && AppCache.isOffline === false) {
            jsonRequest({
                url: AppCache.Url + '/user/logout',
                success: function (data) {
                    AppCache.clearCookies();
                },
                error: function (result, status) {
                    AppCache.clearCookies();
                }
            });
        }
    },

    Init: function () { }
}

window.AppCacheLogonLocal = AppCacheLogonLocal;