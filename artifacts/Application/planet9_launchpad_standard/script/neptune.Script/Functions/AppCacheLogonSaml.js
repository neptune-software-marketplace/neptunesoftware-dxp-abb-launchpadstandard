let AppCacheLogonSaml = {
    Logon: function (data) {
        refreshingAuth = true;
        AppCache.Auth = JSON.stringify(data);

        const loginWin = window.open(data.entryPoint, "_blank", "location=yes");
        
        // Apply Event Hander for inAppBrowser
        setTimeout(function () {
            loginWin.addEventListener("loadstart", function (event) {
                // Check for login ok
                fetchUserInfo(
                    function (data) {
                        refreshingAuth = false;
                        AppCache.clearLoadQueueAfterAuthRefresh();
                        AppCache.afterUserInfo(false, data);
                        loginWin.close();
                    },
                    function (result, error) {
                        // Not logged on
                        refreshingAuth = false;
                    }
                );
            });
        }, 500);
    },

    Relog: function (data) {
        refreshingAuth = true;
        try {
            data = JSON.parse(data);
        } catch (e) {}
        let loginWin = window.open(data.entryPoint, "_blank", "location=yes");

        setTimeout(function () {
            // apply event handler for inAppBrowser
            loginWin.addEventListener("loadstart", function (event) {
                // check for login
                fetchUserInfo(
                    function (data) {
                        refreshingAuth = false;
                        AppCache.clearLoadQueueAfterAuthRefresh();

                        // Clear
                        NumPad.attempts = 0;
                        NumPad.Clear();
                        NumPad.Verify = true;

                        // Start App
                        AppCache.Encrypted = "";
                        AppCache.Update();

                        loginWin.close();
                    },
                    function (result, error) {
                        // Not logged on
                        refreshingAuth = false;
                    }
                );
            });
        }, 500);
    },

    Logoff: function () {
        // SAML Logout
        const logon = getAuthSettingsForUser();
        if (logon && logon.logoutUrl) {
            externalAuthUserLogoutUsingPopup(logon.logoutUrl).then(() => {
                p9UserLogout('SAML');
            });
        } else {
            p9UserLogout('SAML');
        }
    },

    Init: function () {},
};
