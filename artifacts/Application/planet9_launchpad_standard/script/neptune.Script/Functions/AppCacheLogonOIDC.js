const AppCacheLogonOIDC = {
    state: null,
    options: {},

    Logon: function () {
        this.options = getLoginSettings();

        if (!isCordova()) {
            if (location.protocol === 'file:') {
                sap.m.MessageToast.show('Testing OIDC from file is not allowed due to CSRF issues. Please test in mobile app');
                return;
            }

            refreshingAuth = true;
            this._showLogonPopupAndWaitForCallbackUrl(`${AppCache.Url}/user/logon/openid-connect/${this.options.path}`)
                .then((callbackUrl) => {
                    refreshingAuth = false;
                    if (callbackUrl) {
                        setSelectedLoginType('openid-connect');
                        const authResponse = this._getHashParamsFromUrl(callbackUrl);

                        appCacheLog('OIDC: Got code');
                        appCacheLog(authResponse);

                        return this.P9LoginWithCode(authResponse);
                    }
                })
                .catch(() => {
                    refreshingAuth = false;
                })
        } else {
            // Ensure we have a proper cookie from the server
            fetch(AppCache.Url).then(() => {
                const logonUrl = `${AppCache.Url}/user/logon/openid-connect/${this.options.path}`;
                const logonWindow = this._showLogonPopup(logonUrl);
                logonWindow.addEventListener('loadstop', () => {
                    logonWindow.executeScript({ code: 'location.search' }, async (locationSearch) => {
                        const callbackParams = locationSearch[0];
                        if (!callbackParams) {
                            logonWindow.close();
                            sap.m.MessageToast.show("Failed to authenticate, callback url missing!");
                            return;
                        }

                        const authResponse = AppCacheLogonOIDC._getHashParamsFromUrl(callbackParams);
                        if (authResponse.error) {
                            logonWindow.close();
                            sap.m.MessageToast.show(authResponse.error);
                            sap.ui.core.BusyIndicator.hide();
                            return;
                        }

                        if (!authResponse.code) {
                            logonWindow.close();
                            sap.m.MessageToast.show("No code detected in callback url");
                            return;
                        }

                        const callbackUrl = `${AppCache.Url}/user/logon/openid-connect/azure-oidc/callback?${serializeDataForQueryString(authResponse)}`;
                        const res = await fetch(callbackUrl, {
                            credentials: 'include',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-planet9-mobile': 'true'
                                // Do we need this?
                                //'logon-path': getLoginData(),
                            }
                        });

                        const { cookie } = await res.json();

                        if (cordova.plugin && cordova.plugin.http && cordova.plugin.http.setCookie) {
                            cordova.plugin.http.setCookie(AppCache.Url, cookie);
                        } else {
                            appCacheError("Mobile, OIDC Login - NO cordova.plugin.http.setCookie available");
                        }

                        logonWindow.close();
                    });
                });
            })
        }
    },

    Logoff: function () {
        if (isOffline()) {
            AppCache.clearCookies();
            return;
        }

        this.Signout();

        jsonRequest({
            url: `${AppCache.Url}/user/logout`,
            success: (data) => {
                AppCache.clearCookies();
                appCacheLog('OIDC: Successfully logged out');
            },
            error: (result, status) => {
                sap.ui.core.BusyIndicator.hide();
                AppCache.clearCookies();
                appCacheLog('OIDC: Successfully logged out, in offline mode');
            }
        });
    },

    Relog: function (refreshToken) {
        this.options = getLoginSettings();
        this.GetTokenWithRefreshToken(refreshToken, 'pin');
    },

    Init: function () {
        this.options = getLoginSettings();
    },

    Signout: function () {
        const logon = getLoginSettings();
        const signOut = window.open(`${AppCache.Url}/user/logon/openid-connect/${logon.path}/logout`, '_blank', 'location=no,width=5,height=5,left=-1000,top=3000');

        // if pop-ups are blocked signout window.open will return null
        if (!signOut) return;

        if (isCordova()) {
            signOut.hide();
            signOut.addEventListener('loadstop', () => {
                signOut.close();
            })
        } else {
            signOut.onload = () => {
                signOut.close();
            };

            signOut.blur && signOut.blur();

            setTimeout(() => {
                signOut.close();
            }, 5000);
        }
    },

    GetTokenWithRefreshToken: function (refreshToken, process) {
        this.options = getLoginSettings();
        appCacheLog('OIDC: Starting method GetTokenWithRefreshToken');


        return new Promise((resolve, reject) => {
            refreshingAuth = true;
            request({
                type: 'POST',
                url: `${AppCache.Url}/user/logon/openid-connect/${this.options.path}/token`,
                contentType: 'application/x-www-form-urlencoded',
                data: {
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                },
                success: (data) => {
                    refreshingAuth = false;
                    setSelectedLoginType('openid-connect');

                    appCacheLog('OIDC: Got tokens from GetTokenWithRefreshToken');
                    appCacheLog(data);

                    this._onTokenReady(data);
                    this.P9LoginWithToken(data, process);
                    resolve(data);
                },
                error: (result) => {
                    refreshingAuth = false;
                    sap.ui.core.BusyIndicator.hide();

                    let errorText = 'OIDC: Error getting token from GetTokenWithRefreshToken';

                    if (result.responseJSON && result.responseJSON.error_description) {
                        errorText = result.responseJSON.error_description;
                    }

                    sap.m.MessageToast.show(errorText);

                    appCacheLog(errorText);
                    AppCache.Logout();
                    reject(result);
                }
            })
        });

    },

    P9LoginWithCode: function (authResponse) {
        this.options = getLoginSettings();
        const url = `${AppCache.Url}/user/logon/openid-connect/${this.options.path}/callback?${serializeDataForQueryString(authResponse)}`;

        sap.ui.core.BusyIndicator.show(0);
        appCacheLog('OIDC: Starting method P9LoginWithCode');

        return new Promise((resolve, reject) => {
            refreshingAuth = true;
            request({
                type: 'GET',
                url: url,
                contentType: 'application/json',
                headers: {
                    'login-path': getLoginData(),
                },
                success: (data) => {
                    refreshingAuth = false;
                    appCacheLog('OIDC: Successfully logged on to P9. Starting process: Get User Info');
                    appCacheLog(data);

                    if (data.refresh_token) {
                        AppCache.Auth = data.refresh_token;
                    } else {
                        console.error('OIDC: No refresh token is received');
                        return;
                    }

                    this._onTokenReady(data);
                    AppCache.getUserInfo();
                },
                error: (result) => {
                    refreshingAuth = false;
                    sap.ui.core.BusyIndicator.hide();

                    if (result.responseJSON && result.responseJSON.status) {
                        sap.m.MessageToast.show(result.responseJSON.status);
                    }

                    console.log('OIDC: Error login to P9.');
                    console.log(result);
                    reject(result);
                }
            });
        });
    },

    P9LoginWithToken: function (token, process) {
        this.options = getLoginSettings();
        sap.ui.core.BusyIndicator.show(0);

        appCacheLog('OIDC: Starting method P9LoginWithToken');
        if (!token.id_token) {
            console.error('OIDC: id_token is missing');
            return;
        }
        appCacheLog(token.id_token)

        refreshingAuth = true;
        return new Promise((resolve, reject) => {
            jsonRequest({
                url: `${AppCache.Url}/user/logon/openid-connect/${this.options.path}/session${AppCache._getLoginQuery()}`,
                headers: {
                    'Authorization': `Bearer ${token.id_token}`,
                },
                success: (data) => {
                    refreshingAuth = false;
                    setSelectedLoginType('openid-connect');
                    switch (process) {
                        case 'pin':
                            appCacheLog(`OIDC: Successfully logged on to P9. Starting process: ${process}`);

                            // Start App
                            NumPad.attempts = 0;
                            NumPad.Clear();
                            NumPad.Verify = true;
                            AppCache.Encrypted = '';
                            if (AppCache.isMobile) AppCache.Update();
                            break;

                        case 'refresh':
                            appCacheLog('OIDC: Auto Refresh Session');
                            break;

                        default:
                            break;

                    }

                },
                error: (result) => {
                    refreshingAuth = false;
                    sap.ui.core.BusyIndicator.hide();
                    let errorText = 'Error logging on P9, or P9 not online';
                    if (result.responseJSON && result.responseJSON.status) errorText = result.responseJSON.status;
                    appCacheLog(errorText);
                    if (result.status === 0) onOffline();
                    reject(result);
                }
            })
        });

    },

    _onTokenReady: function (data, resourceToken) {
        if (!AppCache.userInfo) {
            AppCache.userInfo = {};
        }

        AppCache.userInfo.oidcToken = data;
        AppCache.userInfo.oidcUser = AppCacheLogonAzure._parseJwt(AppCache.userInfo.oidcToken.id_token);

        if (resourceToken) {
            AppCache.userInfo.oidcResourceToken = resourceToken;
        }

        appCacheLog('OIDC: User Data');
        appCacheLog(AppCache.userInfo);
    },

    _getHashParamsFromUrl: function (url) {

        if (url.indexOf('?') < 0) return;

        const queryString = url.split('?')[1];

        let params = queryString.replace(/^(#|\?)/, '');
        let hashParams = {};
        let e,
            a = /\+/g,
            r = /([^&;=]+)=?([^&;]*)/g,
            d = function (s) {
                return decodeURIComponent(s.replace(a, ' '));
            };
        while (e = r.exec(params))
            hashParams[d(e[1])] = d(e[2]);
        return hashParams;
    },

    _showLogonPopupAndWaitForCallbackUrl: function (url) {
        return new Promise((resolve, reject) => {
            const popup = this._showLogonPopup(url);

            (function check() {
                if (popup.closed) {
                    return resolve();
                }

                let callbackUrl = '';
                try {
                    callbackUrl = popup.location.href || '';
                } catch (e) { }

                if (callbackUrl) {
                    if (callbackUrl.indexOf('code=') > -1) {
                        console.log('Callbackurl: ', callbackUrl);
                        popup.close();
                        return resolve(callbackUrl);
                    }
                }
                setTimeout(check, 100);
            })();
        });
    },

    _showLogonPopup: function (url) {
        const winLeft = window.screenLeft ? window.screenLeft : window.screenX;
        const winTop = window.screenTop ? window.screenTop : window.screenY;

        const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        const height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

        const popUpWidth = 500;
        const popUpHeight = 650;
        const left = ((width / 2) - (popUpWidth / 2)) + winLeft;
        const top = ((height / 2) - (popUpHeight / 2)) + winTop;

        const logonWin = window.open(url, '_blank', `location=no,width=${popUpWidth},height=${popUpHeight},left=${left},top=${top}`);
        if (logonWin.focus) logonWin.focus();

        return logonWin;
    }
}

window.AppCacheLogonOIDC = AppCacheLogonOIDC;
