function isPincodeValid(v) {
    const validity = {
        isValid: true,
        errorMessage: ''
    };

    // Enhancement
    if (sap.n.Enhancement.PinCodeValidation) {
        try {
            sap.n.Enhancement.PinCodeValidation(v, validity);
        } catch (e) {
            appCacheError('Enhancement PinCodeValidation ' + e);
        }
    }

    const { isValid, errorMessage } = validity;

    return {
        isValid: isValid && /^[0-9]+$/.test(v) && v.length === AppCache.passcodeLength,
        errorMessage: isValid ? '' : errorMessage
    };
}

function sanitizePincode(v) {
    return v.replace(/[^0-9]/g, '');
}

function pincodeEntryErrs() {
    const len = AppCache.passcodeLength;
    const criteria = `Valid pin is numeric and consists of only ${len} digits.`;
    return {
        setPin: `Set Pin is invalid. ${criteria}`,
        repeatPin: `Repeat Pin is invalid. ${criteria}`,
        newPasscode: AppCache_tEnterNewPasscode.getText(),
        repeatPasscode: AppCache_tEnterRepeatPasscode.getText(),
        passcodeTooShort: `${AppCache_tPasscodeToShort.getText()} (${len})`,
        passcodeNoMatch: AppCache_tNoPasscodeMatch.getText(),
    };
}

function showPincodeError(msg, input = null) {
    if (input) input.setValueState('Error');
    sap.m.MessageToast.show(msg, {
        onClose: function () {
            if (input) input.setValueState('None');
        }
    });
}

function onPasscode1Submit() {
    if (!isPincodeValid(AppCache_inPasscode1.getValue()).isValid) {
        const customError = isPincodeValid(AppCache_inPasscode1.getValue()).errorMessage;
        return showPincodeError(customError || pincodeEntryErrs().setPin, AppCache_inPasscode1);
    }

    AppCache_inPasscode1.setValueState('None');
    AppCache_inPasscode2.focus();
}

function onPasscode2Submit() {
    if (!isPincodeValid(AppCache_inPasscode2.getValue()).isValid) {
        const customError = isPincodeValid(AppCache_inPasscode2.getValue()).errorMessage;
        return showPincodeError(customError || pincodeEntryErrs().repeatPin, AppCache_inPasscode2);
    }

    AppCache_inPasscode2.setValueState('None');
    return AppCache_butPasscode.firePress();
}

const NumPad = {
    numValue: '',
    Verify: false,
    attempts: 0,

    ref: function () {
        return document.getElementById('AppCache_boxPasscodeEntry');
    },

    addEvent: function (type, fn) {
        const el = this.ref();
        if (!el) return;

        el.addEventListener(type, fn);
    },

    removeEvent: function (type, fn) {
        const el = this.ref();
        if (!el) return;

        el.removeEventListener(type, fn);
    },

    keydown: function (evt) {
        const { key } = evt;
        if (['Delete', 'Backspace'].includes(key)) {
            butNumpadClear.firePress();
            return;
        }

        if (Number.isNaN(Number.parseInt(key))) {
            return;
        }

        NumPad.enterKey(key);
    },

    KeypressHandlerSet: function () {
        this.addEvent('keydown', NumPad.keydown);
    },

    KeypressHandlerRemove: function () {
        this.removeEvent('keydown', NumPad.keydown);
    },

    enterKey: function (keyValue) {
        try {
            if (Number.isNaN(Number.parseInt(keyValue))) {
                return;
            }
        } catch (err) { return; }
        
        // only purpose of these checkboxes is to keep count
        // on how many characters have been entered
        const checkboxes = [
            Passcode1, Passcode2, Passcode3, Passcode4,
            Passcode5, Passcode6, Passcode7, Passcode8,
        ];

        let count = 0;
        for (let i = 0; i < AppCache.passcodeLength; i++) {
            const cb = checkboxes[i];
            
            if (cb.getSelected()) {
                count += 1;
            } else {
                cb.setSelected(true);
                NumPad.numValue += keyValue;
                count += 1;
                break;
            }
        }

        if (count >= AppCache.passcodeLength) {
            NumPad.setPasscodeBusy(true);
            requestAnimationFrame(() => {
                setTimeout(function () {
                    NumPad.Logon();
                }, 50);
            });
        }
    },

    setPasscodeBusy: function (enabled) {
        if (!enabled) {
            sap.ui.core.BusyIndicator.hide();
        } else {
            sap.ui.core.BusyIndicator.show(0);
        }
    },

    Clear: function () {
        NumPad.numValue = '';

        [
            Passcode1, Passcode2, Passcode3, Passcode4,
            Passcode5, Passcode6, Passcode7, Passcode8,
        ].forEach(function (cb) {
            cb.setSelected(false);
        });

        if (typeof window.cordova !== 'undefined' && !window.navigator.simulator && AppCache.biometricAuthentication) {
            butNumpadLogin.setEnabled(AppCache.biometricAuthentication);
        }
    },

    Logon: function () {
        appCacheLog(`NumPad.Logon: Starting with auth ${AppCache.Encrypted}`);
        
        if (!AppCache.Encrypted) {
            appCacheLog('NumPad.Logon: No auth found');
            appCacheLog(AppCache.userInfo);

            if (AppCache.userInfo.auth) {
                AppCache.Encrypted = AppCache.userInfo.auth;
            } else {
                NumPad.Clear();
                NumPad.setPasscodeBusy(false);
                AppCache.Logout();
                sap.m.MessageToast.show(AppCache_tNoUserInfo.getText());
                sap.ui.core.BusyIndicator.hide();
                return;
            }
        }

        // Decrypt with Passcode
        let auth = '';
        try {
            const key = generatePBKDF2Key(NumPad.numValue, AppCache.deviceID);
            auth = decryptAES(AppCache.Encrypted, key.toString());
        } catch (err) {
            NumPad.setPasscodeBusy(false);
            appCacheLog('NumPad.Logon: decryption error');
        }

        if (auth === '') {
            // invalid pincode entry count
            NumPad.attempts++;
            NumPad.Clear();

            const allowedAttempts = parseInt(AppCache.numPasscode)

            if (NumPad.attempts >= allowedAttempts) {
                NumPad.attempts = 0;
                NumPad.setPasscodeBusy(false);
                AppCache.Logout();
                AppCache.RemoveAllCache();
                return;
            }

            if (navigator.notification && navigator.notification.vibrate) navigator.notification.vibrate(250);
            boxNumpad02.addStyleClass('animated shake');

            sap.m.MessageBox.error(AppCache_tWrongPin.getText(), {
                onClose: () => {
                    butNumpad1.focus();
                },
            });

            setTimeout(function () {
                boxNumpad02.removeStyleClass('animated shake');
            }, 500);

            NumPad.setPasscodeBusy(false);
            return;
        }

        appCacheLog('NumPad.Logon: PIN Code OK');

        AppCache.userInfo.authDecrypted = auth;
        AppCache.updateUserLoginTime();
        sap.ui.core.BusyIndicator.show(0);

        sap.n.Launchpad.handleAppTitle(AppCache.launchpadTitle);

        // Re-Logon 
        if (AppCache.isOffline) {
            appCacheLog('NumPad.Logon: Starting in offline mode');

            // Clear
            NumPad.attempts = 0;
            NumPad.Clear();
            NumPad.Verify = true;

            // Start App
            AppCache.Encrypted = '';
            AppCache.Update();

            AppCacheShellUser.setEnabled(true);
            AutoLockTimer.start();
        } else {
            appCacheLog('NumPad.Logon: Starting in online mode');

            const { type: authType } = getAuthSettingsForUser();
            if (authType === 'saml') {
                AppCacheLogonSaml.Relog(auth)
            } else if (authType === 'openid-connect') {
                AppCacheLogonOIDC.Relog(auth)
            } else if (authType === 'azure-bearer') {
                AppCacheLogonAzure.Relog(auth)
            }

            if (['saml', 'openid-connect', 'azure-bearer'].includes(authType)) {
                AutoLockTimer.start();
                AppCacheShellUser.setEnabled(true);
                return;
            }

            const actions = [];
            if (authType === 'local') actions.push(AppCacheLogonLocal.Relog(auth));
            else if (authType === 'ldap') actions.push(AppCacheLogonLdap.Relog(auth));
            else if (authType === 'sap') actions.push(AppCacheLogonSap.Relog(auth));

            // Build Data
            Promise
                .all(actions)
                .then(function (values) {
                    // Check if OK 
                    if (values[0] === 'OK') {
                        // Clear
                        NumPad.attempts = 0;
                        NumPad.Clear();
                        NumPad.Verify = true;

                        // Start App
                        AppCache.Encrypted = '';
                        AppCache.Update();

                        AppCacheShellUser.setEnabled(true);

                        // ensures non-usage of launchpad locks the screen
                        AutoLockTimer.start();
                    } else {
                        NumPad.attempts = 0;
                        NumPad.Clear();
                        NumPad.Verify = false;

                        sap.m.MessageToast.show(AppCache_tWrongUserNamePass.getText());
                        AppCache.Logout();
                    }
                }).catch(() => {
                    NumPad.setPasscodeBusy(false);
                });
        }
    }
};