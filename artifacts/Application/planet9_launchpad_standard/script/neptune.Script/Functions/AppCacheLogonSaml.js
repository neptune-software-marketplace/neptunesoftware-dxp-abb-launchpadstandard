let AppCacheLogonSaml = {
    Logon: function (data) {
        refreshingAuth = true;
        AppCache.Auth = JSON.stringify(data);
        AppCache.samlData = data;

        let loginWin = window.open(data.entryPoint, "_blank", "location=yes");

        // Apply Event Hander for inAppBrowser
        setTimeout(function () {
            loginWin.addEventListener("loadstart", function (event) {
                // Check for login ok
                fetchUserInfo(
                    function (data) {
                        refreshingAuth = false;
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
        if (isOffline()) {
            AppCache.clearCookies();
            return;
        }

        // SAML Logout
        const logon = getLogonData();
        if (logon && logon.logoutUrl) {
            request({
                type: "GET",
                contentType: "application/json",
                url: logon.logoutUrl,
            });
        }

        // P9 Logout
        jsonRequest({
            url: `${AppCache.Url}/user/logout`,
            success: function (data) {
                AppCache.clearCookies();
            },
            error: function (result, status) {
                AppCache.clearCookies();
            },
        });
    },

    Init: function () {},
};
