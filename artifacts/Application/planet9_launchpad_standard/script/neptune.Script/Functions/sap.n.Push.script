sap.n.Push = {
    messsaging: null,
    firebaseSetup: function () {
        cordova.plugins.firebase.messaging.requestPermission().then(function () {
            appCacheLog('FireBase Messaging: Push messaging is allowed');

            cordova.plugins.firebase.messaging.getToken().then(function (token) {
                appCacheLog(`FireBase Messaging: Got token ${token}`);

                let system = sap.n.Launchpad.deviceType();
                let deviceData = {
                    token: token,
                    launchpadId: AppCache.launchpadID,
                    browserName: sap.ui.Device.browser.name,
                    browserVersion: sap.ui.Device.browser.version,
                    osName: sap.ui.Device.os.name,
                    osVersion: sap.ui.Device.os.version,
                    system: system
                };

                // Enhancement
                if (sap.n.Enhancement.PushRegistration) {
                    try {
                        sap.n.Enhancement.PushRegistration(deviceData);
                    } catch (e) {
                        appCacheError('Enhancement PushRegistration ' + e);
                    }
                }

                jsonRequest({
                    url: AppCache.Url + '/messaging/register',
                    data: JSON.stringify(deviceData),
                    success: function (data) {
                        localStorage.setItem('pushRegistered', true);
                    },
                    error: function (result, status) {
                        localStorage.setItem('pushRegistered', false);
                        if (result.responseJSON && result.responseJSON.status) {
                            sap.m.MessageToast.show(result.responseJSON.status);
                        }
                    }
                });
            });
        });

        cordova.plugins.firebase.messaging.onMessage(function (payload) {
            // Enhancement
            if (sap.n.Enhancement.PushNotification) {
                try {
                    sap.n.Enhancement.PushNotification(payload);
                } catch (e) {
                    appCacheError('Enhancement PushNotification ' + e);
                }
            }
        });

    },

    setupPush: function () {
        if (cordova.plugins.firebase && cordova.plugins.firebase.messaging) {
            sap.n.Push.firebaseSetup();
            return;
        }

        if (typeof PushNotification === 'undefined') {
            console.log('PushNotification plugin not installed');
            return;
        }

        let push = PushNotification.init({
            'android': {
                'senderID': AppCache.pushSenderId
            },
            'browser': {},
            'ios': {
                'sound': true,
                'vibration': true,
                'badge': true
            },
            'windows': {}
        });

        push.on('registration', function (data) {
            let system = sap.n.Launchpad.deviceType();
            let deviceData = {
                token: data.registrationId,
                launchpadId: AppCache.launchpadID,
                browserName: sap.ui.Device.browser.name,
                browserVersion: sap.ui.Device.browser.version,
                osName: sap.ui.Device.os.name,
                osVersion: sap.ui.Device.os.version,
                system: system
            };

            // Enhancement
            if (sap.n.Enhancement.PushRegistration) {
                try {
                    sap.n.Enhancement.PushRegistration(deviceData);
                } catch (e) {
                    appCacheError('Enhancement PushRegistration ' + e);
                }
            }

            jsonRequest({
                url: AppCache.Url + '/messaging/register',
                data: JSON.stringify(deviceData),
                success: function (data) {
                    localStorage.setItem('pushRegistered', true);
                },
                error: function (result, status) {
                    localStorage.setItem('pushRegistered', false);
                    if (result.responseJSON && result.responseJSON.status) {
                        sap.m.MessageToast.show(result.responseJSON.status);
                    }
                }
            });
        });

        push.on('error', function (e) {
            console.error('push error = ' + e.message);
        });

        push.on('notification', function (data) {
            // Enhancement
            if (sap.n.Enhancement.PushNotification) {
                try {
                    sap.n.Enhancement.PushNotification(data);
                } catch (e) {
                    appCacheError('Enhancement PushNotification ' + e);
                }
            }

            if (sap.ui.Device.os.name === 'iOS') {
                push.setApplicationIconBadgeNumber(function () {
                    console.log('Badge: success');
                }, function () {
                    console.log('Badge: error');
                }, data.count);
            }
        });
    }
};