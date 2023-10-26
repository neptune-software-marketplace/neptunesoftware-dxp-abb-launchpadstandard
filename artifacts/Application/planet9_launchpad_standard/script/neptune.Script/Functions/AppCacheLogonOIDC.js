let AppCacheLogonOIDC = {
    state: null,
    options: {},
    
    Logon: function () {
        this.options = this._getLogonData();

        if (!isCordova()) {
            if (location.protocol === 'file:') {
                sap.m.MessageToast.show('Testing OIDC from file is not allowed due to CSRF issues. Please test in mobile app');
                return;
            }

            AppCacheLogonOIDC._showLogonPopupAndWaitForCallbackUrl(AppCache.Url + '/user/logon/openid-connect/' + AppCacheLogonOIDC.options.path)
                .then(function (callbackUrl) {
                    if (callbackUrl) {
                        setSelectedLoginType('openid-connect');
                        const authResponse = AppCacheLogonOIDC._getHashParamsFromUrl(callbackUrl);

                        appCacheLog('OIDC: Got code');
                        appCacheLog(authResponse);

                        return AppCacheLogonOIDC.P9LoginWithCode(authResponse);
                    }
                });
        } else {
            let logonWin = AppCacheLogonOIDC._showLogonPopup(AppCache.Url + '/user/logon/openid-connect/' + AppCacheLogonOIDC.options.path);

            // Mobile InAppBrowser
            logonWin.addEventListener('loadstop', function () {

                logonWin.executeScript({ code: 'location.search' }, function (url) {

                    let authResponse = AppCacheLogonOIDC._getHashParamsFromUrl(url[0]);

                    // Get response
                    if (authResponse) {

                        // Logging 
                        appCacheLog('LoadStop: Got search response');
                        appCacheLog(authResponse);

                        // Error 
                        if (authResponse.error) {
                            logonWin.close();
                            sap.m.MessageToast.show(authResponse.error);
                            sap.ui.core.BusyIndicator.hide();
                            return;
                        }

                        if (authResponse.code) {
                            logonWin.close();
                            AppCacheLogonOIDC.P9LoginWithCode(authResponse);

                        }

                    }
                });

            });

        }

    },

    Logoff: function () {

        this.options = this._getLogonData();

        if (navigator.onLine && AppCache.isOffline === false) {

            AppCacheLogonOIDC.Signout();

            jsonRequest({
                url: AppCache.Url + '/user/logout',
                success: function (data) {
                    AppCache.clearCookies();
                    appCacheLog('OIDC: Successfully logged out');
                },
                error: function (result, status) {
                    sap.ui.core.BusyIndicator.hide();
                    AppCache.clearCookies();
                    appCacheLog('OIDC: Successfully logged out, in offline mode');
                }
            });
        } else {
            AppCache.clearCookies();
        }

    },

    Relog: function (refreshToken) {
        this.options = this._getLogonData();
        AppCacheLogonOIDC.GetTokenWithRefreshToken(refreshToken, 'pin');
    },

    Init: function () {
        this.options = this._getLogonData();
    },

    Signout: function () {
        this.options = this._getLogonData();
        const signOut = window.open(AppCache.Url + '/user/logon/openid-connect/' + AppCacheLogonOIDC.options.path + '/logout', '_blank', 'location=no,width=5,height=5,left=-1000,top=3000');
        
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
        this.options = this._getLogonData();
        appCacheLog('OIDC: Starting method GetTokenWithRefreshToken');

        return new Promise(function (resolve, reject) {
            request({
                type: 'POST',
                url: AppCache.Url + '/user/logon/openid-connect/' + AppCacheLogonOIDC.options.path + '/token',
                contentType: 'application/x-www-form-urlencoded',
                data: {
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                },
                success: function (data) {
                    setSelectedLoginType('openid-connect');

                    appCacheLog('OIDC: Got tokens from GetTokenWithRefreshToken');
                    appCacheLog(data);

                    AppCacheLogonOIDC._onTokenReady(data);
                    AppCacheLogonOIDC.P9LoginWithToken(data, process);
                    resolve(data);
                },
                error: function (result) {

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
        this.options = this._getLogonData();
        let url = `${AppCache.Url}/user/logon/openid-connect/${AppCacheLogonOIDC.options.path}`
        url += '/callback?' + serializeDataForQueryString(authResponse);

        sap.ui.core.BusyIndicator.show(0);
        appCacheLog('OIDC: Starting method P9LoginWithCode');

        return new Promise(function (resolve, reject) {
            request({
                type: 'GET',
                url: url,
                contentType: 'application/json',
                headers: {
                    'login-path': getLoginData(),
                },
                success: function (data) {
                    appCacheLog('OIDC: Successfully logged on to P9. Starting process: Get User Info');
                    appCacheLog(data);

                    if (data.refresh_token) {
                        AppCache.Auth = data.refresh_token;
                    } else {
                        console.error('OIDC: No refresh token is received');
                        return;
                    }

                    AppCacheLogonOIDC._onTokenReady(data);
                    AppCache.getUserInfo();
                },
                error: function (result) {
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

        this.options = this._getLogonData();

        sap.ui.core.BusyIndicator.show(0);

        appCacheLog('OIDC: Starting method P9LoginWithToken');

        if (!token.id_token) {
            console.error('OIDC: id_token is missing');
            return;
        } else {
            appCacheLog(token.id_token)
        }

        return new Promise(function (resolve, reject) {
            jsonRequest({
                url: AppCache.Url + '/user/logon/openid-connect/' + AppCacheLogonOIDC.options.path + '/session' + AppCache._getLoginQuery(),
                headers: {
                    'Authorization': 'Bearer ' + token.id_token,
                },
                success: function (data) {
                    setSelectedLoginType('openid-connect');
                    switch (process) {
                        case 'pin':
                            appCacheLog(`OIDC: Successfully logged on to P9. Starting process: ${process}`);

                            // Start App
                            NumPad.numPasscode = 0;
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
                error: function (result) {
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

    _getLogonData: function () {
        let logonData;
        if (!this.fullUri) this.fullUri = AppCache.Url || location.origin;

        if (AppCache.userInfo && AppCache.userInfo.logonData && AppCache.userInfo.logonData.id) {
            logonData = AppCache.userInfo.logonData;
        } else {
            logonData = AppCache.getLogonTypeInfo(AppCache_loginTypes.getSelectedKey());
        }

        return logonData;
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

        return new Promise(function (resolve, reject) {
            const popup = AppCacheLogonOIDC._showLogonPopup(url);

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
        const popUpWidth = 500;
        const popUpHeight = 650;

        const winLeft = window.screenLeft ? window.screenLeft : window.screenX;
        const winTop = window.screenTop ? window.screenTop : window.screenY;

        const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        const height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

        const left = ((width / 2) - (popUpWidth / 2)) + winLeft;
        const top = ((height / 2) - (popUpHeight / 2)) + winTop;

        const logonWin = window.open(url, 'Login ', 'location=no,width=' + popUpWidth + ',height=' + popUpHeight + ',left=' + left + ',top=' + top);
        if (logonWin.focus) logonWin.focus();

        return logonWin;
    }
}

window.AppCacheLogonOIDC = AppCacheLogonOIDC;