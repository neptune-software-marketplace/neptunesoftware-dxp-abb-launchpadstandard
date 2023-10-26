let AppCacheLogonSap = {

    sapData: undefined,

    Logon: function () {
        sap.ui.core.BusyIndicator.show();

        const rec = {
            username: AppCache_inUsername.getValue(),
            password: AppCache_inPassword.getValue()
        };
        AppCache.Auth = Base64.encode(JSON.stringify(rec));

        let logonData = AppCache.getLogonTypeInfo(AppCache_loginTypes.getSelectedKey());

        if (!logonData.path && AppCache.userInfo && AppCache.userInfo.logonData) {
            logonData = AppCache.getLogonTypeInfo(AppCache.userInfo.logonData.id);
        }

        jsonRequest({
            url: AppCache.Url + '/user/logon/sap/' + logonData.path + AppCache._getLoginQuery(),
            data: JSON.stringify(rec),
            headers: {
                'login-path': getLoginData(),
            },
            success: function (data) {
                if (data.status === 'UpdatePassword') {
                    sap.ui.core.BusyIndicator.hide();
                    AppCache_formLogon.setVisible(false);      
                    AppCache_formPasswordReset.setVisible(true);
                    txtFormNewPassRequired.setVisible(true);
                    AppCacheLogonSap.sapData = { detail: rec, path: logonData.path };
                } else {
                    setSelectedLoginType('sap');
                    AppCache.getUserInfo();
                }
            },
            error: function (result, status) {
                if (result.status === 401) {
                    sap.m.MessageToast.show(AppCache_tWrongUserNamePass.getText());
                }
            }
        });
    },

    ResetPassword: function() {    
        const { detail, path } = AppCacheLogonSap.sapData;
        if (inNewPassword.getValue() !== inNewPassword2.getValue()) {
            sap.m.MessageToast.show('Passwords doesn\'t match!');
        } else if (!inNewPassword.getValue()) {
            sap.m.MessageToast.show('Please provide a password');
        } else {
            sap.ui.core.BusyIndicator.show();
            jsonRequest({
                url: AppCache.Url + '/user/logon/sap/' + path + AppCache._getLoginQuery(),
                data: JSON.stringify({
                    detail,
                    password: inNewPassword.getValue()
                }),
                headers: {
                    'login-path': getLoginData(),
                },
                success: function (data) {                    
                    if (data.status === 'UpdatePassword') {                        
                        sap.ui.core.BusyIndicator.hide();
                        jQuery.sap.require('sap.m.MessageToast');
                        sap.m.MessageToast.show(data.message);
                        inNewPassword.setValueState('Error');
                        inNewPassword2.setValueState('Error');
                    } else {
                        AppCache.Auth = Base64.encode(JSON.stringify({username: detail.username, password: inNewPassword.getValue()}));
                        AppCache_formLogon.setVisible(true);      
                        AppCache_formPasswordReset.setVisible(false);
                        setSelectedLoginType('sap');
                        AppCache.getUserInfo();
                    }
                },
                error: function (result, status) {
                    sap.ui.core.BusyIndicator.hide();

                    jQuery.sap.require('sap.m.MessageBox');
                    sap.m.MessageBox.show(result.responseJSON.status, {
                        title: 'Error',
                        icon: 'ERROR',
                        actions: ['CLOSE'],
                        onClose: function () { }
                    });

                    inNewPassword.setValueState('Error');
                    inNewPassword2.setValueState('Error');
                }
            });
        }
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
                url: AppCache.Url + '/user/logon/sap/' + logonData.path + AppCache._getLoginQuery(),
                data: JSON.stringify(rec),
                headers: {
                    'login-path': getLoginData(),
                },
                success: function (data) {
                    setSelectedLoginType('sap');
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