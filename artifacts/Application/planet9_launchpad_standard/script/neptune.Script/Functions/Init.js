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
        ].forEach(function (name) {
            jQuery.sap.require(name);
        });
    } catch (e) { }

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
        // Browser Title 
        if (AppCache.launchpadTitle && AppCache.launchpadTitle !== 'null') document.title = AppCache.launchpadTitle;

        // UI Settings w/StartApp
        if (AppCache.StartApp) AppCacheShellMenu.setVisible(false);

        // Sort Users
        AppCacheUsers.getBinding('items').sort(new sap.ui.model.Sorter('username', false, false))

        // Phone UI Handling
        if (sap.n.Launchpad.isPhone()) {
            [AppCache_boxLogonCenter, AppCache_boxLogonPasscode, AppCache_boxLogonUsers].forEach(function (i) {
                i.setHeight('100%');
                i.addStyleClass('nepFlexPhone');
            });

            AppCache_boxLogonPasscodeEntry.setHeight('100%');

            [panLogon, panLogonPasscode, panLogonUsers, boxNumpadPanel].forEach(function (i) {
                i.setWidth('100%');
                i.setHeight('100%');
                i.removeStyleClass('nepPanLogonBorder');
            });

            [panLinks, panLinksUsers, panLinksPass, panLinksPin].forEach(function (i) {
                i.addStyleClass('nepLinks');
            });
        }

        // Models 
        modelContentMenu.setSizeLimit(5000);

        // Config 
        if (AppCache.config) {
            const c = AppCache.config;
            
            // Launchpad Simulate previous setup
            if (!c.verticalMenu && !c.enableTopMenu && sap.n.Layout.activeAppsDisplay()) {
                AppCache.config.verticalMenu = false;
                AppCache.config.enableTopMenu = true;

                if (sap.n.Launchpad.isPhone()) {
                    AppCache.config.activeAppsSideMobile = true;
                } else {
                    AppCache.config.activeAppsSide = true;
                }
            }

            // Settings
            if (c.languages) sap.n.Launchpad.applyLanguages(AppCache.config.languages);
            if (c.hideTopHeader && !AppCache.isMobile) topMenu.setHeight('0px');
            if (c.hideLoginSelection) AppCache_loginTypes.setVisible(false);
            if (
                c.verticalMenu &&
                sap.ui.Device.resize.width >= sap.n.Launchpad.verticalMenuLimit &&
                !AppCache.isMobile
            ) {
                sap.n.Launchpad.overflowMenuOpen();
            }

            // Enhancement
            if (c.enhancement) {
                try {
                    eval(c.enhancement);
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
            if (!AppCache.enablePwa) {
                location.hash = '';
            }

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
                    sap.n.Launchpad.applyLayout(AppCache.layout[0]);
                }
            }

            let logonType = localStorage.getItem('selectedLoginType');
            if (logonType === 'local') AppCacheUserActionPassword.setVisible(true);

            // Startup
            AppCache.Startup();
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
        
        // Blackout tile message
        sap.n.Adaptive.editor(descBlackout, { editable: false, buttonList: [] });
    }, 100);
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
