sap.n.Utils = {
    message: function (config) {
        let title = config.title || 'Message';
        let intro = config.intro || '';
        let text1 = config.text1 || '';
        let text2 = config.text2 || '';
        let text3 = config.text3 || '';
        let icon = config.icon || '';

        objHeaderMessage.setTitle(title);
        objHeaderMessage.setIntro(intro);
        txtMessage1.setText(text1);
        txtMessage2.setText(text2);
        txtMessage3.setText(text3);
        acceptMessage.setText(config.acceptText);
        declineMessage.setText(config.declineText);

        txtMessage1.setVisible(!!text1);
        txtMessage2.setVisible(!!text2);
        txtMessage3.setVisible(!!text3);

        if (config.acceptText) {
            diaMessage.setBeginButton(acceptMessage);
        }
        
        if (config.declineText) {
            diaMessage.setEndButton(declineMessage);
        }

        switch (config.state) {
            case 'Error':
                objHeaderMessage.setIcon('sap-icon://fa-solid/exclamation-circle');
                objHeaderMessage.addStyleClass('nepStateError');
                break;

            case 'Warning':
                objHeaderMessage.setIcon('sap-icon://fa-solid/exclamation-circle');
                objHeaderMessage.addStyleClass('nepStateWarning');
                break;

            case 'Success':
                objHeaderMessage.setIcon('sap-icon://fa-solid/info-circle');
                objHeaderMessage.addStyleClass('nepStateSuccess');
                break;

            default:
                objHeaderMessage.setIcon('sap-icon://fa-solid/info-circle');
                break;
        }

        if (icon) {
            objHeaderMessage.setIcon(icon);
        }

        diaMessage.onClose = config.onClose || function () { };
        diaMessage.onAccept = config.onAccept || function () { };
        diaMessage.onDecline = config.onDecline || function () { };
        diaMessage.open();
    },

    setupLoginScreen: function () {
        AppCache_butLogon.setVisible(true);

        // hide fields
        [AppCache_inUsername, AppCache_inPassword, AppCache_inRememberMe, AppCache_inShowPass].forEach(field => field.setVisible(false));

        // clear field statuses
        [AppCache_inUsername, AppCache_inPassword].forEach(field => field.setValueState());

        const { type: authType } = getAuthSettingsForUser();
        if (['azure-bearer', 'openid-connect', 'saml'].includes(authType)) {
            AppCache_inUsername.setVisible(false);
            AppCache_inPassword.setVisible(false);
        } else if (authType === 'ldap') {
            AppCache_inUsername.setVisible(true);
            AppCache_inPassword.setVisible(true);
            AppCache_inShowPass.setVisible(true);
        } else if (['local', 'sap'].includes(authType)) {
            if (!AppCache.enablePasscode) AppCache_inRememberMe.setVisible(true);
            AppCache_inUsername.setVisible(true);
            AppCache_inPassword.setVisible(true);
            AppCache_inShowPass.setVisible(true);
        }
    }
}