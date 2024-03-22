let _reloginInProgress = false;

// jQuery's global ajax error event handler - https://api.jquery.com/Ajax_Events/
jQuery(document).ajaxError(function (_event, request, _settings) {
    sap.ui.core.BusyIndicator.hide();
    if (AppCache.hideGlobalAjaxError) return;

    const code = request.status;
    if (code === 401) {
        // to prevent infinite or multiple attempts are relogin
        if (_reloginInProgress) return;

        // Not logged in -> Exit
        if (AppCache.isRestricted) return;

        // handling based on authentication method
        const process = 'refresh';
        const user = AppCache.userInfo;
        if (user) {
            const { type } = getAuthSettingsForUser();
            const decrypted = user.authDecrypted;

            // if decryption fails we have nothing for relogin
            if (typeof decrypted === 'undefined') return;

            _reloginInProgress = true;
            if (type === 'saml') AppCacheLogonSaml.Relog(decrypted, process);
            else if (type === 'azure-bearer') AppCacheLogonAzure.Relog(decrypted, process);
            else if (type === 'openid-connect') AppCacheLogonOIDC.Relog(decrypted, process);
            else if (type === 'local') AppCacheLogonLocal.Relog(decrypted, process);
            else if (type === 'ldap') AppCacheLogonLdap.Relog(decrypted, process);
            else if (type === 'sap') AppCacheLogonSap.Relog(decrypted, process);
            
            setTimeout(()=> {
                _reloginInProgress = false;
            }, 1000);

            // if auto-login is enabled and control ends below it would try to login using local login, which might not be desired
            return;
        }

        // AutoLogin
        if (AppCache.enableAutoLogin) AppCacheLogonLocal.Relog(decrypted, process);
    } else if ([0, 400, 404, 500].includes(code)) {
        appCacheError(`global ajaxError, with status code: ${code}`, _settings.url);
    } else {
        if (!AppCache.isOffline) {
            appCacheLog(`${request.status} - ${request.statusText}`);
            // sap.m.MessageToast.show(`${request.status} - ${request.statusText}`);
        } 
    }
});