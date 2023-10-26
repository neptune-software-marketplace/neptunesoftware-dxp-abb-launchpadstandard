let AppCacheLogonLdap = {
    Logon: function () {
        sap.ui.core.BusyIndicator.show();

        let rec = {};
        rec.username = AppCache_inUsername.getValue().toLowerCase();
        rec.password = AppCache_inPassword.getValue();
        rec.loginid = AppCache_loginTypes.getSelectedKey();
        AppCache.Auth = Base64.encode(JSON.stringify(rec));

        let logonData = AppCache.getLogonTypeInfo(AppCache_loginTypes.getSelectedKey());

        if (!logonData.path && AppCache.userInfo && AppCache.userInfo.logonData) {
            logonData = AppCache.getLogonTypeInfo(AppCache.userInfo.logonData.id);
        }

        jsonRequest({
            url: AppCache.Url + '/user/logon/ldap/' + logonData.path + AppCache._getLoginQuery(),
            data: JSON.stringify(rec),
            headers: {
                'login-path': getLoginData(),
            },
            success: function (data) {
                setSelectedLoginType('ldap');
                AppCache.getUserInfo();
            },
            error: function (result, status) {
                if (result.status === 401) {
                    sap.m.MessageToast.show(AppCache_tWrongUserNamePass.getText());
                }
            }
        });
    },

    Relog: function (auth) {
        return new Promise(function (resolve, reject) {
            let logonData = AppCache.getLogonTypeInfo(AppCache_loginTypes.getSelectedKey());
            if (!logonData.path && AppCache.userInfo && AppCache.userInfo.logonData) {
                logonData = AppCache.getLogonTypeInfo(AppCache.userInfo.logonData.id);
            }

            let rec = Base64.decode(auth);
            try {
                rec = JSON.parse(rec);
            } catch (e) { }

            jsonRequest({
                url: AppCache.Url + '/user/logon/ldap/' + logonData.path + AppCache._getLoginQuery(),
                data: JSON.stringify(rec),
                headers: {
                    'login-path': getLoginData(),
                },
                success: function (data) {
                    setSelectedLoginType('ldap');
                    resolve(data);
                },
                error: function (result, status) {
                    if (result.status === 0) {
                        resolve('OK');
                        onOffline();
                    } else {
                        resolve();
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
        } else {
            AppCache.clearCookies();
        }
    },

    Init: function () { }
}