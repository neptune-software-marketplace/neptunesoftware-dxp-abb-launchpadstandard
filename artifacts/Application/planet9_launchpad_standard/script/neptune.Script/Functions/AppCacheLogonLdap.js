let AppCacheLogonLdap = {
    Logon: function () {
        sap.ui.core.BusyIndicator.show();

        let rec = {};
        rec.username = AppCache_inUsername.getValue().toLowerCase();
        rec.password = AppCache_inPassword.getValue();
        rec.loginid = AppCache_loginTypes.getSelectedKey();
        AppCache.Auth = Base64.encode(JSON.stringify(rec));

        refreshingAuth = true;
        const { path } = getAuthSettingsForUser();
        jsonRequest({
            url: `${AppCache.Url}/user/logon/ldap/${path}${AppCache._getLoginQuery()}`,
            data: JSON.stringify(rec),
            headers: {
                'login-path': getLoginPath(),
            },
            success: function (data) {
                refreshingAuth = false;
                AppCache.clearLoadQueueAfterAuthRefresh();

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
        refreshingAuth = true;
        return new Promise(function (resolve, reject) {
            let rec = Base64.decode(auth);
            try {
                rec = JSON.parse(rec);
            } catch (e) {}

            const { path } = getAuthSettingsForUser();
            jsonRequest({
                url: `${AppCache.Url}/user/logon/ldap/${path}${AppCache._getLoginQuery()}`,
                data: JSON.stringify(rec),
                headers: {
                    'login-path': getLoginPath(),
                },
                success: function (data) {
                    refreshingAuth = false;
                    AppCache.clearLoadQueueAfterAuthRefresh();
                    resolve(data);
                },
                error: function (result, status) {
                    refreshingAuth = false;
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
        p9UserLogout('LDAP');
    },

    Init: function () { }
}