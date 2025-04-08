let AppCacheLogonAzure = {
    state: null,
    options: {},
    fullUri: null,
    redirectUri: '/public/azure_redirect.html',
    msalObj: null,
    loginScopes: ['user.read', 'profile', 'openid', 'offline_access'],

    Init: function () {},

    useMsal: function () {
        if (this.options.azureMSALv2 && !isCordova()) return true;
    },

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

    popupWin: null,
    tryToOpenPopup(loginHint) {
        if (this.popupWin && !this.popupWin.closed && typeof this.popupWin.close === 'function') {
            this.popupWin.close();
        }

        if (isElectron()) {
            let popupTargetUrl = this._loginUrl(loginHint);
            return new Promise(async (resolve, reject) => {
                let popWindow = await window.desktop.openBrowser(popupTargetUrl);
                resolve(popWindow);
            });
        } else {
            this.popupWin = createPopupWindow(this._loginUrl(loginHint), 'neptune-azure-login-popup', 438, 600);

            // if we are unable to open the popup
            if (!this.popupWin) {
                sap.m.MessageBox.show('Unable to create the popup window for Azure login.', {
                    icon: sap.m.MessageBox.Icon.INFORMATION,
                    title: "Azure Login",
                });
                return false;
            }

            return true;
        }
    },

    Logon: function (loginHint) {
        this.options = getAuthSettingsForUser();
        if (this.useMsal()) {
            this._loginMsal();
            return;
        }

        this.state = Date.now();

        if (isElectron()) {
            this.tryToOpenPopup(loginHint).then((logElectron) => {
                return this.LogonElectron(logElectron);
            });
        } else {
            if (!this.tryToOpenPopup(loginHint)) {
                appCacheError(`Logon Azure > unable to open popup window to login - ${loginHint}`)
                return;
            }

            if (isCordova()) {
                return this.LogonCordova();
            }
            
            this.LogonDesktop();
        }
    },

    onLogonPopupClose: function () {
        appCacheLog(`Azure/Logon popup has been closed`);
    },

    LogonElectron: function (d) {
        const authResponse = getHashParamsFromUrl(d);
        console.log(authResponse);
        this._getToken(authResponse);
    },

    LogonCordova: function() {
        const readSearchResponse = (url) => {
            const authResponse = getHashParamsFromUrl(url[0]);

            if (authResponse && authResponse.prompt === 'select_account') {
                appCacheLog(`Azure/Logon reached account login selection screen`);
                return;
            }

            if (authResponse) {
                appCacheLog('LoadStop: Got search response');
                appCacheLog('authResponse', authResponse);

                // Error
                if (authResponse.error) {
                    this.popupWin.close();
                    sap.m.MessageToast.show(authResponse.error);
                    sap.ui.core.BusyIndicator.hide();
                    return;
                }

                if (authResponse.state && authResponse.code) {
                    this.popupWin.close();

                    // Prevent cross-site request forgery attacks
                    if (parseInt(authResponse.state) !== this.state) {
                        sap.m.MessageToast.show('Cross-site request forgery detected');
                        return;
                    }

                    // Request Access/Refresh Tokens 
                    this._getToken(authResponse);
                }
            } else {
                appCacheLog('LoadStop: Got NO search response');
                appCacheLog('authResponse', JSON.stringify(authResponse));
                this.popupWin.close();
            }
        }

        const onLoadStop = () => {
            this.popupWin.executeScript({ code: 'location.search' }, readSearchResponse);
        }
        
        this.popupWin.addEventListener('loadstop', onLoadStop);
        this.popupWin.addEventListener('exit', this.onLogonPopupClose);
    },

    LogonDesktop: function(loginHint) {
        try {
            this.popupWin.addEventListener('unload', this.onLogonPopupClose);
        } catch (err) {
            console.error('LogonDesktop, unable to monitor unload event', err);
        }

        if (location.protocol === 'file:') {
            sap.m.MessageToast.show('Testing Microsoft Entra ID from file is not allowed due to CSRF issues. Please test in mobile app');
            this.popupWin.close();
            return;
        }

        if (this.popupWin.focus) this.popupWin.focus();

        watchPopupState(this.popupWin, ['code'], ['state', 'nonce'], (url) => {
            const authResponse = getHashParamsFromUrl(url);
            if (!authResponse) {
                appCacheLog('No token response, or window closed manually');
                return;
            }

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
        });
    },

    GetTokenPopup: function (request) {
        appCacheLog(`Azure.GetTokenPopup: trying to acquire token silently`)
        return this.msalObj.acquireTokenSilent(request).catch((err) => {
            appCacheLog(`Azure.GetTokenPopup: failed to acquire token silently`)

            if (err instanceof msal.InteractionRequiredAuthError) {
                return this.msalObj.acquireTokenPopup(request).then(tokenResponse => {
                    appCacheLog(`Azure.GetTokenPopup: ${tokenResponse}`)
                    return tokenResponse;
                }).catch(err => {
                    appCacheError(`Azure.GetTokenPopup: ${err}`);
                });
            } else {
                appCacheError(`Azure.GetTokenPopup: ${err}`);
            }
        });
    },

    Signout: function () {
        if (isOffline()) return;
        
        if (this.options.azureSilentSignout) {
            let signoutFrame = document.getElementById('azureSignout');
            if (signoutFrame) signoutFrame.setAttribute('src', 'https://login.microsoftonline.com/common/oauth2/logout');
            setTimeout(()=> p9UserLogout('Azure'), 1000);
        } else {
            externalAuthUserLogoutUsingPopup('https://login.microsoftonline.com/common/oauth2/logout', 1000).then(() => {
                p9UserLogout('Azure');
            });
        }

        localStorage.removeItem('p9azuretoken');
        localStorage.removeItem('p9azuretokenv2');
    },
    
    Relog: function (refreshToken, process) {
        this.options = getAuthSettingsForUser();
        if (this.useMsal() && !this.msalObj) {
            this.InitMsal().then(() => {
                this._refreshToken(refreshToken, process);
            });
        } else {
            this._refreshToken(refreshToken, process);
        }
    },

    Logoff: function () {
        this.Signout();
        p9UserLogout('Azure');
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

    getFullUri: function () {
        if (!this.fullUri) {
            return AppCache.Url || location.origin;
        }

        return this.fullUri;
    },

    _authUrl: function (endPoint) {
        return 'https://login.microsoftonline.com/' + this.options.tenantId + '/oauth2/v2.0/' + endPoint;
    },

    _loginUrl: function (loginHint) {
        let data = {
            client_id: this.options.clientID,
            redirect_uri: this.getFullUri() + this.redirectUri,
            scope: this.loginScopes.join(' '),
            // nonce: ModelData.genID(),
            state: this.state,
            prompt: 'select_account',
            response_type: 'code'
        };

        if (loginHint) {
            data.login_hint = loginHint;
        }

        return this._authUrl('authorize') + '?' + serializeDataForQueryString(data);
    },

    _logoutUrl: function () {
        let data = {
            post_logout_redirect_uri: this.getFullUri() + this.redirectUri
        };

        return this._authUrl('logout') + '?' + serializeDataForQueryString(data);
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
        AppCache.userInfo.azureUser = parseJsonWebToken(AppCache.userInfo.azureToken.idToken);

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

        // Auto re-login 
        let expire_in_ms = (data.expires_in * 1000) - 120000;

        AppCache.userInfo.azureToken = data;
        AppCache.userInfo.azureUser = parseJsonWebToken(AppCache.userInfo.azureToken.id_token);

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

        appCacheLog('Azure: User Data');
        appCacheLog(AppCache.userInfo);
        return;
    },

    _getToken: function (response) {
        appCacheLog('Azure: Get Token');

        const data = {
            client_id: this.options.clientID,
            redirect_uri: this.getFullUri() + this.redirectUri,
            scope: this.loginScopes.join(' '),
            code: response.code,
            grant_type: 'authorization_code',
        };
        const { type, path } = this.options;
        return request({
            type: 'POST',
            url: `${this.getFullUri()}/user/logon/${type}/${path}/${encodeURIComponent(this._authUrl('token'))}`,
            contentType: 'application/x-www-form-urlencoded',
            data: data,
            success: (data) => {
                if (data && !data.refresh_token) {
                    sap.m.MessageToast.show('Error getting refresh_token from Azure. Add scope offline_access in authentication configuration');
                    appCacheError('Azure Logon: Error getting refresh_token. Add scope offline_access in authentication configuration');
                    return;
                }

                appCacheLog("Azure: 'refresh_token' received");
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
        appCacheLog('Azure: Refresh token MSAL');

        refreshingAuth = true;
        const { username, email } = AppCache.userInfo;
        let account = this.msalObj.getAccountByUsername(username);
        if (!account && email) {
            account = this.msalObj.getAccountByUsername(email);
        }

        this.GetTokenPopup({ scopes: this.loginScopes, account }).then((azureToken) => {
            refreshingAuth = false;

            if (this.options.scope) {
                refreshingAuth = true;
                this.GetTokenPopup({ scopes: this.options.scope.split(' '), account }).then((resourceToken) => {
                    refreshingAuth = false;
                    this._onTokenReadyMsal(azureToken, resourceToken);
                    if (userIsNotLoggedIn()) this._loginP9(azureToken.idToken, process);
                });
            } else {
                this._onTokenReadyMsal(azureToken);
                if (userIsNotLoggedIn()) this._loginP9(azureToken.idToken, process);
            }
        }).catch((error) => {
            refreshingAuth = false;
            let errorText = 'Error getting refreshToken (msal) from Microsoft Entra ID';
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
                url: `${this.getFullUri()}/user/logon/${type}/${path}/${encodeURIComponent(this._authUrl('token'))}`,
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
            url: `${this.getFullUri()}/user/logon/${type}/${path}/${encodeURIComponent(this._authUrl('token'))}`,
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
                    if (AppCache.enablePasscode && process === 'pin') {
                        this._loginP9(data.id_token, process);
                    }
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
            headers: { 'Authorization': 'Bearer ' + idToken, 'login-path': getLoginPath() },
            success: (data) => {
                refreshingAuth = false;
                AppCache.clearLoadQueueAfterAuthRefresh();

                switch (process) {
                    case 'pin':
                        appCacheLog(`Azure Logon: Successfully logged on to P9. Starting process: ${process}`);

                        // Start App
                        NumPad.attempts = 0;
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
            error: (result, status) => {
                refreshingAuth = false;
                sap.ui.core.BusyIndicator.hide();
                let errorText = 'Error logging on P9, or P9 not online';
                if (result.responseJSON && result.responseJSON.status) errorText = result.responseJSON.status;
                appCacheLog(errorText);
                if (result.status === 0) onOffline();

                if (errorText.startsWith("nonce mismatch") && !AppCache.isOffline) {
                    setTimeout(() => {
                        AppCache.Update();
                    }, 100);
                }
            }
        });
    },
};