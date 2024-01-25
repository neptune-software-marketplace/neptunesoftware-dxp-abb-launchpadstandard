let AppCacheLogonAzure = {
    state: null,
    options: {},
    fullUri: null,
    redirectUri: '/public/azure_redirect.html',
    msalObj: null,
    loginScopes: ['user.read', 'profile', 'openid', 'offline_access'],

    InitMsal: function () {
        return new Promise((resolve) => {
            if (this.msalObj) return resolve();

            let msalUrl = '/public/ms/msal.js';
            if (isCordova()) msalUrl = 'public/ms/msal.js';

            AppCache.loadLibrary(msalUrl).then(() => {
                this.msalObj = new msal.PublicClientApplication({
                    auth: {
                        clientId: this.options.clientID,
                        authority: 'https://login.microsoftonline.com/' + this.options.tenantId,
                        redirectUri: AppCache.Url ? `${AppCache.Url}${this.redirectUri}` : `${location.origin}${this.redirectUri}`,
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
                let authResponse = this._getHashParams(url);

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
                    if (parseInt(authResponse.state) !== this.state) {
                        sap.m.MessageToast.show('Cross-site request forgery detected');
                        return;
                    }

                    // Request Access/Refresh Tokens 
                    this._getToken(authResponse);
                } else {
                    console.log('No token response, or window closed manually');
                }
            });
        } else {
            // Mobile InAppBrowser
            logonWin.addEventListener('loadstop', () => {
                logonWin.executeScript({ code: 'location.search' }, (url) => {
                    let authResponse = this._getHashParams(url[0]);

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
                            if (parseInt(authResponse.state) !== this.state) {
                                sap.m.MessageToast.show('Cross-site request forgery detected');
                                return;
                            }

                            // Request Access/Refresh Tokens 
                            this._getToken(authResponse);
                        }
                    }
                });
            });
        }
    },

    GetTokenPopup: function (request) {
        return this.msalObj.acquireTokenSilent(request).catch((err) => {
            if (err instanceof msal.InteractionRequiredAuthError) {
                return this.msalObj.acquireTokenPopup(request).then(tokenResponse => {
                    return tokenResponse;
                }).catch(error => {
                    appCacheError('Azure GetTokenPopup: ' + error);
                });
            } else {
                appCacheError('Azure GetTokenPopup: ' + err);
            }
        });
    },

    Signout: function () {
        localStorage.removeItem('p9azuretoken');
        localStorage.removeItem('p9azuretokenv2');

        if (this.options.azureSilentSignout) {
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
        this._setOptionsIfEmpty();
        if (this.useMsal() && !this.msalObj) {
            this.InitMsal().then(() => {
                this._refreshToken(refreshToken, process);
            });
        } else {
            this._refreshToken(refreshToken, process);
        }
    },

    Logoff: function () {
        // Logout Planet 9
        if (navigator.onLine && AppCache.isOffline === false) {
            this.Signout();

            jsonRequest({
                url: this.fullUri + '/user/logout',
                success: (data) => {
                    AppCache.clearCookies();
                    appCacheLog('Azure Logon: Successfully logged out');
                },
                error: (result, status) => {
                    sap.ui.core.BusyIndicator.hide();
                    AppCache.clearCookies();
                    appCacheLog('Azure Logon: Successfully logged out, in offline mode');
                }
            });
        } else {
            AppCache.clearCookies();
        }
    },

    Init: function () {},

    useMsal: function () {
        if (this.options.azureMSALv2 && !isCordova()) return true;
    },

    _loginMsal: function () {
        this.InitMsal().then(() => {
            this.msalObj.loginPopup({ scopes: this.loginScopes, prompt: 'select_account' }).then((response) => {
                AppCache.Auth = ModelData.genID();
                this._loginP9(response.idToken);
            }).catch((error) => {
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
        while (e = r.exec(params)) {
            hashParams[d(e[1])] = d(e[2]);
        }
        return hashParams;
    },

    _setOptionsIfEmpty: function() {
        this._setFullUriIfEmpty();
        if (Object.keys(this.options).length === 0) {
            try {
                this.options = JSON.parse(localStorage.getItem('p9logonData'));
            } catch (err) {}
        }
    },

    _setFullUriIfEmpty: function () {
        if (!this.fullUri) {
            this.fullUri = AppCache.Url || location.origin;
        }
    },

    _getLogonData: function () {
        this._setFullUriIfEmpty();

        if (AppCache.userInfo && AppCache.userInfo.logonData) {
            return AppCache.userInfo.logonData;
        }

        return AppCache.getLogonTypeInfo(AppCache_loginTypes.getSelectedKey());
    },

    _authUrl: function (endPoint) {
        return 'https://login.microsoftonline.com/' + this.options.tenantId + '/oauth2/v2.0/' + endPoint + '?';
    },

    _loginUrl: function (loginHint) {
        let data = {
            client_id: this.options.clientID,
            redirect_uri: this.fullUri + this.redirectUri,
            scope: this.loginScopes.join(' '),
            // nonce: ModelData.genID(),
            state: this.state,
            prompt: 'select_account',
            response_type: 'code'
        };

        if (loginHint) {
            data.login_hint = loginHint;
        }

        return this._authUrl('authorize') + serializeDataForQueryString(data);
    },

    _logoutUrl: function () {
        let data = {
            post_logout_redirect_uri: this.fullUri + this.redirectUri
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
        AppCache.userInfo.azureUser = this._parseJwt(AppCache.userInfo.azureToken.idToken);

        if (resourceToken) {
            AppCache.userInfo.v2azureResourceToken = resourceToken;
        }

        const nextRelog = (data.expiresOn - new Date()) - 120000;
        setTimeout(() => {
            this.Relog(null, 'refresh');
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
        AppCache.userInfo.azureUser = this._parseJwt(AppCache.userInfo.azureToken.id_token);

        if (resourceToken) {
            AppCache.userInfo.azureResourceToken = resourceToken;
        }

        if (this.autoRelog) {
            clearInterval(this.autoRelog);
            this.autoRelog = null;
        }

        this.autoRelog = setInterval(() => {
            if (AppCache.isRestricted && !AppCache.inBackground) return;
            this.Relog(data.refresh_token, 'refresh');
        }, expire_in_ms);

        appCacheLog('Azure Logon: User Data');
        appCacheLog(AppCache.userInfo);
        return;
    },

    _getToken: function (response) {
        const data = {
            client_id: this.options.clientID,
            redirect_uri: this.fullUri + this.redirectUri,
            scope: this.loginScopes.join(' '),
            code: response.code,
            grant_type: 'authorization_code',
        };
        const { type, path } = this.options;
        return request({
            type: 'POST',
            url: `${this.fullUri}/user/logon/${type}/${path}/${encodeURIComponent(this._authUrl('token'))}`,
            contentType: 'application/x-www-form-urlencoded',
            data: data,
            success: (data) => {
                if (data && !data.refresh_token) {
                    sap.m.MessageToast.show('Error getting refresh_token from Azure. Add scope offline_access in authentication configuration');
                    appCacheError('Azure Logon: Error getting refresh_token. Add scope offline_access in authentication configuration');
                    return;
                }

                appCacheLog('Azure Logon: Got tokens');
                appCacheLog(data);

                AppCache.Auth = data.refresh_token;

                this._onTokenReady(data);
                this._loginP9(data.id_token);
            },
            error: (result, status) => {
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
        refreshingAuth = true;
        const account = this.msalObj.getAccountByUsername(AppCache.userInfo.username);
        this.GetTokenPopup({ scopes: this.loginScopes, account }).then((azureToken) => {
            refreshingAuth = false;
            if (this.options.scope) {
                this.GetTokenPopup({ scopes: this.options.scope.split(' '), account }).then((resourceToken) => {
                    this._onTokenReadyMsal(azureToken, resourceToken);
                    this._loginP9(azureToken.idToken, process);
                });
            } else {
                this._onTokenReadyMsal(azureToken);
                this._loginP9(azureToken.idToken, process);
            }
        }).catch((error) => {
            refreshingAuth = false;
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
        const data = {
            client_id: this.options.clientID,
            scope: scope,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        };
        refreshingAuth = true;
        return new Promise((resolve, reject) => {
            const { type, path } = this.options;
            return request({
                type: 'POST',
                url: `${this.fullUri}/user/logon/${type}/${path}/${encodeURIComponent(this._authUrl('token'))}`,
                contentType: 'application/x-www-form-urlencoded',
                data: data,
                success: (data) => {
                    refreshingAuth = false;
                    resolve(data);
                },
                error: (result, status) => {
                    refreshingAuth = false;
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
        if (!process) process = 'pin';

        if (this.msalObj) {
            this._refreshTokenMsal(process);
            return;
        }

        // refresh token from Azure/EntraID
        refreshingAuth = true;
        const data = {
            client_id: this.options.clientID,
            scope: this.loginScopes.join(' '),
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        };
        const { type, path } = this.options;
        return request({
            data,
            type: 'POST',
            url: `${this.fullUri}/user/logon/${type}/${path}/${encodeURIComponent(this._authUrl('token'))}`,
            contentType: 'application/x-www-form-urlencoded',
            success: (data) => {
                refreshingAuth = false;
                appCacheLog(`Azure Logon: Got refresh_token: ${data.refresh_token}`);

                if (this.options.scope) {
                    this._getResourceToken(refreshToken, this.options.scope).then((resourceToken) => {
                        this._onTokenReady(data, resourceToken);
                        this._loginP9(data.id_token, process);
                    });
                } else {
                    this._onTokenReady(data);
                    this._loginP9(data.id_token, process);
                }
            },
            error: (result, status) => {
                refreshingAuth = false;
                sap.ui.core.BusyIndicator.hide();

                let errorCode = '';
                let errorText = 'Error getting refreshToken from Microsoft Entra ID';
                if (result.responseJSON && result.responseJSON.error_description) {
                    errorCode = errorText.substring(0, 12);
                    errorText = result.responseJSON.error_description;

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
        const { type, path } = this.options;
        refreshingAuth = true;
        return request({
            type: 'POST',
            url: `${AppCache.Url}/user/logon/${type}/${path}${AppCache._getLoginQuery()}`,
            headers: { 'Authorization': 'Bearer ' + idToken, 'login-path': getLoginData() },
            success: (data) => {
                refreshingAuth = false;
                setSelectedLoginType(this.options.type);

                switch (process) {
                    case 'pin':
                        appCacheLog(`Azure Logon: Successfully logged on to P9. Starting process: ${process}`);

                        // Start App
                        NumPad.attempts = 0;
                        NumPad.Clear();
                        NumPad.Verify = true;
                        AppCache.Encrypted = '';
                        AutoLockTimer.start();
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
            error: (result, status) => {
                refreshingAuth = false;
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
        let winCheckTimer = setInterval(() => {
            try {
                url = popupWin.location.href ?? '';
            } catch (err) {
                // otherwise it would error out on accessing string functions
                url = '';

                if (err.name === 'SecurityError') {
                    // we are unable to read location.href
                } else {
                    console.log('_waitForPopupDesktop popupWin', popupWin, 'error', err);
                }
            }

            if (url.indexOf('state=') > -1 || url.indexOf('nonce=') > -1) console.log(url);

            if (popupWin.closed || url.indexOf('error=') > -1) {
                clearInterval(winCheckTimer);
            }
            
            if (url.indexOf('code=') > -1) {
                console.log(url);
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

        const winLeft = window.screenLeft ? window.screenLeft : window.screenX;
        const winTop = window.screenTop ? window.screenTop : window.screenY;

        const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        const height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

        const left = ((width / 2) - (popUpWidth / 2)) + winLeft;
        const top = ((height / 2) - (popUpHeight / 2)) + winTop;

        return window.open(url, '_blank', 'location=no,width=' + popUpWidth + ',height=' + popUpHeight + ',left=' + left + ',top=' + top);
    }
};