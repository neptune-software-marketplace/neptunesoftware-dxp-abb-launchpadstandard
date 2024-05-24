sap.n.Enhancement = {
    spots: [
        {
            title: 'Global Functions',
            name: 'global',
            description: 'Reuse global functions declared in this enhancement spot. Use the object sap.n.Enhancement.global for methods/data',
            param: '',
            sort: 10,
            group: 'Common'
        },
        {
            title: 'Before Startup',
            name: 'BeforeStartup',
            description: 'Triggers after UI5 is loaded but before Startup of desktop/mobile',
            param: '',
            sort: 20,
            group: 'Common'
        },
        {
            title: 'After Get Tiles',
            name: 'SuccessGetMenu',
            description: 'Triggers after GetTiles request and before tiles/tile groups is re-rendered if changes are detected in tiles/tile groups',
            param: '',
            sort: 40,
            group: 'Common'
        },
        {
            title: 'After Tile Group Renderer',
            name: 'AfterTileGroupRenderer',
            description: 'Triggers after Tile Group is rendered',
            param: 'Container, dataCat',
            sort: 50,
            group: 'Common'
        },
        {
            title: 'Before Logout',
            name: 'BeforeLogout',
            description: 'Triggers right after user starts the logout process.',
            param: 'authType',
            sort: 51,
            group: 'Common'
        },
        {
            title: 'After Logout',
            name: 'AfterLogout',
            description: 'Triggers when a logout process finishes successfully.',
            param: 'authType',
            sort: 52,
            group: 'Common'
        },
        {
            title: 'Set User Info',
            name: 'setUserInfo',
            description: 'Triggers when we set username in the launchpad',
            param: '',
            sort: 32,
            group: 'Common'
        },
        {
            title: 'After Update',
            name: 'AfterUpdate',
            description: 'Triggers after AppCache.Update is done',
            param: '',
            sort: 31,
            group: 'Common'
        },
        {
            title: 'Before Update',
            name: 'BeforeUpdate',
            description: 'Triggers before AppCache.Update is started and tiles/tile groups is rendered for the first time. Supports Promise',
            param: '',
            sort: 30,
            group: 'Common'
        },
        {
            title: 'Restricted Enable',
            name: 'RestrictedEnable',
            description: 'Triggers after user lock/logout',
            param: '',
            sort: 220,
            group: 'Mobile/PWA'
        },
        {
            title: 'Restricted Disable',
            name: 'RestrictedDisable',
            description: 'Triggers after unlock/login before AppCache.Update',
            param: '',
            sort: 210,
            group: 'Mobile/PWA'
        },
        {
            title: 'Before Lock',
            name: 'BeforeLock',
            description: 'Triggers before user is logged out when locking the user. Can be used to logoff user in other systems',
            param: 'authType',
            sort: 201,
            group: 'Mobile/PWA'
        },
        {
            title: 'Before Set Settings',
            name: 'BeforeSetSettingsMobile',
            description: 'Triggers before applying settings from server or cache',
            param: 'settings',
            sort: 200,
            group: 'Mobile/PWA'
        },
        {
            title: 'Clear Cookies',
            name: 'ClearCookies',
            description: 'Add your own logic when clearing cookies',
            param: '',
            sort: 290,
            group: 'Mobile/PWA'
        },
        {
            title: 'Push Notification',
            name: 'PushNotification',
            description: 'Triggers when receiving push notification when the launchpad is started and in foreground',
            param: 'notification',
            sort: 110,
            group: 'Push Notifications'
        },
        {
            title: 'Push Registration',
            name: 'PushRegistration',
            description: 'Triggers when browser/device register for push notification',
            param: 'dataDevice',
            sort: 100,
            group: 'Push Notifications'
        },
        {
            title: 'Hash Navigation',
            name: 'HashNavigation',
            description: 'Intercept and add you logic when the Launchpad detects hash navigation',
            param: 'hash',
            sort: 900,
            group: 'Events'
        },
        {
            title: 'Tile Click',
            name: 'TileClick',
            description: 'Event when tile is clicked, use for custom analytics or other',
            param: 'dataTile',
            sort: 910,
            group: 'Events'
        },
        {
            title: 'Remote System Authentication',
            name: 'RemoteSystemAuth',
            description: 'When using tile from remote system you can add custom header fields',
            param: 'headers',
            sort: 800,
            group: 'Authentication'
        },
        {
            title: 'Pin Code Validation',
            name: 'PinCodeValidation',
            description: 'Called when validating the pin code that the user is attempting to set',
            param: 'pincode, validity',
            sort: 1000,
            group: 'Mobile/PWA'
        }
    ],

    getSpots: function () {
        window.parent.postMessage({ spots: sap.n.Enhancement.spots }, location.href);
    }
};