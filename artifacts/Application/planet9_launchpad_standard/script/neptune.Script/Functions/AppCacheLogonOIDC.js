const AppCacheLogonOIDCToken = 'p9oidctoken';

function clearP9OidcToken() {
    if (localStorage.getItem(AppCacheLogonOIDCToken) !== null) {
        localStorage.removeItem(AppCacheLogonOIDCToken);
    }
}

const AppCacheLogonOIDC = {
    state: null,
    options: {},

    Init: function () {
        this.options = getAuthSettingsForUser();
    },

    Logon: function () {
        this.options = getAuthSettingsForUser();

        if (isCordova()) {
            return this.LogonCordova();
        }

        this.LogonDesktop();
    },

    LogonCordova: function () {
        // PWA and Desktop
        // Ensure we have a proper cookie from the server
        refreshingAuth = true;
        fetch(AppCache.Url).then(() => {
            const logonUrl = `${AppCache.Url}/user/logon/openid-connect/${this.options.path}`;
            const logonWindow = this._showLogonPopup(logonUrl);
            logonWindow.addEventListener('loadstop', () => {
                logonWindow.executeScript({ code: 'location.search' }, async (locationSearch) => {
                    const callbackParams = locationSearch[0];
                    if (!callbackParams) {
                        return;
                    }

                    const authResponse = getHashParamsFromUrl(callbackParams);
                    if (authResponse.error) {
                        logonWindow.close();
                        sap.m.MessageToast.show(authResponse.error);
                        sap.ui.core.BusyIndicator.hide();
                        refreshingAuth = false;
                        return;
                    }

                    if (!authResponse.code) {
                        return;
                    }                        

                    const callbackUrl = `${logonUrl}/callback?${serializeDataForQueryString(authResponse)}`;
                    const res = await fetch(callbackUrl, {
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-planet9-mobile': 'true',
                        }
                    });

                    logonWindow.close();
                    refreshingAuth = false;

                    const { cookie, ...oidcData } = await res.json();
                    if (cordova.plugin && cordova.plugin.http && cordova.plugin.http.setCookie) {
                        cordova.plugin.http.setCookie(AppCache.Url, cookie);
                        appCacheLog("Mobile, OIDC Login - using cordova.plugin.http for cookie handling");
                    }

                    if(oidcData?.tokenSet?.refresh_token) {
                        AppCache.Auth = oidcData.tokenSet.refresh_token;
                    }

                    AppCacheLogonOIDC._onTokenReady(oidcData.tokenSet);
                    AppCache.getUserInfo();
                });
            });
        }).catch((err) => {
            refreshingAuth = false;
        });
    },

    LogonDesktop: function () {
        if (location.protocol === 'file:') {
            sap.m.MessageToast.show('Testing OIDC from file is not allowed due to CSRF issues. Please test in mobile app');
            return;
        }

        refreshingAuth = true;
        this._showLogonPopupAndWaitForCallbackUrl(`${AppCache.Url}/user/logon/openid-connect/${this.options.path}`)
            .then((callbackUrl) => {
                refreshingAuth = false;
                if (callbackUrl) {
                    const authResponse = getHashParamsFromUrl(callbackUrl);

                    appCacheLog('OIDC: Got code');
                    appCacheLog(authResponse);

                    return this.P9LoginWithCode(authResponse);
                }
            })
            .catch(() => {
                refreshingAuth = false;
            });
    },

    Logoff: function () {
        this.Signout();
        p9UserLogout('OpenID Connect');
    },

    Relog: function (refreshToken) {
        this.options = getAuthSettingsForUser();
        this.GetTokenWithRefreshToken(refreshToken, 'pin');
    },

    Signout: function () {
        clearP9OidcToken();

        const logon = getAuthSettingsForUser();
        externalAuthUserLogoutUsingPopup(`${AppCache.Url}/user/logon/openid-connect/${logon.path}/logout`, 1500)
            .finally(() => {
                p9UserLogout("OpenID Connect");
            });
    },

    GetTokenWithRefreshToken: function (refreshToken, process) {
        this.options = getAuthSettingsForUser();
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
        this.options = getAuthSettingsForUser();
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
                    'login-path': getLoginPath(),
                },
                success: (data) => {
                    refreshingAuth = false;
                    AppCache.clearLoadQueueAfterAuthRefresh();
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
        this.options = getAuthSettingsForUser();
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
                    AppCache.clearLoadQueueAfterAuthRefresh();
                    
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
        const key = generatePBKDF2Key(NumPad.numValue, AppCache.deviceID);
        const encrypted = encryptAES(data.refresh_token, key.toString());
        AppCache.userInfo.auth = encrypted.toString();
        
        if (!AppCache.userInfo) {
            AppCache.userInfo = {};
        }

        AppCache.userInfo.oidcToken = data;
        AppCache.userInfo.oidcUser = parseJsonWebToken(data.id_token);

        if (resourceToken) {
            AppCache.userInfo.oidcResourceToken = resourceToken;
        }

        appCacheLog('OIDC: User Data');
        appCacheLog(AppCache.userInfo);
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
