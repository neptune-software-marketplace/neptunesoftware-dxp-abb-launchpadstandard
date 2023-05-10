// jQuery's global ajax error event handler - https://api.jquery.com/Ajax_Events/
jQuery(document).ajaxError(function (_event, request, _settings) {
    sap.ui.core.BusyIndicator.hide();
    if (AppCache.hideGlobalAjaxError) return;

    const code = request.status;
    if (code === 401) {
        // Not logged in -> Exit
        if (AppCache.isRestricted) return;

        // handling based on authentication method
        const r = 'refresh';
        const u = AppCache.userInfo;
        if (u && u.logonData && u.logonData.type) {
            const t = u.logonData.type;
            const decrypted = u.authDecrypted;

            if (t === 'saml') AppCacheLogonSaml.Relog(decrypted, r);
            else if (t === 'azure-bearer') AppCacheLogonAzure.Relog(decrypted, r);
            else if (t === 'openid-connect') AppCacheLogonOIDC.Relog(decrypted, r);
            else if (t === 'local') AppCacheLogonLocal.Relog(decrypted, r);
            else if (t === 'ldap') AppCacheLogonLdap.Relog(decrypted, r);
            else if (t === 'sap') AppCacheLogonSap.Relog(decrypted, r);
        }

        // AutoLogin
        if (AppCache.enableAutoLogin) AppCacheLogonLocal.Relog(decrypted, r);
    } else if ([0, 400, 404, 500].includes(code)) {
    } else {
        if (!AppCache.isOffline) {
            // sap.m.MessageToast.show(`${request.status} - ${request.statusText}`);
        } 
    }
});