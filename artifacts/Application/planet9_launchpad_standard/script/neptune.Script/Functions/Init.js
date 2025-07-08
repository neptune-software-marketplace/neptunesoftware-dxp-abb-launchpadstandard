// Globals
let dataSet = 'Launchpad';
let currFav = [];
let currTiles = [];
let currCategory = [];
let currCategoryChild = [];
let deviceType;
let parentObject;
let cacheLoaded = 0;
let searchCancelItemPress = false;
let navBarTimeout;
let screenSplit = 1300;
let enableFavDnD = false;

// e.g. during Azure refresh token, cookie-session get's updated. If any
//  app or api call is made during this timeframe, it will log user out.
//  refreshingAuth is a generic flag set to indicate when some auth change
//  is in process.
let refreshingAuth = false;

clearSAPCookies();

// Get URL Parameters
let params = {};
if (location.search) {
    let parts = location.search.substring(1).split('&');
    for (let i = 0; i < parts.length; i++) {
        let nv = parts[i].split('=');
        if (!nv[0]) continue;
        params[nv[0]] = nv[1];
    }
}

// TNT Icons
sap.ui.core.IconPool.registerFont({
    collectionName: 'tnt',
    fontFamily: 'SAP-icons-TNT',
    fontURI: sap.ui.require.toUrl('sap/tnt/themes/base/fonts'),
    lazy: false
});

// Wrapper for OnInit Event
sap.ui.getCore().attachInit(function () {
    if ('serviceWorker' in navigator) {
        setTimeout(() => {
            setCachablePwaResources();
            ensurePWACache();
        }, 2000);
    }

    sap.ui.core.BusyIndicator.hide();

    // Enhancement
    if (params['getEnhancement'] === 'true') sap.n.Enhancement.getSpots();

    // New IOS devices detected as Mac
    if (isCordova() && sap.ui.Device.os.name === 'mac') sap.ui.Device.os.name === 'iOS';

    // Load Library
    try {
        [
            'sap.ui.core.format.DateFormat',
            'sap.ui.core.format.NumberFormat',
            'sap.ui.core.format.FileSizeFormat',
            'sap.m.MessageBox',
            'sap.ui.thirdparty.jqueryui.jquery-ui-core',
            'sap.ui.thirdparty.jqueryui.jquery-ui-sortable',
            'sap.ui.thirdparty.jqueryui.jquery-ui-widget',
        ].forEach(function (name) {
            jQuery.sap.require(name);
        });
    } catch (e) {
        console.error('error loading library', e);
    }

    // Hash Navigation - Clear topmenu/sections
    if (isSection(location.hash)) location.hash = '';

    // Detect URL Parameters 
    if (params['isMobile'] === 'true') AppCache.isMobile = true;
    if (params['mobileClient']) AppCache.mobileClient = params['mobileClient'];

    // Add Check for Opera 
    sap.ui.Device.browser.BROWSER.OPERA = "op";
    if (navigator.userAgent.indexOf('Opera') > -1 || navigator.userAgent.indexOf('OPR') > -1) sap.ui.Device.browser.name = 'op';

    // Check for Layout from localStorage
    let newLayout = localStorage.getItem(AppCache.AppID + '.layout');

    if (newLayout) {
        try {
            AppCache.layout = JSON.parse(newLayout);
        } catch (e) {
            console.error('Error parsing layout');
        }
    }

    // UI Settings Mobile/Desktop
    if (sap.n.Launchpad.isPhone()) {
        AppCacheDiaSettings.setStretch(true);
        diaText.setStretch(true);
    }

    // Event When changing Theme
    sap.n.Launchpad.applyThemeMode();

    sap.ui.getCore().attachThemeChanged(function () {
        sap.n.Launchpad.applyThemeMode();
    });

    sap.ui.Device.resize.attachHandler(function (mParams) {
        if (mParams.width < sap.n.Launchpad.verticalMenuLimit) launchpadContentMenu.setWidth('0px');
        sap.n.Launchpad.setLaunchpadContentWidth();
    });

    launchpadOverflowClickArea.attachBrowserEvent('click', function (e) {
        sap.n.Launchpad.overflowMenuClose();
    });
    launchpadSettingsClickArea.attachBrowserEvent('click', function (e) {
        sap.n.Launchpad.settingsMenuClose();
    });

    toolVerticalMenuFilter.onAfterRendering = function () {
        const input = toolVerticalMenuFilter.getInputElement();

        if (input) {
            const attr = input.getAttribute('placeholder');
            const placeholder = toolVerticalMenuFilter.getPlaceholder() || attr;
            input.setAttribute('title', placeholder);
            input.setAttribute('label', placeholder);
        }

        this.__proto__.onAfterRendering.apply(this);
    }

    AppCachePageSideTab.onAfterRendering = function () {
        const dom = this.getDomRef();

        if (dom) {
            const input = dom.getElementsByTagName('input')[0];
            if (input) {
                input.title = 'Side App Select';
            }
        }

        this.__proto__.onAfterRendering.apply(this);
    }

    AppCacheUsers.addEventDelegate({
        onAfterRendering: () => {
            if (AppCacheUsers.getItems().length) {
                AppCacheUsers.getItems()[0].focus();
            }
        }
    });

    applyWCAGFixes();
    
    setTimeout(function () {
        if (!sap.n.Customization.isDisabled()) {
            sap.n.Customization.addCustomizableClass();
        }
        
        // Browser Title 
        if (AppCache.launchpadTitle && AppCache.launchpadTitle !== 'null') document.title = AppCache.launchpadTitle;

        // UI Settings w/StartApp
        if (AppCache.StartApp) AppCacheShellMenu.setVisible(false);

        // Sort Users
        AppCacheUsers.getBinding('items').sort(new sap.ui.model.Sorter('username', false, false))

        // Phone UI Handling
        if (sap.n.Launchpad.isPhone()) {
            [AppCache_boxLogonCenter, AppCache_boxLogonPasscode, AppCache_boxLogonUsers].forEach((box) => {
                box.setHeight('100%');
                box.addStyleClass('nepFlexPhone');
            });

            AppCache_boxLogonPasscodeEntry.setHeight('100%');

            [panLogon, panLogonPasscode, panLogonUsers, boxNumpadPanel].forEach((elm) => {
                elm.setWidth('100%');
                elm.setHeight('100%');
                elm.removeStyleClass('nepPanLogonBorder');
            });

            [panLinks, panLinksUsers, panLinksPass, panLinksPin].forEach((elm) => {
                elm.addStyleClass('nepLinks');
            });
        }

        // Models 
        modelContentMenu.setSizeLimit(5000);

        // Config 
        if (AppCache.config) {
            const { config } = AppCache;
            if (sap.n.Layout.showActiveApps() && !config.verticalMenu && !config.enableTopMenu) {
                AppCache.config.verticalMenu = false;
                AppCache.config.enableTopMenu = true;
            }

            // Settings
            if (config.languages) sap.n.Launchpad.applyLanguages(AppCache.config.languages);
            if (config.hideTopHeader && !AppCache.isMobile) topMenu.setHeight('0px');
            if (config.hideLoginSelection) AppCache_loginTypes.setVisible(false);
            if (
                config.verticalMenu &&
                sap.ui.Device.resize.width >= sap.n.Launchpad.verticalMenuLimit &&
                !AppCache.isMobile
            ) {
                sap.n.Launchpad.overflowMenuOpen();
            }

            // Enhancement
            if (config.enhancement) {
                try {
                    eval(config.enhancement);
                } catch (e) {
                    console.log(e);
                }
            }

            // Paths
            if (AppCache.config.ui5ModulePath) {
                [
                    'sap.viz', 'sap.chart', 'sap.me', 'sap.ui.comp', 'sap.ushell', 'sap.ui.fl',
                    'sap.ui.commons', 'sap.ui.ux3', 'sap.suite.ui.microchart', 'sap.suite.ui.commons',
                ].forEach(function (name) {
                    const path = AppCache.config.ui5ModulePath + '/' + name.replace(/\./g, '/');
                    jQuery.sap.registerModulePath(name, path);
                });
            }
        }

        // Get Setting or Startup
        if (AppCache.isMobile) {
            if (!isPWAEnabled()) location.hash = '';

            inAppCacheFormSettingsBACK.setVisible(false);
            AppCacheUserActionSettings.setVisible(false);

            (function () {
                function waitForCache() {
                    if (sap.n.Phonegap.loaded) {
                        getCacheDataSettings(true);
                        AppCache.getSettings();
                    } else {
                        setTimeout(waitForCache, 50);
                    }
                }
                waitForCache();
            })();
        } else {
            // Get Users Settings
            getCacheAppCacheDiaSettings(true);

            // Layout
            if (AppCache.layout) {
                ModelData.Delete(AppCache.layout, 'active', false);

                // Add to Settings
                AppCache.layout.forEach(function (data) {
                    inAppCacheFormSettingsTHEME.addItem(new sap.ui.core.Item({
                        key: data.id,
                        text: data.name
                    }));
                });

                // Override theme from URL 
                if (params['nep-ui-layout']) modelAppCacheDiaSettings.oData.userTheme = params['nep-ui-layout'];

                if (modelAppCacheDiaSettings.oData && modelAppCacheDiaSettings.oData.userTheme) {
                    sap.n.Launchpad.applyUserTheme();
                } else {
                    if (AppCache.defaultTheme) sap.ui.getCore().applyTheme(AppCache.defaultTheme);
                    sap.n.Launchpad.applyLayout(AppCache.layout[0]);
                }
            }

            const { type } = getAuthSettingsForUser();
            AppCacheUserActionChangePassword.setVisible(!isOffline() && type === 'local' && !isChpassDisabled());

            // Startup
            AppCache.Startup();
        }

        if (AppCache.enablePasscode) {
            AppCache_boxPasscodeEntry.addEventDelegate({
                onkeyup: (evt) => {
                    if (evt.key === 'Escape') {
                        AppCache.Lock();
                    }
                },
            })
        }

        // UI Settings
        topShell.setAppWidthLimited(AppCache.limitWidth);

        // Connect external Tools
        setTimeout(function () {
            AppCache.enableExternalTools();
        }, 500);

        // Assign tab indices to pinned left menu
        setTimeout(() => {
            if (AppCache.config.verticalMenu) {
                setTabIndicesForContentMenu();
            }
        }, 1000);

        if (sap.n.Layout.isVerticalMenuPinned()) {
            AppCacheShellMenu.setVisible(false);
        }
    }, 100);

    setOpenUI5Version();

    // we can wait for translations to load, since launchpad already renders in user's choosen translation
    setTimeout(fetchTranslations, 100);
    
    setTimeout(disableChpass, 2000);
    setTimeout(setiOSPWAIcons, 2000);
    setTimeout(setAccessibilityFocusIndicator, 100);
});

// Sorter Function
let sort_by = function (field, reverse, primer) {
    let key = primer ?
        function (x) {
            return primer(x[field])
        } :
        function (x) {
            return x[field]
        };
    reverse = !reverse ? 1 : -1;
    return function (a, b) {
        return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
    }
}
