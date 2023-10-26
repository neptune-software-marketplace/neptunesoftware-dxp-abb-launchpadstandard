let AppCacheLogonAzure = {
    state: null,
    options: {},
    fullUri: null,
    redirectUri: '/public/azure_redirect.html',
    msalObj: null,
    loginScopes: ['user.read', 'profile', 'openid', 'offline_access'],

    InitMsal: function () {
        let me = this;
        return new Promise(function (resolve) {

            if (me.msalObj) return resolve();

            let msalUrl = '/public/ms/msal.js';
            if (isCordova()) msalUrl = 'public/ms/msal.js';

            AppCache.loadLibrary(msalUrl).then(function () {

                let redirectUri = AppCacheLogonAzure.redirectUri;

                if (AppCache.Url) {
                    redirectUri = AppCache.Url + redirectUri;
                } else {
                    redirectUri = location.origin + redirectUri;
                }

                me.msalObj = new msal.PublicClientApplication({
                    auth: {
                        clientId: me.options.clientID,
                        authority: 'https://login.microsoftonline.com/' + me.options.tenantId,
                        redirectUri: redirectUri,
                    },
                    cache: {
                        cacheLocation: 'sessionStorage',
                        storeAuthStateInCookie: false,
                    }
                });

                resolve();
            });
        });
    },

    Logon: function (loginHint) {
        this.options = this._getLogonData();

        if (this.useMsal()) {
            this._loginMsal();
            return;
        }

        this.state = Date.now();

        let logonWin = this._openPopup(this._loginUrl(loginHint));

        if (!isCordova()) {
            if (location.protocol === 'file:') {
                sap.m.MessageToast.show('Testing Microsoft Entra ID from file is not allowed due to CSRF issues. Please test in mobile app');
                return;
            }

            if (logonWin.focus) logonWin.focus();

            // Browser
            this._waitForPopupDesktop(logonWin, (url) => {
                let authResponse = AppCacheLogonAzure._getHashParams(url);

                // Get response
                if (authResponse) {
                    if (authResponse.error) {
                        sap.m.MessageToast.show(authResponse.error);
                        sap.ui.core.BusyIndicator.hide();
                        return;
                    }

                    appCacheLog('Azure Logon: Got code');
                    appCacheLog(authResponse);

                    // Prevent cross-site request forgery attacks
                    if (parseInt(authResponse.state) !== AppCacheLogonAzure.state) {
                        sap.m.MessageToast.show('Cross-site request forgery detected');
                        return;
                    }

                    // Request Access/Refresh Tokens 
                    AppCacheLogonAzure._getToken(authResponse);
                } else {
                    console.log('No token response, or window closed manually');
                }
            });
        } else {
            // Mobile InAppBrowser
            logonWin.addEventListener('loadstop', () => {
                logonWin.executeScript({ code: 'location.search' }, (url) => {
                    let authResponse = AppCacheLogonAzure._getHashParams(url[0]);

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

                        if (authResponse.state && authResponse.code) {
                            logonWin.close();

                            // Prevent cross-site request forgery attacks
                            if (parseInt(authResponse.state) !== AppCacheLogonAzure.state) {
                                sap.m.MessageToast.show('Cross-site request forgery detected');
                                return;
                            }

                            // Request Access/Refresh Tokens 
                            AppCacheLogonAzure._getToken(authResponse);
                        }
                    }
                });
            });
        }
    },

    GetTokenPopup: function (request) {
        const me = this;
        return me.msalObj.acquireTokenSilent(request).catch(function (error) {
            if (error instanceof msal.InteractionRequiredAuthError) {
                return me.msalObj.acquireTokenPopup(request).then(tokenResponse => {
                    return tokenResponse;
                }).catch(error => {
                    appCacheError('Azure GetTokenPopup: ' + error);
                });
            } else {
                appCacheError('Azure GetTokenPopup: ' + error);
            }
        });
    },

    Signout: function () {
        localStorage.removeItem('p9azuretoken');
        localStorage.removeItem('p9azuretokenv2');

        if (AppCacheLogonAzure.options.azureSilentSignout) {
            let signoutFrame = document.getElementById('azureSignout');
            if (signoutFrame) signoutFrame.setAttribute('src', 'https://login.microsoftonline.com/common/oauth2/logout');
        } else {
            const signOut = window.open('https://login.microsoftonline.com/common/oauth2/logout', '_blank', 'location=no,width=5,height=5,left=-1000,top=3000');
            
            // if pop-ups are blocked signout window.open will return null
            if (!signOut) return;
            
            signOut.blur && signOut.blur();

            if (isCordova()) {
                signOut.addEventListener('loadstop', () => {
                    signOut.close();
                });
            } else {
                signOut.onload = () => {
                    signOut.close();
                };

                setTimeout(() => {
                    signOut.close();
                }, 1000);
            }
        }
    },

    Relog: function (refreshToken, process) {

        let me = this;

        me.options = me._getLogonData();

        if (me.useMsal() && !me.msalObj) {
            me.InitMsal().then(function () {
                me._refreshToken(refreshToken, process);
            });
        } else {
            me._refreshToken(refreshToken, process);
        }

    },

    Logoff: function () {

        // Logout Planet 9
        if (navigator.onLine && AppCache.isOffline === false) {

            AppCacheLogonAzure.Signout();

            jsonRequest({
                url: this.fullUri + '/user/logout',
                success: function (data) {
                    AppCache.clearCookies();
                    appCacheLog('Azure Logon: Successfully logged out');
                },
                error: function (result, status) {
                    sap.ui.core.BusyIndicator.hide();
                    AppCache.clearCookies();
                    appCacheLog('Azure Logon: Successfully logged out, in offline mode');
                }
            });
        } else {
            AppCache.clearCookies();
        }
    },

    Init: function () {

    },

    useMsal: function () {
        if (this.options.azureMSALv2 && !isCordova()) return true;
    },

    _loginMsal: function () {

        let me = this;

        me.InitMsal().then(function () {
            me.msalObj.loginPopup({ scopes: me.loginScopes, prompt: 'select_account' }).then(function (response) {
                AppCache.Auth = ModelData.genID();
                AppCacheLogonAzure._loginP9(response.idToken);
            }).catch(function (error) {
                if (error && error.toString().indexOf('Failed to fetch') > -1) {
                    sap.m.MessageToast.show('Failed to fetch token. Redirect URI in azure must be set to Single Page Application');
                } else {
                    sap.m.MessageToast.show(error.toString());
                }
            });
        });
    },

    _getHashParams: function (token) {

        if (!token) return null;
        if (token.indexOf('?') > -1) token = token.split('?')[1];

        let params = token.replace(/^(#|\?)/, '');
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

    _authUrl: function (endPoint) {
        return 'https://login.microsoftonline.com/' + AppCacheLogonAzure.options.tenantId + '/oauth2/v2.0/' + endPoint + '?';
    },

    _loginUrl: function (loginHint) {
        let data = {
            client_id: AppCacheLogonAzure.options.clientID,
            redirect_uri: this.fullUri + AppCacheLogonAzure.redirectUri,
            scope: AppCacheLogonAzure.loginScopes.join(' '),
            // nonce: ModelData.genID(),
            state: this.state,
            prompt: 'select_account',
            response_type: 'code'
        };

        if (loginHint) data.login_hint = loginHint;

        return this._authUrl('authorize') + serializeDataForQueryString(data);
    },

    _logoutUrl: function () {

        let data = {
            post_logout_redirect_uri: this.fullUri + AppCacheLogonAzure.redirectUri
        };

        return this._authUrl('logout') + serializeDataForQueryString(data);
    },

    _onTokenReadyMsal: function (data, resourceToken) {
        // Old token format.
        AppCache.userInfo.azureToken = {
            access_token: data.accessToken,
            expires_in: (data.expiresOn - new Date()) / 1000,
            ext_expires_in: ((data.extExpiresOn - new Date()) / 1000),
            id_token: data.idToken,
            refresh_token: 'N/A',
            scope: data.scopes.join(' '),
            token_type: 'Bearer',
        };
        //New token format
        AppCache.userInfo.v2azureToken = data;
        AppCache.userInfo.azureUser = AppCacheLogonAzure._parseJwt(AppCache.userInfo.azureToken.idToken);

        if (resourceToken) {
            AppCache.userInfo.v2azureResourceToken = resourceToken;
        }

        const nextRelog = (data.expiresOn - new Date()) - 120000;
        setTimeout(function () {
            AppCacheLogonAzure.Relog(null, 'refresh');
        }, nextRelog);
    },

    _onTokenReady: function (data, resourceToken) {
        if (!AppCache.userInfo) {
            AppCache.userInfo = {};
        }

        if (!data.expires_on) {
            data.expires_on = new Date();
            data.expires_on.setSeconds(data.expires_on.getSeconds() + data.expires_in);
            data.expires_on = data.expires_on.getTime();
        }

        // Autorelogin 
        let expire_in_ms = (data.expires_in * 1000) - 120000;

        AppCache.userInfo.azureToken = data;
        AppCache.userInfo.azureUser = AppCacheLogonAzure._parseJwt(AppCache.userInfo.azureToken.id_token);


        if (resourceToken) {
            AppCache.userInfo.azureResourceToken = resourceToken;
        }

        if (AppCacheLogonAzure.autoRelog) {
            clearInterval(AppCacheLogonAzure.autoRelog);
            AppCacheLogonAzure.autoRelog = null;
        }

        AppCacheLogonAzure.autoRelog = setInterval(function () {
            if (AppCache.isRestricted && !AppCache.inBackground) return;
            AppCacheLogonAzure.Relog(data.refresh_token, 'refresh');
        }, expire_in_ms);

        appCacheLog('Azure Logon: User Data');
        appCacheLog(AppCache.userInfo);

        return;
    },

    _getToken: function (response) {
        let url = this._authUrl('token');
        let data = {
            client_id: AppCacheLogonAzure.options.clientID,
            redirect_uri: this.fullUri + AppCacheLogonAzure.redirectUri,
            scope: AppCacheLogonAzure.loginScopes.join(' '),
            code: response.code,
            grant_type: 'authorization_code',
        };

        return request({
            type: 'POST',
            url: this.fullUri + '/user/logon/' + this.options.type + '/' + this.options.path + '/' + encodeURIComponent(url),
            contentType: 'application/x-www-form-urlencoded',
            data: data,
            success: function (data) {

                if (data && !data.refresh_token) {
                    sap.m.MessageToast.show('Error getting refresh_token from Azure. Add scope offline_access in authentication configuration');
                    appCacheError('Azure Logon: Error getting refresh_token. Add scope offline_access in authentication configuration');
                    return;
                }

                appCacheLog('Azure Logon: Got tokens');
                appCacheLog(data);

                AppCache.Auth = data.refresh_token;

                AppCacheLogonAzure._onTokenReady(data);
                AppCacheLogonAzure._loginP9(data.id_token);
            },
            error: function (result, status) {

                sap.ui.core.BusyIndicator.hide();

                let errorCode = '';
                let errorText = 'Error getting token from Microsoft Entra ID';
                if (result.responseJSON && result.responseJSON.error_description) {
                    errorText = result.responseJSON.error_description;
                    errorCode = errorText.substr(0, 12);
                }

                sap.m.MessageToast.show(errorText);
                appCacheLog(`${errorCode}: ${errorText}`);
                AppCache.Logout();

            }

        });

    },

    _refreshTokenMsal: function (process) {
        const me = this;
        const account = this.msalObj.getAccountByUsername(AppCache.userInfo.username);

        me.GetTokenPopup({ scopes: me.loginScopes, account }).then(function (azureToken) {
            if (me.options.scope) {
                me.GetTokenPopup({ scopes: me.options.scope.split(' '), account }).then(function (resourceToken) {
                    AppCacheLogonAzure._onTokenReadyMsal(azureToken, resourceToken);
                    AppCacheLogonAzure._loginP9(azureToken.idToken, process);
                });
            } else {
                AppCacheLogonAzure._onTokenReadyMsal(azureToken);
                AppCacheLogonAzure._loginP9(azureToken.idToken, process);
            }
        }).catch(function (error) {
            let errorText = 'Error getting refreshToken from Microsoft Entra ID';
            let errorCode = '';

            if (error && error.message && error.message.indexOf('AADSTS700082') > -1) {
                NumPad.Clear();
                AppCache.Logout();
            }

            if (process === 'pin') NumPad.Clear();

            sap.m.MessageToast.show(errorText);
            appCacheLog(`${errorCode}: ${errorText}`);
        });
    },

    _getResourceToken: function (refreshToken, scope) {
        const me = this;
        let data = {
            client_id: AppCacheLogonAzure.options.clientID,
            scope: scope,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }

        return new Promise(function (resolve, reject) {
            return request({
                type: 'POST',
                url: me.fullUri + '/user/logon/' + me.options.type + '/' + me.options.path + '/' + encodeURIComponent(me._authUrl('token')),
                contentType: 'application/x-www-form-urlencoded',
                data: data,
                success: function (data) {
                    resolve(data);
                },
                error: function (result, status) {
                    sap.ui.core.BusyIndicator.hide();

                    if (result.responseJSON && result.responseJSON.error_description) {
                        errorText = result.responseJSON.error_description;
                        errorCode = errorText.substr(0, 12);
                        appCacheLog('Could not get resource token. Error:', errorText);
                    }
                    resolve();
                }
            });
        });
    },

    _refreshToken: function (refreshToken, process) {
        const me = this;

        if (!process) process = 'pin';

        if (this.msalObj) {
            this._refreshTokenMsal(process);
            return;
        }

        let url = this._authUrl('token');

        let data = {
            client_id: me.options.clientID,
            scope: this.loginScopes.join(' '),
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        };

        // Get Tokens from Azure
        return request({
            type: 'POST',
            url: this.fullUri + '/user/logon/' + this.options.type + '/' + this.options.path + '/' + encodeURIComponent(url),
            contentType: 'application/x-www-form-urlencoded',
            data: data,
            success: function (data) {
                appCacheLog(`Azure Logon: Got refresh_token: ${data.refresh_token}`);

                if (me.options.scope) {
                    me._getResourceToken(refreshToken, me.options.scope).then(function (resourceToken) {
                        me._onTokenReady(data, resourceToken);
                        me._loginP9(data.id_token, process);
                    });
                } else {
                    me._onTokenReady(data);
                    me._loginP9(data.id_token, process);
                }
            },
            error: function (result, status) {

                sap.ui.core.BusyIndicator.hide();

                let errorText = 'Error getting refreshToken from Microsoft Entra ID';
                let errorCode = '';

                if (result.responseJSON && result.responseJSON.error_description) {

                    errorText = result.responseJSON.error_description;
                    errorCode = errorText.substr(0, 12);

                    switch (errorCode) {

                        case 'AADSTS700082':
                            NumPad.Clear();
                            AppCache.Logout();
                            break;

                    }
                }

                if (process === 'pin') NumPad.Clear();

                sap.m.MessageToast.show(errorText);
                appCacheLog(`${errorCode}: ${errorText}`);
            }
        });
    },

    _loginP9: function (idToken, process) {

        return request({
            type: 'POST',
            url: AppCache.Url + '/user/logon/' + AppCacheLogonAzure.options.type + '/' + AppCacheLogonAzure.options.path + AppCache._getLoginQuery(),
            headers: { 'Authorization': 'Bearer ' + idToken, 'login-path': getLoginData() },
            success: function (data) {
                setSelectedLoginType(AppCacheLogonAzure.options.type);

                switch (process) {

                    case 'pin':
                        appCacheLog(`Azure Logon: Successfully logged on to P9. Starting process: ${process}`);

                        // Start App
                        NumPad.numPasscode = 0;
                        NumPad.Clear();
                        NumPad.Verify = true;
                        AppCache.Encrypted = '';
                        if (AppCache.isMobile) AppCache.Update();
                        break;

                    case 'refresh':
                        appCacheLog(`Azure Logon: Successfully logged on to P9. Starting process: ${process}`);
                        break;

                    default:
                        appCacheLog('Azure Logon: Successfully logged on to P9. Starting process: Get User Info');
                        AppCache.getUserInfo();
                        break;

                }

            },
            error: function (result, status) {
                sap.ui.core.BusyIndicator.hide();
                let errorText = 'Error logging on P9, or P9 not online';
                if (result.responseJSON && result.responseJSON.status) errorText = result.responseJSON.status;
                appCacheLog(errorText);
                if (result.status === 0) onOffline();
            }
        });
    },

    _waitForPopupDesktop: function (popupWin, onClose) {
        let url = '';
        let winCheckTimer = setInterval(function () {

            try {
                url = popupWin.location.href || '';
            } catch (e) {

            }

            if (url.indexOf('code=') > -1 || url.indexOf('error=') > -1) {
                clearInterval(winCheckTimer);
                popupWin.close();
                onClose(url);
            }
        }, 100);
    },

    _parseJwt: function (token) {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            return null;
        }
    },

    _openPopup: function (url, popUpWidth, popUpHeight) {

        popUpWidth = popUpWidth || 483;
        popUpHeight = popUpHeight || 600;

        let winLeft = window.screenLeft ? window.screenLeft : window.screenX;
        let winTop = window.screenTop ? window.screenTop : window.screenY;

        let width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        let height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

        let left = ((width / 2) - (popUpWidth / 2)) + winLeft;
        let top = ((height / 2) - (popUpHeight / 2)) + winTop;

        return window.open(url, '_blank', 'location=no,width=' + popUpWidth + ',height=' + popUpHeight + ',left=' + left + ',top=' + top);
    }

};