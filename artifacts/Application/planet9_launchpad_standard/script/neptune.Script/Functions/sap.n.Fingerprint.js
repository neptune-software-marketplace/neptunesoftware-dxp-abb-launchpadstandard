function isBasicAuthSetupInvalid() {
    return (
        typeof cordova === 'undefined' ||
        typeof cordova.plugins === 'undefined' ||
        typeof cordova.plugins.SecureKeyStore === 'undefined' ||
        window.navigator.simulator ||
        !AppCache.biometricAuthentication
    )
}

function isFaceIDAvailableOnIPhone() {
    return (
        sap.ui.Device.os.ios &&
        sap.ui.Device.os.version >= 11 &&
        device && device.model && device.model.indexOf('iPhone10') > 0
    );
}

function loginUserWithInfo(userInfo) {
    AppCache_inUsername.setValue(userInfo.username);
    AppCache_inPassword.setValue(userInfo.password);
    AppCache_loginTypes.setSelectedKey(userInfo.loginid);
    AppCache_butLogon.firePress();
}

function setBiometricAuthToFalse() {
    AppCache.biometricAuthentication = false;
}

function setKeypadBtnIcon(name) {
    butNumpadLogin.setIcon(`sap-icon://${name}`);
}

function setKeypadBtn(iconName, enabled) {
    setKeypadBtnIcon(iconName);
    butNumpadLogin.setEnabled(enabled);
}

function setKeypadValueAndAttemptLogin(value) {
    NumPad.numValue = value;
    NumPad.Logon();
}

function isErrorFingerprintCancelled(err) {
    return err === FingerprintAuth.ERRORS.FINGERPRINT_CANCELLED;
}

sap.n.Fingerprint = {
    android: {
        onSupported: function (res) {
            // Check hardware, enrollment and AppCacheUsers
            if (res.isAvailable && res.hasEnrolledFingerprints) {
                if (AppCache.userInfo.biometric) {
                    setKeypadBtn('mri-scan', true);

                    // Get user language
                    const pluginLanguage = sap.n.Fingerprint.android.getLanguage(getLaunchpadLanguage());

                    // Biometric authentication config
                    const decryptConfig = {
                        clientId: AppCache.AppID,
                        username: AppCache.userInfo.username,
                        token: AppCache.userInfo.token,
                        disableBackup: true,
                        maxAttempts: 5,
                        locale: pluginLanguage,
                        userAuthRequired: true,
                        dialogMessage: AppCache_Fingerprint.getText()
                    };
                    FingerprintAuth.decrypt(decryptConfig, sap.n.Fingerprint.android.onSuccess, sap.n.Fingerprint.android.onError);
                }
            }
        },

        notSupported: function (_err) {
            setKeypadBtnIcon('accept');
            setBiometricAuthToFalse();
        },

        onSuccess: function (res) {
            if ((res.withFingerprint || res.withPassword) && res.password) {
                setKeypadValueAndAttemptLogin(res.password);
            } else { }
        },

        onError: function (err) {
            if (isErrorFingerprintCancelled(err)) { } else { }
        },

        getLanguage: function (lang) {
            const m = {
                'NO': 'no',
                'FR': 'fr',
                'ES': 'es',
                'PT': 'pt',
                'DE': 'de',
                'IT': 'it',
                'EN': 'en_US',
                'ZH': 'zh',
            };

            if (m[lang] === undefined) {
                return 'en_US';
            }

            return m[lang];
        }
    },

    ios: {
        checkSupport: function () {
            if (AppCache.userInfo.biometric) {
                setKeypadBtnIcon('mri-scan');
                butNumpadLogin.setEnabled(true);

                // Authenticate using iOS SAMKeychain library
                let dialogText = AppCache_Fingerprint.getText();
                if (isFaceIDAvailableOnIPhone()) {
                    dialogText = AppCache_tEnableFaceId.getText();
                }

                CID.checkAuth(dialogText, function (res) {
                    if (res == 'success') {
                        cordova.plugins.SecureKeyStore.get(setKeypadValueAndAttemptLogin, function (err) {
                            console.log(err);
                        }, AppCache.userInfo.username);
                    } else {
                        console.log(res);
                    }
                }, function (err) {
                    console.log(err);
                });
            } else {
                setKeypadBtn('accept', false);
            }
        }
    },

    saveBasicAuth: function () {
        if (isBasicAuthSetupInvalid()) {
            return;
        }

        // Save userinfo
        cordova.plugins.SecureKeyStore.set(function (_res) { }, function (_err) {
            setBiometricAuthToFalse();
        }, AppCache.deviceID, AppCache.Auth);
    },

    getBasicAuth: function () {
        if (isBasicAuthSetupInvalid()) {
            return;
        }

        let dialogText = AppCache_Fingerprint.getText();
        if (isFaceIDAvailableOnIPhone()) {
            dialogText = AppCache_tEnableFaceId.getText();
        }

        // Any stored userinfo ? 
        cordova.plugins.SecureKeyStore.get(function (res) {
            let userInfo;
            try {
                userInfo = JSON.parse(Base64.decode(res));
            } catch (e) { }

            if (!userInfo) return;

            if (sap.ui.Device.os.android && window.FingerprintAuth) {
                try {
                    FingerprintAuth.isAvailable(function (res) {
                        if (res.isAvailable && res.hasEnrolledFingerprints) {
                            // Biometric authentication config
                            const encryptConfig = {
                                clientId: AppCache.AppID,
                                username: AppCache.deviceID,
                                password: AppCache.deviceID,
                                disableBackup: true,
                                maxAttempts: 5,
                                locale: 'en_US',
                                userAuthRequired: true,
                            };

                            // Encrypt
                            FingerprintAuth.encrypt(encryptConfig, function (result) {
                                // Encryption success
                                if (result.withFingerprint || result.withBackup) loginUserWithInfo(userInfo);
                                else setBiometricAuthToFalse();
                            }, function (err) {
                                if (!isErrorFingerprintCancelled(err)) setBiometricAuthToFalse();
                            });
                        } else {
                            setBiometricAuthToFalse();
                        }
                    }, function (_err) {
                        setBiometricAuthToFalse();
                    });
                } catch (err) {
                    setBiometricAuthToFalse();
                }
            } else if (sap.ui.Device.os.ios && typeof CID !== 'undefined') {
                CID.checkAuth(dialogText, function (res) {
                    if (res === 'success') loginUserWithInfo(userInfo);
                    else console.log(res);
                }, function (err) {
                    console.log('CID.checkAuth', err);
                    setBiometricAuthToFalse();
                });
            } else {
                setBiometricAuthToFalse();
            }

        }, function (_err) { }, AppCache.deviceID);
    }
};