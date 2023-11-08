sap.n.Launchpad = {
    initSideBar: false,
    Timers: [],
    menuArray: [],
    menuIndex: 0,
    useMenuList: false,
    setShellBackground: true,
    backgroundShade: null,
    currLayout: '',
    currLayoutContent: '',
    searchBackgroundType: 'cards',
    searchBackgroundColor: 'ColorSet6',
    searchBackgroundShade: 'ShadeA',
    searchEnableShadeCalc: true,
    usedBackgroundType: 'cards',
    usedBackgroundColor: 'ColorSet5',
    usedBackgroundShade: 'ShadeA',
    usedEnableShadeCalc: false,
    favInProcess: false,
    hideBackIcon: false,
    enableFav: false,
    openAppExpanded: false,
    openAppsSideMenuSize: '68px',
    verticalMenuLimit: 1024,
    openAppPops: {},

    sidepanelWidth: {
        xsmall: '300px',
        small: '400px',
        medium: '500px',
        large: '600px',
        xlarge: '700px',
        xxlarge: '800px',
        xxxlarge: '900px',
        widescreen: '1024px',
        xwidescreen: '1280px',
        xxwidescreen: '1980px',
    },

    cardsAvailable: false,
    tileContent: {},
    tileGroupsInPage: {},

    device: {
        DESKTOP: 'D',
        TABLET: 'T',
        PHONE: 'P'
    },

    UpdateTileInfo: function (data) {
        // P8 Compability
    },

    sidepanelOpen: function (options) {
        if (!options) options = {};
        if (launchpadContentSideApp.getWidth() === '0px') {
            let sidepanelWidth = sap.n.Launchpad.sidepanelWidth[modelAppCacheDiaSettings.oData.sidepanelWidth || 'large'];
            if (options.width) sidepanelWidth = options.width;
            applyCSSToElmId('launchpadContentSideApp', { display: 'flex' });
            launchpadContentSideApp.setWidth(sidepanelWidth);
            sap.n.Launchpad.setLaunchpadContentWidth();
            AppCacheUserActionSidepanel.setIcon('sap-icon://navigation-right-arrow');
        }
    },

    sidepanelClose: function () {
        if (launchpadContentSideApp.getWidth() !== '0px') {
            applyCSSToElmId('launchpadContentSideApp', { display: 'none' });
            launchpadContentSideApp.setWidth('0px');
            sap.n.Launchpad.setLaunchpadContentWidth();
            AppCacheUserActionSidepanel.setIcon('sap-icon://navigation-left-arrow');
        }
    },

    settingsMenuOpen: function () {
        if (sap.n.Customization.isJiggling()) {
            sap.n.Customization.stopJiggling();
        }

        if (sap.n.Customization.isDisabled()) {
            AppCacheUserActionEditScreen.setVisible(false);
        } else {
            const { lockScreenChanges } = modelAppCacheDiaSettings.getData();
            AppCacheUserActionEditScreen.setVisible(!lockScreenChanges);
        }

        applyCSSToElmId('launchpadSettings', { display: 'flex' });
        applyCSSToElmId('launchpadSettingsContainer', { width: '100%' });
        applyCSSToElmId('launchpadSettingsClickArea', { display: 'block' });
    },

    settingsMenuClose: function () {
        unsetTabIndicesForAppCacheListMenu();
    },

    setOpenAppsExpanded: function () {
        openApps.setVisible(sap.n.Launchpad.openAppExpanded);
        openAppMaster.setIcon(`sap-icon://fa-solid/${sap.n.Launchpad.openAppExpanded ? 'caret-down' : 'caret-right'}`);
    },

    setMenuActiveState: function () {
        ContentMenu.getItems().forEach(function (menu) {
            if (menu.getIcon()) {
                menu.addStyleClass('nepTreeItemAction');
            } else {
                menu.removeStyleClass('nepTreeItemAction');
            }
        });
    },

    handleTreeNavigation: function (selectedItem) {
        const context = selectedItem.getBindingContext();
        const data = context.getObject();

        let dataTile, dataCat, pageCatId;

        switch (data.type) {
            case 'tile':
                dataTile = ModelData.FindFirst(AppCacheTiles, 'id', data.id);
                dataCat = ModelData.FindFirst(AppCacheCategory, 'id', data.parent);
                if (!dataCat) dataCat = ModelData.FindFirst(AppCacheCategoryChild, 'id', data.parent);
                sap.n.Launchpad.HandleTilePress(dataTile, dataCat);
                break;

            case 'cat':
                dataCat = sap.n.Customization.getCategory(data.id);
                if (!dataCat) dataCat = ModelData.FindFirst(AppCacheCategoryChild, 'id', data.id);
                sap.n.Launchpad.handleAppTitle(AppCache.launchpadTitle);
                location.hash = 'neptopmenu&' + dataCat.id;
                sap.n.currentView = '';
                break;

            case 'subcat':
                sap.n.Launchpad.handleAppTitle();
                dataCat = ModelData.FindFirst(AppCacheCategory, 'id', data.parent);
                if (!dataCat) dataCat = ModelData.FindFirst(AppCacheCategoryChild, 'id', data.parent);
                sap.n.Launchpad.handleAppTitle(dataCat.title);

                sap.n.currentView = '';

                if (sap.n.Launchpad.currentTileGroupPage !== `page${dataCat.id}`) {
                    sap.n.Launchpad.BuildTiles(dataCat, data.id);
                } else {
                    if (typeof sap.n.Launchpad.currentTile === 'object' && Object.keys(sap.n.Launchpad.currentTile).length > 0) AppCache.Back();
                    sap.n.Launchpad.scrollToTileGroup(data.id);
                }
                break;
        }

        if (!AppCache.config.verticalMenu) {
            sap.n.Launchpad.overflowMenuClose();
        }
    },

    overflowMenuClose: function () {
        launchpadOverflow.removeStyleClass('nepLaunchpadMenuOverflowOpen');
        applyCSSToElmId('launchpadOverflowContainer', { width: '0' });
        applyCSSToElmId('launchpadOverflowClickArea', { display: 'none' });
        launchpadContentMenu.setVisible(false);
        
        unsetTabIndicesForContentMenu();
        if (!AppCache.config.verticalMenu) {
            setTabIndex(launchpadOverflowBtn, -1);
            setTabIndex(AppCacheShellMenu, 1);
        }

        setTimeout(() => {
            sap.n.Launchpad.setLaunchpadContentWidth();
        }, 100);
    },

    overflowMenuOpen: function () {
        launchpadOverflow.addStyleClass('nepLaunchpadMenuOverflowOpen');
        launchpadContentMenu.setVisible(true);
        launchpadContentMenu.addItem(pageVerticalMenu).setWidth('300px');
        openAppMaster.setVisible((openApps.getItems().length > 0));

        setTimeout(function () {
            sap.n.Layout.setHeaderPadding();

            setTabIndicesForContentMenu();
            if (!AppCache.config.verticalMenu) {
                setTabIndex(AppCacheShellMenu, -1);
                setTabIndex(launchpadOverflowBtn, 1);
                launchpadOverflowBtn.focus();
            }
        }, 100);
    },

    setLaunchpadContentWidth: function () {
        const menuWidth = getWidth(elById('launchpadContentMenu'));
        const navWidth = getWidth(elById('launchpadContentNavigator'));

        const left = (menuWidth + navWidth) + 'px';
        const right = launchpadContentSideApp.getWidth();

        if (isRTL()) {
            let l = left;
            left = right;
            right = l;
        }

        applyCSSToElmId('launchpadContentMain', {
            'left': left,
            'right': right,
            'width': 'auto'
        });
    },

    setShellWidth: function () {
        if (!sap.n.Launchpad.currLayout) return;

        // Launchpad Width
        ['nepShellFull', 'nepShellXXXLarge', 'nepShellXXLarge', 'nepShellXLarge', 'nepShellLarge', 'nepShellMedium', 'nepShellSmall', 'nepShellXSmall'].forEach(function (c) {
            AppCacheShellUI.removeStyleClass(c);
        });

        let shellContentWidth = sap.n.Launchpad.currLayoutContent.shellContentWidth || 'Large';
        AppCacheShellUI.addStyleClass('nepShell' + shellContentWidth);

        if (shellContentWidth === 'Full') {
            AppCacheShellUI.setAppWidthLimited(false);
        } else {
            AppCacheShellUI.setAppWidthLimited(true);
        }

        // Header Width
        ['nepHeaderFull', 'nepHeaderXXXLarge', 'nepHeaderXXLarge', 'nepHeaderXLarge', 'nepHeaderLarge', 'nepHeaderMedium', 'nepHeaderSmall', 'nepHeaderXSmall'].forEach(function (c) {
            toolTopMenu.removeStyleClass(c);
        });

        let headerContentWidth = sap.n.Launchpad.currLayoutContent.headerContentWidth || 'Full';
        toolTopMenu.addStyleClass('nepHeader' + headerContentWidth);
    },

    BuildCardContent: function (config) {
        let tiles = [];
        let rowId = `${nepPrefix()}Cat${config.dataCat.id}`;

        // Favorites 
        if (config.isFav) {
            tiles = modelAppCacheTilesFav.oData;
            rowId = `${nepPrefix()}CatFav${config.dataCat.id}`;

            if (tiles.length === 0) {
                tiles = sap.n.Customization.getTiles(config.dataCat.id);
            }
        } else {
            tiles = sap.n.Customization.getTiles(config.dataCat.id);
        }

        // Card Group
        if (config.parentCat && config.parentCat.cardPerRow && !config.dataCat.cardPerRow) config.dataCat.cardPerRow = config.parentCat.cardPerRow;
        let cardPerRow = config.dataCat.cardPerRow || sap.n.Layout.row.MORE;
        config.cardParent.addStyleClass('nepBlockLayoutTileRow ' + rowId + ' nepGrid' + cardPerRow);

        sap.n.Launchpad.backgroundShade = '';

        tiles.forEach(function (tile) {
            if (!tile || !tile.id) return;
            let dataTile = ModelData.FindFirst(AppCacheTiles, 'id', tile.id);
            if (!dataTile) return;
            if (dataTile.disabled) return;

            // Fav settings override
            if (config.isFav) {
                dataTile = JSON.parse(JSON.stringify(dataTile));
                if (tile.frameType) dataTile.frameType = tile.frameType;
                if (tile.forceRow) dataTile.forceRow = tile.forceRow;
            }

            if (sap.n.Launchpad.isDesktop() && dataTile.hideTileDesktop) return;
            if (sap.n.Launchpad.isTablet() && dataTile.hideTileTablet) return;
            if (sap.n.Launchpad.isPhone() && dataTile.hideTileMobile) return;
            if (dataTile.type === 'storeitem' && isCordova()) return;

            // Tile Content
            config.cardParent.addItem(sap.n.Card.buildCardDefault({
                pageID: config.pageID,
                dataTile: dataTile,
                dataCat: config.dataCat,
                isFav: config.isFav,
                path: config.path,
            }));
        });

        // add add new Card Button
        if (!config.isFav && !sap.n.Customization.isDisabled() && sap.n.Customization.isInitialized()) {
            const cardContainer = new sap.m.FlexBox(nepId(), {
                width: '100%',
                fitContainer: true,
            }).addStyleClass('nepFCardContainer nepNewCard nepTile100 ui-state-disabled');
            
            const btnAddCard = new sap.m.Button();
            btnAddCard.tooltip = new sap.ui.core.TooltipBase().setText('');
            btnAddCard.setIcon('sap-icon://add');
            btnAddCard.addStyleClass('nepAddCard');
            btnAddCard.setType(sap.m.ButtonType.Default);
            btnAddCard.setWidth('100%');
            btnAddCard.attachPress(() => {
                sap.n.Customization.onAddTile(config.path);
            });
            cardContainer.addItem(btnAddCard);
            config.cardParent.addItem(cardContainer);
        }
    },

    setInitialGridWidth: function (grid) {
        let navWidth = getWidth(elById('AppCacheNav'));

        let c = '';
        if (navWidth < 380) c = 'nepGridXSmall';
        else if (navWidth < 680) c = 'nepGridSmall';
        else if (navWidth < 980) c = 'nepGridMedium';
        else if (navWidth < 1280) c = 'nepGridLarge';
        else if (navWidth < 1580) c = 'nepGridXLarge';
        else if (navWidth < 1880) c = 'nepGridXXLarge';
        else if (navWidth < 2360) c = 'nepGridXXXLarge';

        grid.addStyleClass(c);
    },

    updateUserLanguage(language = '') {
        AppCache.userInfo.language = language;
        ModelData.Update(AppCacheUsers, 'username', AppCache.userInfo.username, AppCache.userInfo);
        setCacheAppCacheUsers();

        sap.n.Planet9.function({
            id: dataSet,
            method: 'UpdateUserDetails',
            data: { language },
            success: function (data) {
                if (AppCache.isMobile) {
                    AppCache.translate(language);
                    sap.n.Launchpad.RebuildTiles();
                    sap.n.Launchpad.BuildMenuTop();
                    sap.n.Launchpad.BuildTreeMenu();
                } else {
                    location.reload();
                }
            }
        });
    },

    // if language set by user is removed, reset to default language
    validateActiveLanguageOrRevert() {
        // supported for user selected language has been removed
        const { languages } = AppCache.config;
        const { language } = AppCache.userInfo;
        if (
            typeof language !== 'undefined' && (
                Array.isArray(languages) && !languages.includes(language)
            ) && language !== 'EN'
        ) {
            // revert to default language
            this.updateUserLanguage();
        }
    },

    applyLanguages: function (languages) {
        inAppCacheFormSettingsLang.setVisible(true);
        inAppCacheFormSettingsLang.destroyItems();

        inAppCacheFormSettingsLang.addItem(new sap.ui.core.ListItem({ key: '', text: '' }));
        masterLanguages.forEach(function ({ ISOCODE: key, NAME: text }) {
            if (languages.includes(key)) {
                inAppCacheFormSettingsLang.addItem(new sap.ui.core.ListItem({ key, text }));
            }
        });
    },

    applyLayout: function (layout) {
        if (!layout) return;
        if (sap.n.Launchpad.currLayout === layout.id) return;

        ModelData.Delete(AppCache.layout, 'active', false);

        if (AppCache.layout.length > 1) {
            inAppCacheFormSettingsTHEME.setVisible(true);
            inAppCacheFormSettingsTHEME.destroyItems();
            AppCache.layout.forEach(function (data) {
                inAppCacheFormSettingsTHEME.addItem(new sap.ui.core.Item(nepId(), {
                    key: data.id,
                    text: data.name
                }));
            });
        }

        if (layout.style) {
            const cssText = layout.style.replace('<style>', '').replace('</style>', '');
            const s = createStyle(cssText);
            appendStyle(
                elById('NeptuneStyleDiv'),
                s
            );
        }

        [
            'searchBackgroundType', 'searchBackgroundColor', 'searchBackgroundShade', 'searchEnableShadeCalc',
            'usedBackgroundType', 'usedBackgroundColor', 'usedBackgroundShade', 'usedEnableShadeCalc',
        ].forEach(function (k) {
            if (layout[k]) sap.n.Launchpad[k] = layout[k];
        });

        sap.n.Launchpad.hideBackIcon = !!layout.topBackIconHide;

        if (typeof StatusBar !== 'undefined') {
            switch (layout.mobileStatusbarText) {
                case 'styleLightContent':
                    StatusBar.styleLightContent();
                    break;

                case 'styleBlackTranslucent':
                    StatusBar.styleBlackTranslucent();
                    break;

                case 'styleBlackOpaque':
                    StatusBar.styleBlackOpaque();
                    break;

                default:
                    StatusBar.styleDefault();
                    break;
            }

            const c = layout.mobileStatusbarColor;
            if (c) {
                if (c.includes('#')) StatusBar.backgroundColorByHexString(c);
                else StatusBar.backgroundColorByName(c);
            } else {
                StatusBar.backgroundColorByHexString('#000000');
                StatusBar.styleDefault();
            }
        }

        sap.n.Launchpad.currLayout = layout.id;
        sap.n.Launchpad.currLayoutContent = layout;
        sap.n.Launchpad.setShellWidth();
        sap.n.Layout.setHeaderPadding();
    },

    applyThemeMode: function () {
        let theme = sap.ui.getCore().getConfiguration().getTheme();
        const el = document.querySelector('html');
        removeClass(el, ['nepLayout', 'nepThemeLight', 'nepThemeDark']);

        if (theme.endsWith('_dark')) {
            addClass(el, ['nepLayout', 'nepThemeDark']);
        } else {
            addClass(el, ['nepLayout', 'nepThemeLight']);
        }
    },

    applyUserTheme: function () {
        if (modelAppCacheDiaSettings.oData && modelAppCacheDiaSettings.oData.userTheme) {
            AppCache.layout.forEach(function (data) {
                if (data.id === modelAppCacheDiaSettings.oData.userTheme) {
                    let layout = JSON.parse(JSON.stringify(data));

                    // UI5 Theme 
                    if (layout.ui5Theme) {
                        if (layout.ui5Theme.indexOf('sap_') === -1) sap.ui.getCore().setThemeRoot(layout.ui5Theme, '/public/ui5theme/' + layout.ui5Theme);
                        sap.ui.getCore().applyTheme(layout.ui5Theme);
                    } else {
                        sap.ui.getCore().applyTheme(AppCache.defaultTheme);
                    }

                    if (modelAppCacheDiaSettings.oData.userBackImage) {
                        layout.style = layout.style.replace('</style>', `.nepShell {
                                background-image: url('${modelAppCacheDiaSettings.oData.userBackImage}') !important;
                                background-repeat:no-repeat;
                                background-size:cover;
                            }
                            .nepPage {
                                background:transparent;
                            }
                            </style>
                        `);
                    }
                    sap.n.Launchpad.currLayout = '';
                    sap.n.Launchpad.applyLayout(layout);
                }
            });
        }
    },

    BuildMenu: function () {
        // Enable Fav Buttons
        let cat = ModelData.FindFirst(AppCacheCategory, 'inclFav', true);
        if (cat && cat.inclFav) {
            sap.n.Launchpad.enableFav = cat.inclFav;
        } else {
            cat = ModelData.FindFirst(AppCacheCategoryChild, 'inclFav', true);
            if (cat && cat.inclFav) sap.n.Launchpad.enableFav = cat.inclFav;
        }

        // Add Tile Group/Tile CSS
        appendStyle(
            elById('NeptuneStyleDivDynamic'),
            createStyle(sap.n.Launchpad.buildContentCss())
        );

        if (AppCache.config.enableTopMenu) sap.n.Launchpad.BuildMenuTop();
        sap.n.Launchpad.BuildTreeMenu();
        sap.n.Launchpad.BuildTags();
        sap.n.Launchpad.SelectHomeMenu();

        // Fallback, no startApp or Tiles -> Build empty page 
        if (!AppCache.StartApp && !AppCache.StartWebApp && !modelAppCacheCategory.oData.length) {

            let pageCat = new sap.m.Page(nepId(), {
                showHeader: false,
                showFooter: false,
                backgroundDesign: 'Transparent',
            });

            pageCat.addStyleClass('nepPage');
            AppCacheNav.addPage(pageCat);
            AppCacheNav.to(pageCat);

        }
    },

    BuildMenuTop: function () {
        AppCacheAppButton.removeAllItems();

        // BuildMenuTop will be called via BuildMenu when sap.n.Customization.init is complete
        if (!sap.n.Customization.isInitialized()) {
            return;
        }
        
        sap.n.Customization.getCategories().forEach(function (dataCat) {
            if (dataCat.hideFromMenu) return;
            
            let menuText = sap.n.Launchpad.translateTile('title', dataCat);
            if (dataCat.isCustom) {
                menuText = dataCat.props.menuText;
            }
            
            let popSubMenu;
            let menuItem = new sap.m.Button(`${nepPrefix()}${dataCat.id}`, {
                text: menuText,
                type: 'Transparent',
                press: function (oEvent) {
                    location.hash = `neptopmenu&${dataCat.id}`;
                    if (popSubMenu) popSubMenu.close();
                }
            }).addStyleClass('nepTopMenuBtn');

            // Navigation Panel
            const tileGroups = sap.n.Customization.getTileGroups(dataCat.id);
            if (tileGroups.length > 0) {
                let listSubMenu = new sap.m.List(nepId(), {
                    showSeparators: 'None'
                });

                let menuFn = {
                    popOverEntered: false,
                    btnEntered: false
                };

                let buildSubMenu = false;
                tileGroups.forEach(function (data) {
                    let dataCatChild = ModelData.FindFirst(AppCacheCategory, 'id', data.id);
                    if (!dataCatChild) dataCatChild = ModelData.FindFirst(AppCacheCategoryChild, 'id', data.id);
                    if (!dataCatChild) return;
                    if (dataCatChild.hideFromMenu) return;

                    const navBtn = new sap.m.StandardListItem(nepId(), {
                        title: sap.n.Launchpad.translateTile('title', dataCatChild),
                        type: 'Active',
                        press: function (e) {
                            const pageCatID = `page${dataCat.id}`;

                            if (sap.n.Launchpad.currentTileGroupPage === pageCatID) {
                                sap.n.Launchpad.scrollToTileGroup(dataCatChild.id);
                            } else if (sap.n.Launchpad.currentTileGroupPage !== pageCatID) {
                                menuItem.fireEvent('press');
                                sap.n.Launchpad.BuildTiles(dataCat, dataCatChild.id);
                            } else {
                                if (sap.n.Launchpad.currentTile) AppCache.Back();
                                sap.n.Launchpad.scrollToTileGroup(dataCatChild.id);
                            }

                            menuFn.popOverEntered = false;
                            menuFn.btnEntered = false;
                            if (popSubMenu) popSubMenu.close();

                            AppCacheAppButton.getItems().forEach(function (item) {
                                if (item.removeStyleClass) item.removeStyleClass('nepTopMenuActive');
                            });
                            menuItem.addStyleClass('nepTopMenuActive');
                        }
                    });

                    listSubMenu.addItem(navBtn);
                    buildSubMenu = true;
                });

                if (buildSubMenu) {
                    popSubMenu = new sap.m.Popover(`${nepPrefix()}SubMenu${ModelData.genID()}`, {
                        placement: 'Bottom',
                        resizable: false,
                        showArrow: false,
                        showHeader: false,
                        contentWidth: '300px',
                        offsetY: 5
                    }).addStyleClass('nepSubMenu nepOverflowMenu');

                    popSubMenu.attachBrowserEvent('mouseenter', function (e) {
                        menuFn.popOverEntered = true;
                        menuItem.addStyleClass('nepTopMenuActiveHover');
                    });

                    popSubMenu.attachBrowserEvent('mouseleave', function (e) {
                        menuFn.popOverEntered = false;
                        menuItem.removeStyleClass('nepTopMenuActiveHover');

                        setTimeout(function () {
                            if (!menuFn.btnEntered) popSubMenu.close();
                        }, 100);
                    });

                    // Open SubMenu
                    menuItem.attachBrowserEvent('mouseenter', function (e) {
                        popSubMenu.openBy(menuItem);
                        menuFn.btnEntered = true;
                    });

                    menuItem.attachBrowserEvent('mouseleave', function (e) {
                        menuFn.btnEntered = false;
                        setTimeout(function () {
                            if (!menuFn.popOverEntered) popSubMenu.close();
                        }, 100);
                    });

                    popSubMenu.addContent(listSubMenu);
                }
            }

            AppCacheAppButton.addItem(menuItem);
        });
    },

    BuildTags: function () {
        AppCacheShellSearchTags.destroyItems();

        let tags = {};
        Array.isArray(modelAppCacheTiles.oData) && modelAppCacheTiles.oData.forEach(function (tile) {
            if (!tile.tags) return;
            let tileTags = tile.tags.split(',');
            tileTags.forEach(function (tag) {
                tag = tag.toUpperCase();
                if (tags[tag]) return;
                tags[tag] = tag
            });
        });

        let tagsArr = [];
        Object.entries(tags).forEach(function ([_, elem]) {
            tagsArr.push({ tag: elem });
        });

        toolVerticalMenuTags.setVisible(tagsArr.length > 0);
        tagsArr.sort(sort_by('tag'));

        tagsArr.forEach(function (tag) {
            AppCacheShellSearchTags.addItem(new sap.ui.core.ListItem({
                key: tag.tag,
                text: tag.tag
            }));
        });
    },

    BuildTreeMenu: function () {
        let treeData = [];
        let _buildMenuTile = function (dataTileID, dataCat, treeData, parent) {
            let dataTile = ModelData.FindFirst(AppCacheTiles, 'id', dataTileID.id);

            if (sap.n.Launchpad.isDesktop() && dataTile.hideTileDesktop) return;
            if (sap.n.Launchpad.isTablet() && dataTile.hideTileTablet) return;
            if (sap.n.Launchpad.isPhone() && dataTile.hideTileMobile) return;

            let title = sap.n.Launchpad.translateTile('title', dataTile);

            if (title && (dataTile.actionApplication || dataTile.actionWebApp || dataTile.actionURL || dataTile.actiongroup || dataTile.actionType === 'F' || dataTile.type === 'storeitem')) {
                let icon = dataTile.icon || 'sap-icon://less';
                let type = 'tile';

                if (dataTile.actiongroup) {
                    icon = ''; //'sap-icon://fa-solid/layer-group';
                    type = 'subcat';
                }

                treeData.push({
                    id: dataTile.id,
                    parent: parent || dataCat.id,
                    title: title,
                    type: type,
                    filter: sap.n.Launchpad.translateTile('title', dataCat),
                    tags: dataTile.tags,
                    icon: icon
                });
            }

            // Tile with Tile Group
            if (dataTile.actiongroup) {
                let dataCat = ModelData.FindFirst(AppCacheCategoryChild, 'id', dataTile.actiongroup);
                if (!dataCat) return;

                // Tiles
                Array.isArray(dataCat.tiles) && dataCat.tiles.forEach(function (dataSubTile) {
                    _buildMenuTile(dataSubTile, dataCat, treeData, dataTile.id);
                });

                // Tile Groups
                Array.isArray(dataCat.tilegroups) && dataCat.tilegroups.forEach(function (dataCatID) {
                    let dataCatChild = ModelData.FindFirst(AppCacheCategory, 'id', dataCatID.id);
                    if (!dataCatChild) dataCatChild = ModelData.FindFirst(AppCacheCategoryChild, 'id', dataCatID.id);
                    if (!dataCatChild) return;
                    if (dataCatChild.hideFromMenu) return;

                    treeData.push({
                        id: dataCatChild.id,
                        parent: dataTile.id,
                        title: sap.n.Launchpad.translateTile('title', dataCatChild),
                        type: 'childcat',
                        icon: '',
                        filter: sap.n.Launchpad.translateTile('title', dataCatChild),
                    });

                    // Favorites 
                    if (dataCatChild.inclFav) {
                        modelAppCacheTilesFav.oData.forEach(function (dataTile) {
                            _buildMenuTile(dataTile, dataCatChild, treeData, dataCatID.id);
                        });
                    }

                    // Tiles
                    dataCatChild.tiles.forEach(function (dataTile) {
                        _buildMenuTile(dataTile, dataCatChild, treeData, dataCatID.id);
                    });
                });
            }
        }

        sap.n.Customization.getCategories().forEach(function (dataCat) {
            if (dataCat.hideFromMenu) return;

            let title = sap.n.Launchpad.translateTile('title', dataCat);
            if (!title && dataCat.isCustom && dataCat.status === 'active') {
                title = dataCat.props.menuText || dataCat.props.title;
            }

            treeData.push({
                id: dataCat.id,
                parent: '',
                title,
                type: 'cat',
            });

            // Favorites 
            if (dataCat.inclFav) {
                modelAppCacheTilesFav.oData.forEach(function (dataTileID) {
                    _buildMenuTile(dataTileID, dataCat, treeData);
                });
            }

            // Tiles
            dataCat.tiles.forEach(function (dataTile) {
                _buildMenuTile(dataTile, dataCat, treeData);
            });

            dataCat.tilegroups.forEach(function (dataCatID) {
                let dataCatChild = ModelData.FindFirst(AppCacheCategory, 'id', dataCatID.id);
                if (!dataCatChild) dataCatChild = ModelData.FindFirst(AppCacheCategoryChild, 'id', dataCatID.id);
                if (!dataCatChild) return;
                if (dataCatChild.hideFromMenu) return;

                treeData.push({
                    id: dataCatChild.id,
                    parent: dataCat.id,
                    title: sap.n.Launchpad.translateTile('title', dataCatChild),
                    type: 'subcat',
                    icon: '', //'sap-icon://fa-solid/layer-group',
                    filter: sap.n.Launchpad.translateTile('title', dataCatChild),
                });

                // Favorites 
                if (dataCatChild.inclFav) {
                    modelAppCacheTilesFav.oData.forEach(function (dataTile) {
                        _buildMenuTile(dataTile, dataCatChild, treeData);
                    });
                }

                // Tiles
                dataCatChild.tiles.forEach(function (dataTile) {
                    _buildMenuTile(dataTile, dataCatChild, treeData);
                });
            });
        });

        modelContentMenu.setData({
            'children': _convertFlatToNested(treeData, 'id', 'parent')
        });
    },

    scrollToTileGroup: function (tileGroupId) {
        setTimeout(function () {
            const elm = querySelector(`#${sectionPrefix()}${tileGroupId}`);
            if (elm && elm.scrollIntoView) {
                elm.scrollIntoView();
            }
        }, 500);
    },

    RebuildTiles: function () {
        let currentPage = AppCacheNav.getCurrentPage();
        AppCacheNav.getPages().forEach(function (page) {
            // only for Tile Group + Childs 
            if (page.sId.indexOf('page') > -1) {
                // destroy page content, rebuild later when user navigates there
                page.destroyContent();

                // rebuild current page 
                if (currentPage.sId === page.sId) {
                    const id = currentPage.sId;
                    const pageId = id.split('page')[1];

                    // can be either a category, or a tilegroup
                    let item = sap.n.Customization.getCategory(pageId);
                    if (!item) item = sap.n.Customization.getTileGroup(pageId);

                    if (!item) AppCache.Home();
                    else sap.n.Launchpad.BuildTiles(item, item.id);
                }
            }
        });
    },

    SelectHomeMenu: function () {
        // Start with hash 
        if (location.hash) {
            sap.n.HashNavigation._handler();
        } else {
            const category = sap.n.Customization.getCategories()[0];
            if (category) location.hash = 'neptopmenu&' + category.id;
        }
    },

    SetHeader: function () {
        if (sap.n.Launchpad.currentTile) {
            sap.n.Launchpad.setActiveIcon(sap.n.Launchpad.currentTile.id);
        } else {
            sap.n.Launchpad.setActiveIcon();
        }
    },

    MarkTopMenu: function (menuID) {
        const activeId = `${nepPrefix()}${menuID}`;
        AppCacheAppButton.getItems().forEach(function (item) {
            if (item.removeStyleClass && item.sId !== activeId) item.removeStyleClass('nepTopMenuActive');
            if (item.sId === activeId) item.addStyleClass('nepTopMenuActive');
        });
    },

    GetGroupHeader: function (data, cards) {
        let header = new sap.m.FlexBox(nepId()).addStyleClass('nepGrid');        
        sap.n.Launchpad.setInitialGridWidth(header);

        // Content Width
        if (data.cardContentWidth) {
            header.addStyleClass('nepGroup' + data.cardContentWidth);
        }

        let cardContentAlign = sap.n.Launchpad.currLayoutContent.cardContentAlign || 'Center';
        if (cardContentAlign) {
            header.addStyleClass('nepGridAlign' + cardContentAlign);
        }

        if (!data.hideHeader || data.isCustom) {
            // Group Header
            const groupHeader = sap.n.Launchpad.buildGroupHeader(data);
            const oHeaderCell = new sap.m.VBox(nepId(), {});
            oHeaderCell.addStyleClass('nepTileMax');
            oHeaderCell.addItem(groupHeader);
            header.addItem(oHeaderCell);
        }

        // Number of tiles check, show header cells only if there are more than one tiles
        const onlyOneCard = cards.getItems().length === 1;

        if (data.enableMessage) {
            // Message 
            const message = sap.n.Launchpad.buildGroupMessage(data);
            if (!onlyOneCard) {
                const oHeaderCell = new sap.m.VBox(nepId(), {});
                oHeaderCell.addStyleClass('nepTileMax');
                oHeaderCell.addItem(message);
                header.addItem(oHeaderCell);
            }
        }

        return header;
    },

    GetGroupCards: function (data, type, dragDropContext) {
        const cards = new sap.m.FlexBox(nepId()).addStyleClass('nepGrid');
        if (data.styleClass) cards.addStyleClass(data.styleClass);

        if (!data.inclFav) {
            cards.addStyleClass(sap.n.Customization.tilesDragDropClass);
        }

        // use Neptune Element Query to determine dynamic page width
        neptune.ElementQuery.register(cards, {
            prefix: 'nepGrid',
            isolate: true,
            width: AppCache.cssGridBreakpoints
        });
        
        sap.n.Launchpad.setInitialGridWidth(cards);

        // Content Width
        if (data.cardContentWidth) {
            cards.addStyleClass('nepGroup' + data.cardContentWidth);
        }

        // Content Alignment
        let cardContentAlign = sap.n.Launchpad.currLayoutContent.cardContentAlign || 'Center';
        if (data.cardContentAlign) cardContentAlign = data.cardContentAlign
        if (cardContentAlign) {
            cards.addStyleClass('nepGridAlign' + cardContentAlign);
        }

        function applyDragDrop() {
            if (data.inclFav && !(sap.n.Customization.isDisabled() || sap.n.Customization.areScreensLocked())) {
                sap.n.Card.applyDragDropToFavorites(cards);
            }
        }

        function applyTileGroupEnhancement() {
            if (sap.n.Enhancement.AfterTileGroupRenderer) {
                try {
                    sap.n.Enhancement.AfterTileGroupRenderer(cards, data);
                } catch (e) {
                    appCacheError('Enhancement AfterTileGroupRenderer ' + e);
                }
            }
        }
        
        cards.onAfterRendering = function () {
            applyDragDrop();
            applyTileGroupEnhancement();
        }

        return cards;
    },

    BuildTiles: function (dataCat, subCat) {
        const tiles = sap.n.Customization.getTiles(dataCat.id);
        const tileGroups = sap.n.Customization.getTileGroups(dataCat.id);
        if (tiles.length === 0 && tileGroups.length === 0) return;

        let pageCatID = `page${dataCat.id}`;
        let isFav = dataCat.inclFav;

        sap.n.Launchpad.currentTileGroupPage = pageCatID;
        sap.n.currentView = '';

        // Mark Menu 
        sap.n.Launchpad.MarkTopMenu(dataCat.id);

        // UI Handling
        sap.n.Launchpad.setShellWidth();
        sap.n.Launchpad.setHideHeader(false);

        // Back Button         
        if (!subCat && !sap.n.Launchpad.hideBackIcon) AppCacheShellBack.setVisible(false);

        // Create Page Per Tile Group 
        let pageCat = sap.ui.getCore().byId(pageCatID);

        // Pages with Fav, always create
        tileGroups.forEach(function (data) {
            let dataCatChild = sap.n.Customization.getCategory(data.id);
            if (!dataCatChild) dataCatChild = sap.n.Customization.getTileGroup(data.id);
            if (dataCatChild && dataCatChild.inclFav) isFav = true;
        });

        if (pageCat && isFav) {
            AppCacheNav.removePage(pageCat);
            pageCat.destroy();
            pageCat = null;
        }

        if (!pageCat) {
            pageCat = new sap.m.Page(pageCatID, {
                showHeader: false,
                showFooter: false,
                backgroundDesign: 'Transparent',
            });

            pageCat.onAfterRendering = function () {
                if (!sap.n.Customization.isDisabled() && !sap.n.Customization.areScreensLocked()) {
                    sap.n.Customization.applyDragDropToTiles(pageCat);
                }
            };

            addCustomData(pageCat, {
                type: 'page',
                context: 'page',
                'category-id': dataCat.id,
            });

            pageCat.addStyleClass('nepPage');
            AppCacheNav.addPage(pageCat);
        }

        if (pageCat.getContent().length === 0) {

            let versionParts = sap.ui.version.split(".");

            // BlockLayout vs Cards
            if (versionParts[0] >= 1 && versionParts[1] >= 64) {

                sap.n.Launchpad.cardsAvailable = true;

                //Grid containerOpenApp
                let gridContainer = new sap.m.FlexBox(`${sectionPrefix()}${dataCat.id}`, {
                    direction: 'Column',
                    alignItems: 'Start'
                }).addStyleClass('nepGridContainer nepGridCards');
                
                addCustomData(gridContainer, {
                    type: 'category',
                    context: 'category-tiles',
                    'category-id': dataCat.id,
                });

                const cards = sap.n.Launchpad.GetGroupCards(dataCat, 'category', { category: dataCat });
                sap.n.Launchpad.BuildCardContent({
                    pageID: pageCatID,
                    dataCat: dataCat,
                    cardParent: cards,
                    isFav: !!dataCat.inclFav,
                    path: [dataCat.id],
                });

                if (!!dataCat.inclFav) {
                    cards.addStyleClass('favorite-cards');
                }

                gridContainer.addItem(sap.n.Launchpad.GetGroupHeader(dataCat, cards));
                gridContainer.addItem(cards);

                // Add Grid to Page
                if (tileGroups.length > 0 || cards.getItems().length > 0) {
                    pageCat.addContent(gridContainer);
                }

                // Child Tile Groups
                tileGroups.forEach(function (data) {
                    let dataCatChild = sap.n.Customization.getCategory(data.id);

                    if (!dataCatChild) dataCatChild = sap.n.Customization.getTileGroup(data.id);
                    if (!dataCatChild) return;

                    //Grid containerOpenApp
                    let tilegroupContainer = new sap.m.FlexBox(`${sectionPrefix()}${dataCat.id}${dataCatChild.id}`, {
                        direction: 'Column',
                        alignItems: 'Start'
                    }).addStyleClass('nepGridContainer nepGridCards');
                    
                    addCustomData(tilegroupContainer, {
                        type: 'tilegroup',
                        context: 'tilegroup-tiles',
                        'category-id': dataCat.id,
                        'tilegroup-id': dataCatChild.id,
                    });

                    const cards = sap.n.Launchpad.GetGroupCards(
                        dataCatChild,
                        'tilegroup',
                        {
                            category: dataCat,
                            tilegroup: dataCatChild,
                        }
                    );
                    if (!!dataCatChild.inclFav) {
                        cards.addStyleClass('favorite-cards');
                    }
                    sap.n.Launchpad.BuildCardContent({
                        pageID: pageCatID,
                        dataCat: dataCatChild,
                        cardParent: cards,
                        parentCat: dataCat,
                        isFav: !!dataCatChild.inclFav,
                        path: [dataCat.id, dataCatChild.id],
                    });

                    tilegroupContainer.addItem(sap.n.Launchpad.GetGroupHeader(dataCatChild, cards));
                    tilegroupContainer.addItem(cards);

                    pageCat.addContent(tilegroupContainer);
                });

                if (tileGroups.length > 0 || cards.getItems().length > 0) {
                    // add an empty box
                    pageCat.addContent(
                        new sap.m.HBox(nepId(), {
                            height: '50px'
                        })
                    );
                }
            } else {
                // Build Group Header
                if (!dataCat.hideHeader) pageCat.addContent(sap.n.Launchpad.buildGroupHeader(dataCat));

                // Message 
                if (dataCat.enableMessage) pageCat.addContent(sap.n.Launchpad.buildGroupMessage(dataCat));

                if (!dataCat.backgroundType) dataCat.backgroundType = 'cards';

                // Cards Type
                if (dataCat.backgroundType === 'cards') {
                    dataCat.backgroundType = 'Default';
                    dataCat.enableCards = true;
                }

                // Block Parent
                let AppCacheObjectTiles = new sap.ui.layout.BlockLayout(nepId(), {
                    background: dataCat.backgroundType,
                    keepFontSize: true
                });

                if (dataCat.styleClass) AppCacheObjectTiles.addStyleClass(dataCat.styleClass);

                // Fav 
                if (dataCat.inclFav) sap.n.Launchpad.BuildTilesContent(dataCat, AppCacheObjectTiles, true);

                // Tiles 
                sap.n.Launchpad.BuildTilesContent(dataCat, AppCacheObjectTiles);

                // Add Block to Page
                pageCat.addContent(AppCacheObjectTiles);

                // Child Tile Groups
                dataCat.tilegroups.forEach(function (data) {
                    let dataCatChild = ModelData.FindFirst(AppCacheCategory, 'id', data.id);

                    if (!dataCatChild) dataCatChild = ModelData.FindFirst(AppCacheCategoryChild, 'id', data.id);
                    if (!dataCatChild) return;

                    if (!dataCatChild.backgroundType) dataCatChild.backgroundType = 'cards';

                    // Cards Type
                    if (dataCatChild.backgroundType === 'cards') {
                        dataCatChild.backgroundType = 'Default';
                        dataCatChild.enableCards = true;
                    }

                    // Build Group Header
                    if (!dataCatChild.hideHeader) pageCat.addContent(sap.n.Launchpad.buildGroupHeader(dataCatChild));

                    // Block Parent
                    let AppCacheObjectTiles = new sap.ui.layout.BlockLayout(nepId(), {
                        background: dataCatChild.backgroundType,
                        keepFontSize: true
                    });

                    if (dataCat.styleClass) AppCacheObjectTiles.addStyleClass(dataCat.styleClass);

                    // Fav 
                    if (dataCatChild.inclFav) sap.n.Launchpad.BuildTilesContent(dataCatChild, AppCacheObjectTiles, true);

                    // Tiles 
                    sap.n.Launchpad.BuildTilesContent(dataCatChild, AppCacheObjectTiles);

                    // Add Block to Page
                    pageCat.addContent(AppCacheObjectTiles);
                });

                if (dataCat.tilegroups.length > 0) {
                    // add an empty box
                    pageCat.addContent(
                        new sap.m.HBox(nepId(), {
                            height: (window.innerHeight - 270) + 'px'
                        })
                    );
                }

                if (subCat) {
                    setTimeout(function () {
                        pageCat.scrollTo(0);
                    }, 100);
                }
            }
        }

        sap.n.Launchpad.backApp = pageCat;
        sap.n.Launchpad.setMenuPage(dataCat);

        // Navigate
        setTimeout(function () {
            const transition = modelAppCacheDiaSettings.oData.TRANSITION || 'show';
            AppCacheNav.to(pageCat, transition);
        }, 100);

        // Scrolling to SubMenu
        if (subCat) {
            setTimeout(function () {
                sap.n.Launchpad.scrollToTileGroup(subCat);
            }, 300);
        }
    },

    BuildTilesContent: function (dataCat, AppCacheObjectTiles, isFav) {
        let oBlockCell;

        // Create First Row
        let numSections = 0;
        let maxTiles = dataCat.numTiles || 4;
        let defaultSize = Math.ceil(100 / maxTiles);
        let oBlockRowTiles = '';
        let tiles = isFav ? modelAppCacheTilesFav.oData : dataCat.tiles;

        sap.n.Launchpad.backgroundShade = '';

        tiles.forEach(function (tile) {
            let dataTile = sap.n.Customization.getTile(tile.id);
            if (!dataTile) return;
            if (dataTile.disabled) return;

            // Fav settings override
            if (isFav) {
                dataTile = JSON.parse(JSON.stringify(dataTile));
                if (tile.frameType) dataTile.frameType = tile.frameType;
                if (tile.forceRow) dataTile.forceRow = tile.forceRow;
            }

            if (sap.n.Launchpad.isDesktop() && dataTile.hideTileDesktop) return;
            if (sap.n.Launchpad.isTablet() && dataTile.hideTileTablet) return;
            if (sap.n.Launchpad.isPhone() && dataTile.hideTileMobile) return;
            if (dataTile.type === 'storeitem' && isCordova()) return;

            if (numSections === 0 || dataTile.forceRow) {

                oBlockRowTiles = new sap.ui.layout.BlockLayoutRow(nepId(), {
                    scrollable: dataCat.enableScroll
                });

                AppCacheObjectTiles.addContent(oBlockRowTiles);
                numSections = 0;
            }

            // Tile Size
            let tileWidth = parseInt(dataTile.frameType) || defaultSize;
            numSections = numSections + (maxTiles / 100) * tileWidth;

            // Tile Content
            switch (dataTile.type) {

                case 'intcard':
                    oBlockCell = sap.n.Launchpad.buildTileIntegrationCard(dataTile, tileWidth, dataCat);
                    oBlockRowTiles.addContent(oBlockCell);
                    break;

                case 'application':
                    oBlockCell = sap.n.Launchpad.buildTileApplication(dataTile, tileWidth, dataCat);
                    oBlockRowTiles.addContent(oBlockCell);
                    break;

                case 'highchart':
                    oBlockCell = sap.n.Launchpad.buildTileHighchart(dataTile, tileWidth, dataCat);
                    oBlockRowTiles.addContent(oBlockCell);
                    break;

                case 'highstock':
                    oBlockCell = sap.n.Launchpad.buildTileHighstock(dataTile, tileWidth, dataCat);
                    oBlockRowTiles.addContent(oBlockCell);
                    break;

                case 'sub':
                    const oBlockRowSub = new sap.ui.layout.BlockLayoutRow(nepId(), {
                        scrollable: false
                    });
                    AppCacheObjectTiles.addContent(oBlockRowSub);
                    oBlockRowSub.addContent(sap.n.Launchpad.buildTileSubHeader(dataTile, tileWidth, dataCat));
                    break;

                default:
                    oBlockCell = sap.n.Launchpad.buildTileDefault(dataTile, tileWidth, dataCat);
                    oBlockRowTiles.addContent(oBlockCell);
                    break;
            }

            if (!dataCat.enableScroll) {
                if (numSections >= maxTiles) numSections = 0;
            }

            if (dataTile.frameType && !sap.n.Launchpad.isPhone()) oBlockCell.addStyleClass('nepTileCardsFixed' + dataTile.frameType);

        });
    },

    HandleTilePress: function (dataTile, dataCat) {
        if (dataTile.navObject && dataTile.navAction) {
            location.hash = dataTile.navObject + '-' + dataTile.navAction;
        } else {
            location.hash = '';
            sap.n.Launchpad._HandleTilePress(dataTile, dataCat);
        }
    },

    _HandleTilePress: function (dataTile, dataCat) {
        let appTitle;

        // Any tile ?
        if (!dataTile) return;

        // Clear Hash if no semantic navigation
        if (!dataTile.navObject && !dataTile.navAction) location.hash = '';

        // Avoid double start
        if (sap.n.Launchpad.currentTile && !sap.n.Launchpad.currentTile.actionURL) {
            if (sap.n.Launchpad.currentTile.id === dataTile.id) return;
        }

        AppCacheShellHelp.setVisible(false);
        sap.n.Launchpad.contextType = 'Menu';

        // Start SidePanel
        if (dataTile.sidepanelApp && !sap.n.Launchpad.isPhone()) {
            sap.n.Shell.loadSidepanel(dataTile.sidepanelApp, dataTile.sidepanelTitle);
        } else {
            sap.n.Shell.closeSidepanel();
        }

        // Set App Title
        if (sap.n.Launchpad.isPhone() || dataTile.subTitle === '' || dataTile.subTitle === null) {
            appTitle = dataTile.title;
        } else {
            appTitle = dataTile.title + ' - ' + dataTile.subTitle;
        }

        // Header Handling 
        let hideHeader = false;
        if (sap.n.Launchpad.isDesktop() && dataTile.hideHeaderL) hideHeader = true;
        if (sap.n.Launchpad.isTablet() && dataTile.hideHeaderM) hideHeader = true;
        if (sap.n.Launchpad.isPhone() && dataTile.hideHeaderS) hideHeader = true;

        sap.n.Launchpad.setHideHeader(hideHeader);

        if (dataTile.urlApplication === null) dataTile.urlApplication = "";

        // Show back Button 
        if (!dataTile.openDialog && !dataTile.openWindow) {
            if (dataTile.actionApplication || dataTile.actionURL || dataTile.actionWebApp || dataTile.actionType === 'F') {
                sap.n.Launchpad.currentTile = dataTile;
            }

            if (!sap.n.Launchpad.hideBackIcon) AppCacheShellBack.setVisible(true);
        }

        // Trace
        if (AppCache.enableTrace && !AppCache.isOffline) sap.n.Launchpad.traceTile(dataTile);

        // Enhancement
        if (sap.n.Enhancement.TileClick) {
            try {
                sap.n.Enhancement.TileClick(dataTile);
            } catch (e) {
                appCacheError('Enhancement TileClick ' + e);
            }
        }


        // Adaptive Framework
        if (dataTile.actionType === 'F') {

            sap.n.Adaptive.getConfig(dataTile.settings.adaptive.id).then(function (config) {

                // Exists ? 
                if (!config) {
                    sap.m.MessageToast.show(AppCache_tAdaptiveNotFound.getText());
                    return;
                }

                if (dataTile.openDialog) {

                    AppCache.Load(config.application, {
                        appGUID: dataTile.id,
                        dialogShow: true,
                        dialogTitle: appTitle,
                        dialogHeight: dataTile.dialogHeight || '90%',
                        dialogWidth: dataTile.dialogWidth || '1200px',
                        startParams: config
                    });

                    sap.n.Launchpad.contextType = 'Tile';
                    sap.n.Launchpad.contextTile = dataTile;
                    location.hash = '';

                } else {

                    // Start App
                    sap.n.Launchpad.handleAppTitle(appTitle);
                    sap.n.Launchpad.handleNavButton(dataTile, dataCat);
                    sap.n.Launchpad.handleRunListApp(dataTile);

                    AppCache.Load(config.application, {
                        appGUID: dataTile.id,
                        startParams: config,
                        openFullscreen: dataTile.openFullscreen
                    });

                    // Sidepanel User Assistance
                    if (dataTile.enableDocumentation && !AppCache.isPublic) AppCacheShellHelp.setVisible(true);

                    // Mark Open From 
                    if (sap.n.Shell.openSidePanelApps[dataTile.actionApplication]) sap.n.Shell.openSidepanel();

                }

            });

            return;

        }

        // Store Item
        if (dataTile.type === 'storeitem') {
            // Get Mobile Client
            request({
                type: 'GET',
                contentType: 'application/json; charset=utf-8',
                url: AppCache.Url + '/mobileClients/' + dataTile.storeItem.mobileClient,
                dataType: 'json',
                success: function (data) {
                    // Get Active Version 
                    data.activeBuild = {};
                    data.builds.forEach(function (build) {
                        if (data.activeVersion === build.version) data.activeBuild = build;
                    });

                    // Hide image on phone
                    if (sap.n.Launchpad.isPhone()) {
                        oTileImageCell.setVisible(false);
                    } else {
                        oTileImage.setSrc(AppCache.Url + '/media/' + data.iconId);
                    }

                    // Install button 
                    AppCachePageStoreInstall.setEnabled(false);
                    switch (sap.ui.Device.os.name) {

                        case 'win':
                            if (data.buildWindows && data.activeBuild.dataWindows) AppCachePageStoreInstall.setEnabled(true);
                            break;

                        case 'Android':
                            if (data.buildAndroid && data.activeBuild.dataAndroid) AppCachePageStoreInstall.setEnabled(true);
                            break;

                        case 'iOS':
                            if (data.buildIOS && data.activeBuild.dataIos) AppCachePageStoreInstall.setEnabled(true);
                            break;

                    }

                    modelAppCachePageStore.setData(data);
                    AppCacheNav.to(AppCachePageStore);
                },
                error: function (data) {
                    sap.m.MessageToast.show(data.status);
                }
            });

            return;
        }

        // Tile Group 
        if (dataTile.actiongroup) {
            let dataCat = ModelData.FindFirst(AppCacheCategory, 'id', dataTile.actiongroup);
            if (!dataCat) dataCat = ModelData.FindFirst(AppCacheCategoryChild, 'id', dataTile.actiongroup);
            if (dataCat) {
                if (!sap.n.Launchpad.hideBackIcon) AppCacheShellBack.setVisible(true);
                sap.n.Launchpad.handleAppTitle(dataTile.title);
                sap.n.Launchpad.BuildTiles(dataCat, true);
            }
            return;
        }

        // External URL
        if (dataTile.actionURL) {
            sap.n.Launchpad.handleRunListApp(dataTile);

            if (dataTile.openWindow) {
                if (AppCache.isMobile) {
                    window.open(dataTile.actionURL, '_blank', 'location=0,status=0');
                } else {
                    sap.m.URLHelper.redirect(dataTile.actionURL, dataTile.openWindow);
                }

                location.hash = '';
                AppCacheShellBack.setVisible(false);
            } else if (dataTile.openDialog) {
                sap.n.Launchpad.contextType = 'Tile';
                sap.n.Launchpad.contextTile = dataTile;

                sap.n.Shell.openUrl(dataTile.actionURL, {
                    dialogTitle: appTitle,
                    dialogHeight: dataTile.dialogHeight || '90%',
                    dialogWidth: dataTile.dialogWidth || '1200px',
                });

                location.hash = '';
                AppCacheShellBack.setVisible(false);
            } else {
                sap.n.Launchpad.handleAppTitle(appTitle);
                sap.n.Launchpad.handleNavButton(dataTile, dataCat);

                AppCacheNav.to(AppCache_boxURL, modelAppCacheDiaSettings.oData.TRANSITION || 'show');

                if (dataTile.openFullscreen) {
                    AppCacheShellUI.setAppWidthLimited(false);
                } else {
                    AppCacheShellUI.setAppWidthLimited(true);
                }

                // Hide All
                hideChildren('#AppCache_URLDiv');

                // Check If element exist > Display or Create
                let el = elById(`iFrame${dataTile.id}`);

                if (el) {
                    el.style.display = 'block';
                } else {
                    appendIFrame(
                        querySelector('#AppCache_URLDiv'),
                        {
                            'id': `iFrame${dataTile.id}`,
                            'frameborder': '0',
                            'style': 'border: 0;',
                            'width': '100%',
                            'height': '100%',
                            'src': dataTile.actionURL
                        }
                    )
                }
            }

            return;
        }

        // Web App
        if (dataTile.actionWebApp) {
            if (dataTile.openWindow) {
                let url = '/webapp/' + dataTile.actionWebApp;
                if (dataTile.urlApplication) {
                    url = dataTile.urlApplication + url;
                } else {
                    url = AppCache.Url + url;
                }

                if (AppCache.isMobile) {
                    window.open(url, '_blank', 'location=0,status=0');
                } else {
                    sap.m.URLHelper.redirect(url, dataTile.openWindow);
                }

                location.hash = '';
                AppCacheShellBack.setVisible(false);
            } else {
                sap.n.Launchpad.handleAppTitle(appTitle);

                let viewName = 'webapp:' + dataTile.actionWebApp + ':' + dataTile.urlApplication;
                let webApp = ModelData.FindFirst(AppCacheData, ['application', 'appPath'], [dataTile.actionWebApp, dataTile.urlApplication]);

                if (webApp) {

                    // Get App from Memory
                    if (AppCache.View[viewName]) {
                        AppCache.buildWebApp(dataTile, null, dataCat);
                        return;
                    }

                    // Get App from Cache
                    if (typeof p9Database !== 'undefined' && p9Database !== null) {
                        p9GetView(viewName).then(function (viewData) {
                            if (viewData.length > 10 && !webApp.invalid) {
                                AppCache.buildWebApp(dataTile, viewData, dataCat);
                            } else {
                                AppCache.getWebApp(dataTile, dataCat);
                            }
                        });
                    } else {
                        let data = sapStorageGet(viewName);
                        if (data && !webApp.invalid) {
                            AppCache.buildWebApp(dataTile, data, dataCat);
                        } else {
                            AppCache.getWebApp(dataTile, dataCat);
                        }
                    }
                } else {
                    AppCache.getWebApp(dataTile, dataCat);
                }
            }

            return;
        }

        // Application
        if (dataTile.actionApplication) {
            if (dataTile.openDialog) {
                AppCache.Load(dataTile.actionApplication, {
                    appGUID: dataTile.id,
                    appPath: dataTile.urlApplication,
                    appAuth: dataTile.urlAuth,
                    appType: dataTile.urlType,
                    dialogShow: true,
                    dialogTitle: appTitle,
                    sapICFNode: dataTile.sapICFNode || '',
                    dialogHeight: dataTile.dialogHeight || '90%',
                    dialogWidth: dataTile.dialogWidth || '1200px',
                    startParams: dataTile.actionParameters
                });

                sap.n.Launchpad.contextType = 'Tile';
                sap.n.Launchpad.contextTile = dataTile;
                location.hash = '';

            } else if (dataTile.openWindow) {
                let url = `/app/${dataTile.actionApplication}`;
                if (dataTile.isPublic) url = `/public/app/${dataTile.actionApplication}`;

                if (dataTile.urlApplication) url = `${dataTile.urlApplication}${url}`;
                else url = `${AppCache.Url}${url}`;

                if (AppCache.isMobile) {
                    window.open(url, '_blank', 'location=0,status=0');
                } else {
                    sap.m.URLHelper.redirect(url, dataTile.openWindow);
                }
            } else {
                // Start App
                sap.n.Launchpad.handleAppTitle(appTitle);
                sap.n.Launchpad.handleNavButton(dataTile, dataCat);
                sap.n.Launchpad.handleRunListApp(dataTile);

                AppCache.Load(dataTile.actionApplication, {
                    appGUID: dataTile.id,
                    appPath: dataTile.urlApplication,
                    appAuth: dataTile.urlAuth,
                    appType: dataTile.urlType,
                    sapICFNode: dataTile.sapICFNode,
                    startParams: dataTile.actionParameters,
                    openFullscreen: dataTile.openFullscreen
                });

                // Sidepanel User Assistance
                if (dataTile.enableDocumentation && !AppCache.isPublic) AppCacheShellHelp.setVisible(true);

                // Mark Open From 
                if (sap.n.Shell.openSidePanelApps[dataTile.actionApplication]) sap.n.Shell.openSidepanel();
            }
            
            return;
        }
    },

    handleAppTitle: function (appTitle) {
        if (sap.n.Layout.showAppTitle() && !AppCache.config.enableTopMenu) {
            AppCacheShellAppTitle.setText(appTitle || '');
        }
    },

    handleRunListApp: function (dataTile) {
        // Get Data from Fav List
        let rec = ModelData.FindFirst(AppCacheTilesRun, 'id', dataTile.id);

        // Update counter
        if (rec) {
            rec.sort = parseInt(rec.sort) + 1;
        } else {
            rec = dataTile;
            rec.sort = 1;
        }

        // Update Fav List
        ModelData.Update(AppCacheTilesRun, 'id', dataTile.id, rec);

        // Fix
        if (!modelAppCacheTilesRun.oData.length) modelAppCacheTilesRun.setData([]);

        // Only Last 10
        let sorted = modelAppCacheTilesRun.oData.sort(function (a, b) {
            if (a.sort > b.sort)
                return -1;
            if (a.sort < b.sort)
                return 1;
            return 0;
        });

        modelAppCacheTilesRun.setData(sorted.splice(0, 10));
        setCacheAppCacheTilesRun();
    },

    getIconUrl: function (dataTile) {
        if (dataTile.icon) return dataTile.icon;

        if (dataTile.actionType === 'F') return 'sap-icon://chart-table-view';
        else if (dataTile.actionApplication) return 'sap-icon://sys-monitor';

        return 'sap-icon://chain-link';
    },

    handleNavButton: function (dataTile, dataCat) {
        // Tree Menu - Active Apps
        const containerAppId = `${nepPrefix()}OpenAppContainer${dataTile.id}`;
        containerOpenApp = sap.ui.getCore().byId(containerAppId);

        if (!containerOpenApp) {
            containerOpenApp = new sap.m.HBox(containerAppId, {
                width: '100%',
                justifyContent: 'SpaceBetween',
                alignItems: 'Center'
            }).addStyleClass('nepOpenAppsContainer');

            let butOpenApp = new sap.m.Button(`${nepPrefix()}OpenApp${dataTile.id}`, {
                text: sap.n.Launchpad.translateTile('title', dataTile),
                icon: sap.n.Launchpad.getIconUrl(dataTile),
                iconFirst: true,
                press: function (oEvent) {
                    sap.n.Launchpad.HandleTilePress(dataTile, dataCat);
                    if (!AppCache.config.verticalMenu) sap.n.Launchpad.overflowMenuClose();
                }
            }).addStyleClass('nepOpenAppsBtn nepOpenAppsBtnItem');

            let butOpenAppClose = new sap.ui.core.Icon(nepId(), {
                size: '1.375rem',
                src: 'sap-icon://sys-cancel',
                press: function (oEvent) {
                    sap.n.Shell.closeTile(dataTile);
                }
            }).addStyleClass('nepOpenAppsClose');

            openApps.addItem(containerOpenApp);
            containerOpenApp.addItem(butOpenApp);
            containerOpenApp.addItem(butOpenAppClose);
            openAppMaster.setVisible(true);
        }

        // New Button - Side
        if (sap.n.Layout.activeAppsSide()) {
            const blockCellId = `but${dataTile.id}`;
            let oBlockCell = sap.ui.getCore().byId(blockCellId);
            if (!oBlockCell) {
                // Top
                let oBlockCell = new sap.ui.layout.BlockLayoutCell(blockCellId).addStyleClass('tileEmpty');
                sap.n.Launchpad.setBackgroundShade(dataTile, dataCat, oBlockCell, true);
                oBlockCell.addStyleClass('nepTileCardsRunning nepNavBarTile');

                let boxTop = new sap.m.FlexBox(nepId(), {
                    justifyContent: 'Start',
                    alignContent: 'Center',
                    height: '35px'
                });

                let boxIcon = new sap.m.VBox(nepId(), {
                    width: '38px'
                }).addStyleClass('nepNavBarBoxIcon');

                if (dataTile.cardImage) {
                    boxIcon.addItem(
                        new sap.m.Image(nepId(), {
                            src: dataTile.cardImage,
                            height: '37px',
                            densityAware: false,
                        })
                    );
                } else {
                    boxIcon.addItem(
                        new sap.ui.core.Icon(nepId(), {
                            src: sap.n.Launchpad.getIconUrl(dataTile),
                            size: '2rem',
                            useIconTooltip: false
                        })
                    );
                }

                let boxTitle = new sap.m.VBox(nepId(), {
                    width: '190px'
                }).addStyleClass('nepNavBarBoxTitle');

                let textTitle = new sap.m.Text(nepId(), {
                    wrapping: false,
                    text: sap.n.Launchpad.translateTile('title', dataTile),
                }).addStyleClass('nepNavBarTitle');

                let textSubTitle = new sap.m.Text(nepId(), {
                    wrapping: false,
                    text: sap.n.Launchpad.translateTile('subTitle', dataTile),
                }).addStyleClass('nepNavBarSubTitle');

                let boxActions = new sap.m.VBox(nepId(), {
                    justifyContent: 'Start',
                    width: '40px'
                });

                let butClose = new sap.m.Button(nepId(), {
                    type: 'Transparent',
                    icon: 'sap-icon://sys-cancel',
                    press: function (oEvent) {
                        sap.n.Shell.closeTile(dataTile);
                    }
                });

                let buttonStyle = sap.n.Launchpad.buildTileActionStyle(oBlockCell);
                butClose.addStyleClass('nepTileAction nepNavBarAction ' + buttonStyle);

                // Event - Click
                boxIcon.attachBrowserEvent('click', function (oEvent) {
                    sap.n.Launchpad.setActiveIcon(dataTile.id);
                    sap.n.Launchpad.HandleTilePress(dataTile, dataCat);
                    popNavBar.close();
                });

                // Placement
                oBlockCell.addContent(boxTop);
                boxTop.addItem(boxIcon);
                boxTop.addItem(boxTitle);
                boxTop.addItem(boxActions);
                boxTitle.addItem(textTitle);
                boxTitle.addItem(textSubTitle);
                boxActions.addItem(butClose);

                blockRunningRow.addContent(oBlockCell);

                if (!isTouchScreen() || isWidthGTE(1000)) {
                    oBlockCell.attachBrowserEvent('mouseenter', function (oEvent) {
                        blockPopoverRow.removeAllContent();
                        blockPopoverRow.addContent(sap.n.Launchpad.handlePopButton(dataTile, dataCat));

                        popNavBar.setPlacement('Right');
                        popNavBar.setOffsetX(-63);
                        popNavBar.setOffsetY(0);

                        setTimeout(function () {
                            popNavBar.openBy(oBlockCell);
                        }, 100);
                    });
                }

                sap.n.Layout.setHeaderPadding();
            }
        }

        if (sap.n.Layout.activeAppsTop()) {
            // New Button
            let tileButton = sap.ui.getCore().byId(`butTop${dataTile.id}`);
            if (!tileButton) {
                tileButton = new sap.m.Button(`butTop${dataTile.id}`, {
                    type: 'Transparent',
                    icon: sap.n.Launchpad.getIconUrl(dataTile),
                    press: function (oEvent) { sap.n.Launchpad.HandleTilePress(dataTile); }
                }).addStyleClass('nepTopMenuBtn nepTopMenuActive');

                AppCacheShellOpenApps.addItem(tileButton);

                if (!isTouchScreen() || isWidthGTE(1000)) {
                    tileButton.attachBrowserEvent('mouseenter', function (e) {
                        blockPopoverRow.removeAllContent();
                        blockPopoverRow.addContent(sap.n.Launchpad.handlePopButton(dataTile, dataCat));
                        popNavBar.setPlacement('Bottom');
                        popNavBar.setOffsetX(-150);
                        popNavBar.setOffsetY(4);

                        setTimeout(function () {
                            popNavBar.openBy(tileButton);
                        }, 100);
                    });
                }
            }
        }

        // Set Active 
        sap.n.Launchpad.setActiveIcon(dataTile.id);
    },

    handlePopButton: function (dataTile, dataCat) {
        // Top 
        let oBlockCell = new sap.ui.layout.BlockLayoutCell(nepId()).addStyleClass('nepIconActive nepTileCardsPop nepNavBarTile');

        sap.n.Launchpad.setBackgroundShade(dataTile, dataCat, oBlockCell, true);

        // oBlockCell.addStyleClass('nepTileCardsPop nepNavBarTile');

        let boxTop = new sap.m.FlexBox(nepId(), {
            justifyContent: 'Start',
            alignContent: 'Center',
            height: '35px'
        });

        let boxIcon = new sap.m.VBox(nepId(), {
            width: '38px'
        }).addStyleClass('nepNavBarBoxIcon');

        if (dataTile.cardImage) {
            let oBlockImage = new sap.m.Image(nepId(), {
                src: dataTile.cardImage,
                height: '37px',
                densityAware: false,
            });
            boxIcon.addItem(oBlockImage);
        } else {
            let oBlockIcon = new sap.ui.core.Icon(nepId(), {
                src: sap.n.Launchpad.getIconUrl(dataTile),
                size: '2rem',
                useIconTooltip: false
            });
            boxIcon.addItem(oBlockIcon);
        }

        let boxTitle = new sap.m.VBox(nepId(), {
            width: '190px'
        }).addStyleClass('nepNavBarBoxTitle');

        let textTitle = new sap.m.Text(nepId(), {
            wrapping: false,
            text: sap.n.Launchpad.translateTile('title', dataTile),
        }).addStyleClass('nepNavBarTitle');

        let textSubTitle = new sap.m.Text(nepId(), {
            wrapping: false,
            text: sap.n.Launchpad.translateTile('subTitle', dataTile),
        }).addStyleClass('nepNavBarSubTitle');

        let boxActions = new sap.m.VBox(nepId(), {
            justifyContent: 'Start',
            width: '40px'
        });

        let butClose = new sap.m.Button(nepId(), {
            type: 'Transparent',
            icon: 'sap-icon://sys-cancel',
            press: function (oEvent) {
                sap.n.Shell.closeTile(dataTile);
                popNavBar.close();
            }
        });

        let buttonStyle = sap.n.Launchpad.buildTileActionStyle(oBlockCell);
        butClose.addStyleClass('nepTileAction nepNavBarAction ' + buttonStyle);

        // Event - Click
        oBlockCell.attachBrowserEvent('click', function (oEvent) {
            sap.n.Launchpad.setActiveIcon(dataTile.id);
            sap.n.Launchpad.HandleTilePress(dataTile, dataCat);
            popNavBar.close();
        });

        // Placement
        oBlockCell.addContent(boxTop);
        boxTop.addItem(boxIcon);
        boxTop.addItem(boxTitle);
        boxTitle.addItem(textTitle);
        boxTitle.addItem(textSubTitle);
        boxTop.addItem(boxActions);
        boxActions.addItem(butClose);

        return oBlockCell;
    },

    isMenuPage: function () {
        let id = AppCacheNav.getCurrentPage().sId;
        id = id.split('page')[1];

        if (id) {
            const dataCatChild = ModelData.FindFirst(AppCacheCategoryChild, 'id', id);
            return dataCatChild ? false : true;
        }

        return false;
    },

    setMenuPage: function (dataCat) {
        // AppCacheShellUI.setAppWidthLimited(!dataCat.enableFullScreen);

        // Close Help
        AppCacheShellHelp.setVisible(false);
        sap.n.Shell.closeSidepanel();

        // Clear currentTile
        sap.n.Launchpad.currentTile = {};

        // Title
        sap.n.Launchpad.SetHeader();
    },

    handleFavRedraw: function () {
        // Rebuild Page if on Fav Tile Group
        let cat = AppCacheNav.getCurrentPage().sId;
        cat = cat.split('page')[1];

        let dataCat = ModelData.FindFirst(AppCacheCategory, 'id', cat);
        if (!dataCat) dataCat = ModelData.FindFirst(AppCacheCategoryChild, 'id', cat);

        // Check tilegroups on page 
        let favFound = false;

        dataCat.tilegroups.forEach(function (tilegroup) {
            let dataCatSub = ModelData.FindFirst(AppCacheCategory, 'id', tilegroup.id);
            if (!dataCatSub) dataCatSub = ModelData.FindFirst(AppCacheCategoryChild, 'id', tilegroup.id);
            if (dataCatSub && dataCatSub.inclFav) favFound = true;
        });

        if (dataCat && dataCat.inclFav) favFound = true;

        if (favFound) {
            this.reCreateCurrentPage();
        }

        sap.n.Launchpad.saveFav();
    },

    reCreateCurrentPage: function () {
        const current = AppCacheNav.getCurrentPage();
        const categoryId = current.sId.split('page')[1];

        const category = sap.n.Customization.getCategory(categoryId);
        
        this.destroyPage(current);
        if (category) sap.n.Launchpad.BuildTiles(category);
    },

    destroyPage: function (page) {
        if (!page) return;

        AppCacheNav.removePage(page);
        page.destroy();
    },

    saveFav: function () {
        if (!modelAppCacheTilesFav.oData.length) modelAppCacheTilesFav.oData = [];

        let favList = modelAppCacheTilesFav.oData.map(function (fav) {
            return {
                id: fav.id,
                cardWidth: fav.cardWidth,
                cardHeight: fav.cardHeight
            };
        });

        // Update P9 DB with data 
        sap.n.Planet9.function({
            id: dataSet,
            method: 'SaveFav',
            data: {
                tiles: favList,
                launchpad: AppCache.launchpadID,
            }
        });
    },

    setHideHeader: function (hideHeader) {
        if (AppCache.config && AppCache.config.hideTopHeader) return;
        topMenu.setHeight(hideHeader ? '0px' : '48px');
    },

    setHideTopButtons: function (hide) {
        if (hide) {
            if (!AppCache.StartApp && !AppCache.StartWebApp) AppCacheShellMenu.setVisible(!hide);
            if (!sap.n.Launchpad.hideBackIcon) AppCacheShellBack.setVisible(!hide);
        } else {
            if (!AppCache.StartApp && !AppCache.StartWebApp) AppCacheShellMenu.setVisible(hide);
            if (!sap.n.Launchpad.hideBackIcon) AppCacheShellBack.setVisible(hide);
        }
    },

    setActiveIcon: function (id) {
        // Sidebar
        blockRunningRow.getContent().forEach(function (data) {
            if (data.sId === `but${id}`) {
                data.addStyleClass('nepIconActive');
            } else {
                data.removeStyleClass('nepIconActive');
            }
        });

        // Header Icons
        AppCacheShellOpenApps.getItems().forEach(function (data) {
            if (data.sId === `butTop${id}`) {
                data.addStyleClass('nepTopMenuActive');
            } else {
                data.removeStyleClass('nepTopMenuActive');
            }
        });
    },

    getPageTitle: function (dataCat) {
        if (dataCat.isCustom) {
            return [dataCat.props.title, dataCat.props.subTitle];
        }

        return [
            sap.n.Launchpad.translateTile('title', dataCat),
            dataCat.subTitle ? sap.n.Launchpad.translateTile('subTitle', dataCat) : '',
        ];
    },

    buildGroupHeader: function (dataCat) {
        // unique CSS class for this header
        let id = `${nepPrefix()}CatHeader${dataCat.id}`;

        let panel = new sap.m.Panel(`${sectionPrefix()}-header-${dataCat.id}`, {
            backgroundDesign: 'Transparent',
            width: '100%'
        }).addStyleClass('nepCatPanel ' + id + ' sapUiNoContentPadding');

        if (dataCat.styleClass) panel.addStyleClass(dataCat.styleClass);

        // fixes aria-labelledby
        let headerToolbar = new sap.m.Toolbar('navBarToolbar' + dataCat.id, {
            visible: false
        });
        panel.setHeaderToolbar(headerToolbar);

        let vbox = new sap.m.VBox(nepId(), {
            alignItems: 'Start', //dataCat.titleAlignment || 'Start',
        }).addStyleClass('nepCatTitleLayout');
        panel.addContent(vbox);

        const [title, subTitle] = this.getPageTitle(dataCat);
        vbox.addItem(new sap.m.Title(nepId(), {
            level: 'H1',
            text: title
        }).addStyleClass('nepCatTitle'));
        panel.addStyleClass('nepCatTitleLayoutTitle');

        if (subTitle) {
            vbox.addItem(new sap.m.Title(nepId(), {
                level: 'H3',
                text: subTitle,
            }).addStyleClass('nepCatSubTitle'));
            panel.addStyleClass('nepCatTitleLayoutSubTitle');
        }

        return panel;
    },

    buildGroupMessage: function (dataCat) {
        let message = new sap.m.MessageStrip(nepId(), {
            type: dataCat.configMessage.type || 'None',
            text: dataCat.configMessage.text || '',
            showIcon: dataCat.configMessage.showIcon || false,
            customIcon: dataCat.configMessage.icon || '',
            showCloseButton: dataCat.configMessage.showCloseButton || false,
            enableFormattedText: true,
        });

        message.addStyleClass('nepTileCards');
        return message;
    },

    // TILES
    buildTileApplication: function (dataTile, tileWidth, dataCat) {
        let oBlockIcon;

        let oBlockCell = new sap.ui.layout.BlockLayoutCell(nepId(), {
            width: tileWidth,
            title: sap.n.Launchpad.translateTile('title', dataTile),
            titleAlignment: dataTile.titleAlignment || 'Begin',
            titleLevel: dataTile.titleLevel || 'Auto',
        }).addStyleClass('nepTileApplication');

        sap.n.Launchpad.setBackgroundShade(dataTile, dataCat, oBlockCell);

        let oBlockContentParent = new sap.m.VBox(nepId(), {
            justifyContent: 'SpaceBetween',
            height: 'calc(100% - 25px)'
        });

        let oBlockContentTop = new sap.m.VBox(nepId());

        oBlockCell.addContent(oBlockContentParent);
        oBlockContentParent.addItem(oBlockContentTop);

        // SubTitle - Box
        let oBlockContent = new sap.m.HBox(nepId(), {
            width: '100%',
            justifyContent: 'SpaceBetween'
        });

        // Reverse if title at End
        if (dataTile.titleAlignment === 'End') oBlockContent.setDirection('RowReverse');

        oBlockContent.addStyleClass('sapUiSmallMarginBottom');
        oBlockContentTop.addItem(oBlockContent);

        // SubTitle
        if (dataTile.subTitle) {
            let oBlockInfo = new sap.m.Text(nepId(), {
                text: sap.n.Launchpad.translateTile('subTitle', dataTile)
            });

            oBlockContent.addItem(oBlockInfo);
            oBlockInfo.addStyleClass('nepTileSubTitle');
        }

        if (dataTile.icon) {

            if (dataTile.icon.indexOf('sap-icon') > -1) {
                oBlockIcon = new sap.ui.core.Icon(nepId(), {
                    src: dataTile.icon,
                    size: '1.5rem',
                    useIconTooltip: false
                });
            } else {
                oBlockIcon = new sap.m.Image(nepId(), {
                    src: dataTile.icon,
                    width: '38px',
                    densityAware: false,
                });
            }

            if (dataTile.titleAlignment === 'End') {
                oBlockIcon.addStyleClass('nepTileIconLeft');
            } else {
                oBlockIcon.addStyleClass('nepTileIconRight');
            }

            oBlockContent.addItem(oBlockIcon);
        }

        let oBlockContentApp = new sap.m.Panel(nepId(), {
            backgroundDesign: 'Transparent'
        });
        oBlockContentApp.addStyleClass('sapUiNoContentPadding');

        oBlockContentTop.addItem(oBlockContentApp);

        // Load Application
        if (dataTile.tileApplication) {
            AppCache.Load(dataTile.tileApplication, {
                parentObject: oBlockContentApp,
                startParams: dataTile.actionParameters,
                sapICFNode: dataTile.sapICFNode
            });
        }

        // Actions 
        sap.n.Launchpad.buildTileAction(dataTile, oBlockContentParent, oBlockCell, dataCat);
        return oBlockCell;
    },

    buildTileSubHeader: function (dataTile, tileWidth, dataCat) {
        let oBlockCell = new sap.ui.layout.BlockLayoutCell(nepId(), {
            width: tileWidth,
            title: sap.n.Launchpad.translateTile('title', dataTile),
            titleAlignment: dataTile.titleAlignment || 'Begin',
        });

        sap.n.Launchpad.setBackgroundShade(dataTile, dataCat, oBlockCell);

        if (dataTile.image) {
            let imageUrl;
            let inlineStyle = new sap.ui.core.HTML(nepId());

            if (AppCache.isMobile) {
                imageUrl = dataTile.imageData;
            } else {
                imageUrl = AppCache.Url + dataTile.image;
            }

            inlineStyle.setDOMContent(`
                <style>
                .tileImage${dataTile.id} {
                    background-image: url('${imageUrl}');
                    background-size: 100% auto;
                    background-position: 0 80%;
                }
                </style>
            `);

            oBlockCell.addStyleClass('tileImage' + dataTile.id);
            oBlockCell.addContent(inlineStyle);
        }

        let oHeaderInfoText = new sap.m.Text(nepId(), {
            textAlign: 'Begin',
            width: '100%',
            text: sap.n.Launchpad.translateTile('subTitle', dataTile),
        });
        oBlockCell.addContent(oHeaderInfoText);

        return oBlockCell;
    },

    // device = mobile, tablet or desktop
    getTileGroupHeaderBackgroundCSS: function (dataCat, device) {
        let url;
        let position, defaultPosition = 'center center';
        let size, defaultSize = 'cover';
        let repeat, defaultRepeat = 'no-repeat';
        let height, defaultHeight = '82px';

        if (device === 'mobile') {
            url = dataCat.imageMobile;
            position = dataCat.imageMobilePlacement;
            size = dataCat.imageMobileSize;
            repeat = dataCat.imageMobileRepeat;
            height = dataCat.imageMobileHeight;
        } else if (device === 'tablet') {
            url = dataCat.imageTablet;
            position = dataCat.imageTabletPlacement;
            size = dataCat.imageTabletSize;
            repeat = dataCat.imageTabletRepeat;
            height = dataCat.imageTabletHeight;
        } else if (device === 'desktop') {
            url = dataCat.image;
            position = dataCat.imagePlacement;
            size = dataCat.imageSize;
            repeat = dataCat.imageRepeat;
            height = dataCat.imageHeight;
        }

        if (url) {
            let id = `${nepPrefix()}CatHeader${dataCat.id}`;
            lazyLoadImage(`${AppCache.Url}${url}`, `.${id} .sapMPanelContent`, 'style');
        }

        return `
            height: ${height || defaultHeight} !important;
            background-repeat: ${repeat || defaultRepeat};
            background-position: ${position || defaultPosition};
            background-size: ${size || defaultSize};
        `;
    },

    buildHeaderCss: function (dataCat) {
        let css = '';
        let id = `${nepPrefix()}CatHeader${dataCat.id}`;
        let borderWidth = dataCat.headBorderWidth || '3px';

        const idClass = `.${id}`;
        if (dataCat.headColor) css += `${idClass} { background-color: ${dataCat.headColor}; }`;
        if (dataCat.headTxtClr) css += `${idClass} .nepCatTitle.sapMTitle { color: ${dataCat.headTxtClr} !important; }`;
        if (dataCat.subheadTxtClr) css += `${idClass} .nepCatSubTitle.sapMTitle { color: ${dataCat.subheadTxtClr} !important; }`;
        if (dataCat.headBorderClr) css += `${idClass} { border-bottom: ${borderWidth} solid ${dataCat.headBorderClr}; }`;

        if (dataCat.imageMobile) {
            css += `
                .nepGridSmall .${id} .sapMPanelContent,
                .nepGridXSmall .${id} .sapMPanelContent {
                    ${this.getTileGroupHeaderBackgroundCSS(dataCat, 'mobile')}
                }
            `;
        }

        if (dataCat.imageTablet) {
            css += `
                .nepGridMedium .${id} .sapMPanelContent {
                    ${this.getTileGroupHeaderBackgroundCSS(dataCat, 'tablet')}
                }
            `;
        }

        if (dataCat.image) {
            css += `
                .${id} .sapMPanelContent {
                    ${this.getTileGroupHeaderBackgroundCSS(dataCat, 'desktop')}
                }
            `;
        }

        return css;
    },

    buildContentCss: function () {
        let css = '';

        // CSS - Tile Groups
        modelAppCacheCategory.oData.forEach(function (dataCat) {
            css += sap.n.Launchpad.buildHeaderCss(dataCat);
            dataCat.tilegroups.forEach(function (data) {
                let dataCatChild = ModelData.FindFirst(AppCacheCategory, 'id', data.id);
                if (!dataCatChild) dataCatChild = ModelData.FindFirst(AppCacheCategoryChild, 'id', data.id);
                if (dataCatChild) css += sap.n.Launchpad.buildHeaderCss(dataCatChild);
            });
        });

        // CSS - Tiles
        css += sap.n.Launchpad.buildTileCss();
        return css;
    },

    buildTileCss: function () {
        let css = '';
        Array.isArray(modelAppCacheTiles.oData) && modelAppCacheTiles.oData.forEach(function (dataTile) {
            // Background Image
            if (dataTile.image) {
                let imageUrl = AppCache.Url + dataTile.image;
                if (AppCache.isMobile) imageUrl = dataTile.imageData || imageUrl;

                let repeat = (!!dataTile.imageRepeat) ? dataTile.imageRepeat : 'no-repeat';
                let size = (!!dataTile.imageSize) ? dataTile.imageSize : 'cover';
                let position = (!!dataTile.imagePlacement) ? dataTile.imagePlacement : 'center';

                if (dataTile.imagePosition === 'cover') {
                    css += `
                        .tile${dataTile.id} {
                            background-image: url('${emptyBase64Image()}');
                            background-repeat: ${repeat};
                            background-size: ${size};
                            background-position: ${position};
                        }
                    `;
                    lazyLoadImage(imageUrl, `.tile${dataTile.id}`, 'style');
                } else {
                    const sel = (dataTile.imagePosition === 'top') ? 'Top' : 'Inline';
                    css += `
                        .tile${sel}Image${dataTile.id} {
                            max-height: 100%;
                            object-fit: ${size};
                            object-position: ${position};
                        }
                    `;
                }
            }
        });

        return css;
    },

    setBackgroundShade: function (dataTile, dataCat, oBlockCell, isIcon) {
        // Cards Handling
        if (sap.n.Launchpad.cardsAvailable) {
            sap.n.Card.setBackgroundShade(dataTile, dataCat, oBlockCell, isIcon);
            return;
        }

        let backgroundColor, backgroundShade;

        if (typeof dataCat === 'undefined') dataCat = {};

        // Styleclasses 
        if (!isIcon) oBlockCell.addStyleClass('nepTile');
        if (dataCat.styleClass) oBlockCell.addStyleClass(dataCat.styleClass);
        if (dataTile.styleClass) oBlockCell.addStyleClass(dataTile.styleClass);
        if (dataCat.enableCards && !isIcon) oBlockCell.addStyleClass('nepTileCards');

        if (dataCat.backgroundType === 'Default' || dataCat.backgroundType === 'cards') {
            if (dataCat.enableShadeCalc) {
                switch (sap.n.Launchpad.backgroundShade) {
                    case 'ShadeA':
                        sap.n.Launchpad.backgroundShade = 'ShadeB';
                        break;

                    case 'ShadeB':
                        sap.n.Launchpad.backgroundShade = 'ShadeC';
                        break;

                    case 'ShadeC':
                        sap.n.Launchpad.backgroundShade = 'ShadeD';
                        break;

                    default:
                        sap.n.Launchpad.backgroundShade = 'ShadeA';
                        break;
                }
            } else {
                sap.n.Launchpad.backgroundShade = dataCat.backgroundShade;
            }

            backgroundColor = dataTile.backgroundColor || dataCat.backgroundColor || '';
            backgroundShade = dataTile.backgroundShade || sap.n.Launchpad.backgroundShade || 'ShadeA';

        } else if (dataCat.backgroundType === 'Dashboard' && isIcon) {
            backgroundColor = '';
            backgroundShade = sap.n.Launchpad.backgroundShade;
        }

        if (backgroundColor) oBlockCell.setBackgroundColorSet(backgroundColor);
        if (backgroundShade) oBlockCell.setBackgroundColorShade(backgroundShade);

    },

    buildTileDefault: function (dataTile, tileWidth, dataCat, isMostUsed) {
        // Top 
        let oBlockCell = new sap.ui.layout.BlockLayoutCell(nepId(), {
            title: sap.n.Launchpad.translateTile('title', dataTile),
            titleAlignment: dataTile.titleAlignment || 'Begin',
            titleLevel: dataTile.titleLevel || 'Auto',
            width: tileWidth,
        }).addStyleClass('nepTile');

        sap.n.Launchpad.setBackgroundShade(dataTile, dataCat, oBlockCell);

        let oBlockContentParent = new sap.m.VBox(nepId(), {
            justifyContent: 'SpaceBetween',
            height: 'calc(100% - 25px)'
        });

        let oBlockContentTop = new sap.m.VBox(nepId());

        oBlockCell.addContent(oBlockContentParent);
        oBlockContentParent.addItem(oBlockContentTop);

        // SubTitle - Box
        let oBlockContent = new sap.m.HBox(nepId(), {
            width: '100%',
            justifyContent: 'SpaceBetween'
        });

        // Reverse if title at End
        if (dataTile.titleAlignment === 'End') oBlockContent.setDirection('RowReverse');

        oBlockContent.addStyleClass('sapUiSmallMarginBottom');
        oBlockContentTop.addItem(oBlockContent);

        // SubTitle
        if (dataTile.subTitle) {
            let oBlockInfo = new sap.m.Text(nepId(), {
                text: sap.n.Launchpad.translateTile('subTitle', dataTile)
            });

            oBlockContent.addItem(oBlockInfo);
            oBlockInfo.addStyleClass('nepTileSubTitle');
        }

        if (dataTile.icon) {
            let oBlockIcon;
            if (dataTile.icon.indexOf('sap-icon') > -1) {
                oBlockIcon = new sap.ui.core.Icon(nepId(), {
                    src: dataTile.icon,
                    size: '1.5rem',
                    useIconTooltip: false
                });
            } else {
                oBlockIcon = new sap.m.Image(nepId(), {
                    src: dataTile.icon,
                    width: '38px',
                    densityAware: false,
                });
            }

            if (dataTile.titleAlignment === 'End') {
                oBlockIcon.addStyleClass('nepTileIconLeft');
            } else {
                oBlockIcon.addStyleClass('nepTileIconRight');
            }

            oBlockContent.addItem(oBlockIcon);
        }

        // With Description
        if (dataTile.type === 'carddesc') {
            let textDescription = new sap.m.Text(nepId(), {
                text: sap.n.Launchpad.translateTile('description', dataTile)
            });
            textDescription.addStyleClass('nepTileDescription');
            oBlockContentTop.addItem(textDescription);
        }

        if (!isMostUsed) {
            // Image - background or image card
            if (dataTile.image) {
                let imageUrl;
                let inlineStyle = new sap.ui.core.HTML(nepId());

                if (AppCache.isMobile) {
                    imageUrl = dataTile.imageData;
                } else {
                    imageUrl = AppCache.Url + dataTile.image;
                }

                inlineStyle.setDOMContent(`
                    <style>
                    .tileImage${dataTile.id} {
                        background-image: url('${imageUrl}');
                        background-size: cover;
                        background-position: 0 80%;
                    }
                    </style>
                `);

                oBlockCell.addStyleClass('tileImage' + dataTile.id);
                oBlockCell.addContent(inlineStyle);
            }
        }

        // Actions
        sap.n.Launchpad.buildTileAction(dataTile, oBlockContentParent, oBlockCell, dataCat);
        return oBlockCell
    },

    translateTile: function (field, dataTile) {
        if (!dataTile) return;
        if (dataTile[field] === null || dataTile[field] === 'null' || typeof dataTile[field] === 'undefined') return '';

        let text = dataTile[field];

        if (!dataTile.translation || dataTile.translation === '[]' || dataTile.translation.length === 0) return text;

        dataTile.translation.forEach(function (data) {
            if (data.language === AppCache.userInfo.language) text = data[field];
        });

        return text;
    },

    buildTileAction: function (dataTile, parent, oBlockCell, dataCat) {
        let buttonStyle = sap.n.Launchpad.buildTileActionStyle(oBlockCell);
        let supportedBrowser = true;
        let openEnabled = true;

        let oBlockContent = new sap.m.HBox(nepId());
        oBlockContent.addStyleClass('nepTileAction sapUiSizeCompact');

        // Check Offline Mode -> Disable Open button 
        if (AppCache.isOffline) {
            if (dataTile.actionURL) openEnabled = false;
            if (dataTile.type === 'storeitem') openEnabled = false;

            if (dataTile.actionApplication) {
                let app = ModelData.FindFirst(AppCacheData,
                    ['application', 'language', 'appPath'],
                    [dataTile.actionApplication.toUpperCase(),
                    AppCache.userInfo.language,
                    dataTile.urlApplication || '']);
                if (!app) openEnabled = false;
            }

            if (dataTile.actionWebApp) {
                if (dataTile.openWindow) {
                    openEnabled = false;
                } else {
                    let viewName = 'webapp:' + dataTile.actionWebApp + ':' + dataTile.urlApplication;

                    // Get App from Cache
                    if (typeof p9Database !== 'undefined' && p9Database !== null) {
                        p9GetView(viewName.toUpperCase()).then(function (viewData) {
                            if (viewData.length < 10) openEnabled = false;
                        });
                    } else {
                        if (!sapStorageGet(viewName.toUpperCase())) openEnabled = false;
                    }
                }
            }
        }

        // Check usage of Remote Systems 
        if (dataTile.urlApplication && !AppCache.userInfo.azureToken) openEnabled = false;

        // Supported Browsers
        if (sap.ui.Device.os.name === 'win' && dataTile.browserBlockWin && dataTile.browserBlockWin !== '[]' && dataTile.browserBlockWin.indexOf(sap.ui.Device.browser.name) === -1) {
            supportedBrowser = false;
        }

        if (sap.ui.Device.os.name === 'mac' && dataTile.browserBlockMac && dataTile.browserBlockWin !== '[]' && dataTile.browserBlockMac.indexOf(sap.ui.Device.browser.name) === -1) {
            supportedBrowser = false;
        }

        if (dataTile.actionApplication || dataTile.actionWebApp || dataTile.actionURL || dataTile.actiongroup || dataTile.type === 'storeitem') {
            if (supportedBrowser) {
                if (dataTile.blackoutEnabled) {
                    let butStart = new sap.m.Button(nepId(), {
                        text: dataTile.blackoutText,
                        type: 'Emphasized',
                        press: function (oEvent) {
                            descBlackout.editor.setData(dataTile.blackoutDescription);
                            popBlackout.openBy(this);
                        }
                    });

                    butStart.addStyleClass('nepTileAction sapUiTinyMarginEnd nepTileBlackout ' + buttonStyle);
                } else {
                    if (dataTile.openClickTile) {
                        if (openEnabled) {
                            oBlockCell.attachBrowserEvent('click', function (oEvent) {
                                setTimeout(function () {
                                    if (sap.n.Launchpad.favInProcess) {
                                        sap.n.Launchpad.favInProcess = false;
                                    } else {
                                        sap.n.Launchpad.HandleTilePress(dataTile, dataCat);
                                    }
                                }, 50);
                            });

                            oBlockCell.addStyleClass('nepNavBarTile');
                        }

                    } else {
                        let butStart = new sap.m.Button(nepId(), {
                            text: AppCache_tOpen.getText(),
                            type: 'Emphasized',
                            enabled: openEnabled,
                            press: function (oEvent) {
                                sap.n.Launchpad.HandleTilePress(dataTile, dataCat);
                            }
                        });

                        butStart.addStyleClass('nepTileAction sapUiTinyMarginEnd ' + buttonStyle);
                    }
                }
            } else {
                let butStart = new sap.m.Button(nepId(), {
                    text: AppCache_tIncompatible.getText(),
                    iconFirst: false,
                    enabled: openEnabled,
                    type: 'Emphasized',
                    icon: 'sap-icon://sys-help',
                    press: function (oEvent) {
                        let browsers;

                        if (sap.ui.Device.os.name === 'win') browsers = JSON.parse(dataTile.browserBlockWin);
                        if (sap.ui.Device.os.name === 'mac') browsers = JSON.parse(dataTile.browserBlockMac);

                        const m = {
                            'cr': 'Chrome',
                            'ed': 'Edge',
                            'ff': 'Firefox',
                            'ie': 'Internet Explorer',
                            'op': 'Opera',
                            'sf': 'Safari',
                        };

                        let array = browsers.map(function (k) {
                            return { name: m[k] };
                        });
                        array.sort(sort_by('name'));
                        modellistSupportedBrowsers.setData(array);
                        popSupportedBrowsers.openBy(this);
                    }
                });

                butStart.addStyleClass('nepTileAction nepTileBlocked sapUiTinyMarginEnd ' + buttonStyle);
                oBlockContent.addItem(butStart);
            }

            let butFavAdd = new sap.m.Button(`${nepPrefix()}FavAdd${dataTile.id}`, {
                tooltip: AppCache_tAddFav.getText(),
                icon: 'sap-icon://unfavorite',
                type: 'Emphasized',
                press: function (oEvent) {
                    sap.n.Launchpad.favInProcess = true;

                    ModelData.Update(AppCacheTilesFav, 'id', dataTile.id, dataTile);
                    setCacheAppCacheTilesFav();

                    butFavDel.setVisible(true);
                    butFavAdd.setVisible(false);

                    sap.n.Launchpad.handleFavRedraw();
                }
            });

            butFavAdd.addStyleClass('nepTileAction ' + buttonStyle);

            let butFavDel = new sap.m.Button(`${nepPrefix()}FavDel${dataTile.id}`, {
                tooltip: AppCache_tDelFav.getText(),
                icon: 'sap-icon://favorite',
                type: 'Emphasized',
                press: function (oEvent) {
                    sap.n.Launchpad.favInProcess = true;
                    sap.n.Utils.message({
                        title: AppCache_tFavTitle.getText(),
                        intro: AppCache_tFavConfirm.getText(),
                        text1: AppCache_tDelFavConfirm.getText(),
                        state: 'Warning',
                        acceptText: AppCache_tDelFavRemove.getText(),
                        onAccept: function (oAction) {
                            ModelData.Delete(AppCacheTilesFav, 'id', dataTile.id);
                            setCacheAppCacheTilesFav();

                            let butFavAdd = sap.ui.getCore().byId(`${nepPrefix()}FavAdd${dataTile.id}`);
                            if (butFavAdd) butFavAdd.setVisible(true);

                            sap.n.Launchpad.handleFavRedraw();
                        }
                    });
                }
            });

            butFavDel.addStyleClass('nepTileAction ' + buttonStyle);

            // Fav
            let rec = ModelData.Find(AppCacheTilesFav, 'id', dataTile.id);

            if (rec.length) {
                butFavAdd.setVisible(false);
                butFavDel.setVisible(true);
            } else {
                butFavAdd.setVisible(true);
                butFavDel.setVisible(false);
            }

            if (!dataTile.openClickTile || dataTile.blackoutEnabled) oBlockContent.addItem(butStart);

            if (!AppCache.isPublic && sap.n.Launchpad.enableFav && !AppCache.isOffline) {
                oBlockContent.addItem(butFavAdd);
                oBlockContent.addItem(butFavDel);
            }

        }

        // Help 
        if (dataTile.helpEnabled) {
            let butHelp = new sap.m.Button(nepId(), {
                tooltip: AppCache_tHelp.getText(),
                icon: 'sap-icon://sys-help',
                type: 'Transparent',
                press: function (oEvent) {
                    descBlackout.editor.setData(dataTile.helpText);
                    popBlackout.openBy(this);
                }
            });

            oBlockContent.addItem(butHelp);
        }


        // Footer
        if (dataTile.footer) {
            let boxFooter = new sap.m.HBox(nepId(), {
                width: '100%',
                justifyContent: 'End',
                alignContent: 'Center'
            });
            let footer = new sap.m.Text(nepId(), {
                text: sap.n.Launchpad.translateTile('footer', dataTile)
            });
            footer.addStyleClass('nepTileFooter');
            boxFooter.addItem(footer);
            oBlockContent.addItem(boxFooter);
        }

        parent.addItem(oBlockContent);
    },

    buildTileActionStyle: function (oBlockCell) {
        let color = oBlockCell.getBackgroundColorSet();

        if (color) {
            color = color.split('ColorSet')[1];
        } else {
            color = 5;
        }
        return 'nepTileAction' + color;
    },

    buildTileIntegrationCard: function (dataTile, tileWidth, dataCat) {

        if (!sap.ui.integration) sap.ui.getCore().loadLibrary("sap.ui.integration")

        let oBlockCell = new sap.ui.layout.BlockLayoutCell(nepId(), {
            width: tileWidth,
        }).addStyleClass('nepTileIntegartionCard');

        oBlockCell.addStyleClass('sapUiNoContentPadding');

        sap.n.Launchpad.setBackgroundShade(dataTile, dataCat, oBlockCell);

        let oBlockContentParent = new sap.m.VBox(nepId(), {
            justifyContent: 'SpaceBetween',
            height: 'calc(100% - 25px)'
        });

        let oBlockContentTop = new sap.m.VBox(nepId());
        let oBlockContentAction = new sap.m.VBox(nepId());

        oBlockContentAction.addStyleClass('sapUiContentPadding');

        oBlockCell.addContent(oBlockContentParent);
        oBlockContentParent.addItem(oBlockContentTop);
        oBlockContentParent.addItem(oBlockContentAction);

        let objectId = 'intcard' + ModelData.genID();
        let pageId = 'page' + dataCat.id;

        let intCard = new sap.ui.integration.widgets.Card(objectId, {
            manifest: dataTile.dataUrl,
        });

        oBlockContentTop.addItem(intCard);

        // Pull Interval
        if (dataTile.dataInterval && dataTile.dataInterval !== '0' && !sap.n.Launchpad.Timers[objectId]) {

            sap.n.Launchpad.Timers[objectId] = {
                timer: setInterval(function () {
                    if (sap.n.Launchpad.Timers[objectId].pageId !== AppCacheNav.getCurrentPage().sId) return;

                    let card = sap.ui.getCore().byId(objectId);
                    if (card) card.refresh();

                }, dataTile.dataInterval * 1000),
                pageId: pageId
            };
        }

        // Actions
        sap.n.Launchpad.buildTileAction(dataTile, oBlockContentAction, oBlockCell, dataCat);
        return oBlockCell;
    },

    buildTileHighchart: function (dataTile, tileWidth, dataCat) {
        let oBlockCell = new sap.ui.layout.BlockLayoutCell(nepId(), {
            title: sap.n.Launchpad.translateTile('title', dataTile),
            titleAlignment: dataTile.titleAlignment || 'Begin',
            titleLevel: dataTile.titleLevel || 'Auto',
            width: tileWidth,
        }).addStyleClass('nepTileHighchart');

        sap.n.Launchpad.setBackgroundShade(dataTile, dataCat, oBlockCell);

        let oBlockContentParent = new sap.m.VBox(nepId(), {
            justifyContent: 'SpaceBetween',
            height: 'calc(100% - 25px)'
        });

        let oBlockContentTop = new sap.m.VBox(nepId());

        oBlockCell.addContent(oBlockContentParent);
        oBlockContentParent.addItem(oBlockContentTop);

        // SubTitle - Box
        let oBlockContent = new sap.m.HBox(nepId(), {
            width: '100%',
            justifyContent: 'SpaceBetween'
        });

        // Reverse if title at End
        if (dataTile.titleAlignment === 'End') oBlockContent.setDirection('RowReverse');

        oBlockContent.addStyleClass('sapUiSmallMarginBottom');
        oBlockContentTop.addItem(oBlockContent);

        // SubTitle
        if (dataTile.subTitle) {
            let oBlockInfo = new sap.m.Text(nepId(), {
                text: sap.n.Launchpad.translateTile('subTitle', dataTile)
            });

            oBlockContent.addItem(oBlockInfo);
            oBlockInfo.addStyleClass('nepTileSubTitle');
        }

        if (dataTile.icon) {
            let oBlockIcon;
            if (dataTile.icon.indexOf('sap-icon') > -1) {
                oBlockIcon = new sap.ui.core.Icon(nepId(), {
                    src: dataTile.icon,
                    size: '1.4rem',
                    useIconTooltip: false
                });
            } else {
                oBlockIcon = new sap.m.Image(nepId(), {
                    src: dataTile.icon,
                    width: '32px',
                    densityAware: false,
                });
            }
            oBlockContent.addItem(oBlockIcon);
        }

        let chartId = `chart${ModelData.genID()}`;
        let pageId = `page${dataCat.id}`;

        let oHighchart;
        let oHighchartHTML = new sap.ui.core.HTML(nepId(), {
            content: `<div id='${chartId}' style='height: 100%; width: 100%'></div>`,
            afterRendering: function (oEvent) {
                let chartData = localStorage.getItem('p9TileChart' + dataTile.id);
                if (chartData) {
                    let chartData = JSON.parse(chartData);
                    if (!chartData.chart) chartData.chart = {};
                    chartData.chart.renderTo = chartId;
                    oHighchart = Highcharts.chart(chartData);
                } else {
                    oHighchart = Highcharts.chart({
                        chart: {
                            height: 100,
                            renderTo: chartId,
                            style: { fontFamily: '72' }
                        },
                        credits: { enabled: false },
                        title: { text: '' },
                        subTitle: { text: '' },
                        series: []
                    });
                }

                // Fetch Data 
                if (dataTile.dataUrl) {
                    // Trigger Pull 1. Time
                    setTimeout(function () {
                        sap.n.Launchpad.getHighchartData(dataTile, oHighchart, pageId, chartId, 'start');
                    }, 100);

                    // Pull Interval
                    if (dataTile.dataInterval && dataTile.dataInterval !== '0' && !sap.n.Launchpad.Timers[chartId]) {
                        sap.n.Launchpad.Timers[chartId] = {
                            timer: setInterval(function () {
                                if (sap.n.Launchpad.Timers[chartId].pageId !== AppCacheNav.getCurrentPage().sId) return;
                                sap.n.Launchpad.getHighchartData(dataTile, oHighchart, pageId, chartId, 'continue');
                            }, dataTile.dataInterval * 1000),
                            pageId: pageId
                        };
                    }
                }
            }
        });

        oBlockContentTop.addItem(oHighchartHTML);

        // Actions
        sap.n.Launchpad.buildTileAction(dataTile, oBlockContentParent, oBlockCell, dataCat);

        return oBlockCell;
    },

    buildTileHighstock: function (dataTile, tileWidth, dataCat) {
        let oBlockCell = new sap.ui.layout.BlockLayoutCell(nepId(), {
            title: sap.n.Launchpad.translateTile('title', dataTile),
            titleAlignment: dataTile.titleAlignment || 'Begin',
            titleLevel: dataTile.titleLevel || 'Auto',
            width: tileWidth,
        }).addStyleClass('nepTileHighstock');

        sap.n.Launchpad.setBackgroundShade(dataTile, dataCat, oBlockCell);

        let oBlockContentParent = new sap.m.VBox(nepId(), {
            justifyContent: 'SpaceBetween',
            height: 'calc(100% - 25px)'
        });

        let oBlockContentTop = new sap.m.VBox(nepId());

        oBlockCell.addContent(oBlockContentParent);
        oBlockContentParent.addItem(oBlockContentTop);

        // SubTitle - Box
        let oBlockContent = new sap.m.HBox(nepId(), {
            width: '100%',
            justifyContent: 'SpaceBetween'
        });

        // Reverse if title at End
        if (dataTile.titleAlignment === 'End') oBlockContent.setDirection('RowReverse');

        oBlockContent.addStyleClass('sapUiSmallMarginBottom');
        oBlockContentTop.addItem(oBlockContent);

        // SubTitle
        if (dataTile.subTitle) {
            let oBlockInfo = new sap.m.Text(nepId(), {
                text: sap.n.Launchpad.translateTile('subTitle', dataTile)
            });

            oBlockContent.addItem(oBlockInfo);
            oBlockInfo.addStyleClass('nepTileSubTitle');
        }

        if (dataTile.icon) {
            let oBlockIcon;
            if (dataTile.icon.indexOf('sap-icon') > -1) {
                oBlockIcon = new sap.ui.core.Icon(nepId(), {
                    src: dataTile.icon,
                    size: '1.4rem',
                    useIconTooltip: false
                });
            } else {
                oBlockIcon = new sap.m.Image(nepId(), {
                    src: dataTile.icon,
                    width: '32px',
                    densityAware: false,
                });
            }
            oBlockContent.addItem(oBlockIcon);
        }

        const chartId = 'chart' + ModelData.genID();
        const pageId = 'page' + dataCat.id;

        let oHighchart;
        let oHighchartHTML = new sap.ui.core.HTML(nepId(), {
            content: `<div id="${chartId}" style="height: 100%px; width: 100%"></div>`,
            afterRendering: function (oEvent) {
                oHighchart = Highcharts.stockChart({
                    chart: {
                        height: 100,
                        renderTo: chartId,
                        style: { fontFamily: '72' }
                    },
                    credits: { enabled: false },
                    title: { text: '' },
                    subTitle: { text: '' },
                    series: []
                });

                // Fetch Data 
                if (dataTile.dataUrl) {
                    // Trigger Pull 1. Time
                    setTimeout(function () {
                        sap.n.Launchpad.getHighstockData(dataTile, oHighchart, pageId, chartId, 'start');
                    }, 100);

                    // Pull Interval
                    if (dataTile.dataInterval && dataTile.dataInterval !== '0' && !sap.n.Launchpad.Timers[chartId]) {
                        sap.n.Launchpad.Timers[chartId] = {
                            timer: setInterval(function () {
                                if (sap.n.Launchpad.Timers[chartId].pageId !== AppCacheNav.getCurrentPage().sId) return;
                                sap.n.Launchpad.getHighstockData(dataTile, oHighchart, pageId, chartId, 'continue');
                            }, dataTile.dataInterval * 1000),
                            pageId: pageId
                        };
                    }
                }
            }
        });

        oBlockContentTop.addItem(oHighchartHTML);

        // Actions
        sap.n.Launchpad.buildTileAction(dataTile, oBlockContentParent, oBlockCell, dataCat);
        return oBlockCell;
    },


    getHighchartData: function (dataTile, chart, pageId, chartId, init) {
        let url = dataTile.dataUrl;
        let querySep = '?';

        if (url.indexOf('http') === -1) url = AppCache.Url + url;

        // Add URL Query
        if (url.indexOf('?') > -1) querySep = '&';
        url = url + querySep + 'init=' + init;

        request({
            type: 'GET',
            contentType: 'application/json',
            url: url,
            success: function (data) {
                if (!chart) return;
                if (!chart.series) return;

                // Save to cache 
                localStorage.setItem('p9TileChart' + dataTile.id, JSON.stringify(data));

                // Only redraw chart when number of series changes.
                if (Array.isArray(data.series) && Array.isArray(chart.series) && chart.series.length !== data.series.length) {
                    Array.isArray(data.series) && data.series.forEach(function (serie) {
                        chart.addSeries(serie, false);
                    });
                    chart.update(data);
                    chart.redraw();
                } else {
                    // Only update series values to get animation
                    let seriesData = [];
                    Array.isArray(data.series) && data.series.forEach(function (serie, i) {
                        chart.series[i].setData(serie.data);
                    });
                }
            },
            error: function (result, status) {
                if (sap.n.Launchpad.Timers[chartId]) clearInterval(sap.n.Launchpad.Timers[chartId].timer);
            }
        });

    },

    getHighstockData: function (dataTile, chart, pageId, chartId, init) {
        let url = dataTile.dataUrl;
        let querySep = '?';

        if (url.indexOf('http') === -1) url = AppCache.Url + url;

        // Add URL Query
        if (url.indexOf('?') > -1) querySep = '&';
        url = url + querySep + 'init=' + init;

        request({
            type: 'GET',
            contentType: 'application/json',
            url: url,
            success: function (data) {
                if (!chart) return;
                if (!chart.series) return;

                // Only redraw chart when number of series changes.
                if (chart.series.length === 0) {
                    data.series.forEach(function (serie) {
                        chart.addSeries(serie, false);
                    });
                    chart.update(data);
                    chart.redraw();
                } else {
                    // Only update series values to get animation
                    let seriesData = [];
                    data.series.forEach(function (serie, i) {
                        chart.series[i].addPoint(serie.data, true, true);
                    });
                }
            },
            error: function (result, status) {
                if (sap.n.Launchpad.Timers[chartId]) clearInterval(sap.n.Launchpad.Timers[chartId].timer);
            }
        });

    },

    traceTile: function (dataTile) {
        if (!dataTile) return;
        let system = sap.n.Launchpad.deviceType();

        sap.n.Planet9.function({
            id: dataSet,
            method: 'TraceTile',
            data: {
                tile: dataTile.id,
                launchpad: AppCache.launchpadID,
                browserName: sap.ui.Device.browser.name,
                browserVersion: sap.ui.Device.browser.version,
                osName: sap.ui.Device.os.name,
                osVersion: sap.ui.Device.os.version,
                system: system
            }
        });

    },

    deviceType: function () {
        const desktop = sap.ui.Device.system.desktop;
        const tablet = sap.ui.Device.system.tablet;
        const phone = sap.ui.Device.system.phone;

        const deviceDesktop = sap.n.Launchpad.device.DESKTOP;
        const deviceTablet = sap.n.Launchpad.device.TABLET;
        const devicePhone = sap.n.Launchpad.device.PHONE;

        if (desktop && tablet) {
            if (isCordova()) return deviceTablet;
            return deviceDesktop;
        }

        if (tablet && !isCordova()) return deviceDesktop;
        if (desktop) return deviceDesktop;
        if (tablet) return deviceTablet;
        if (phone) return devicePhone;

        return deviceDesktop;
    },

    isDesktop: function () { return sap.n.Launchpad.deviceType() === sap.n.Launchpad.device.DESKTOP; },
    isTablet: function () { return sap.n.Launchpad.deviceType() === sap.n.Launchpad.device.TABLET; },
    isPhone: function () { return sap.n.Launchpad.deviceType() === sap.n.Launchpad.device.PHONE; },
}