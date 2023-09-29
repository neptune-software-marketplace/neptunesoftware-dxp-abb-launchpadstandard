sap.n.Card = {
    applyDragDropToFavorites: function (container) {
        function onStop (evt, ui) {
            const grid = container.getDomRef();
            if (!grid) return;

            const updated = Array.from(grid.querySelectorAll('.nepFCardContainer'))
                .map((tileElm) => tileElm.dataset.tileId)
                .filter((tileId) => typeof tileId !== 'undefined')
                .map((tileId) => ModelData.FindFirst(AppCacheTilesFav, 'id', tileId));
            
            modelAppCacheTilesFav.setData(updated);
            setCacheAppCacheTilesFav();
            sap.n.Launchpad.saveFav();
            sap.n.Launchpad.BuildTreeMenu();
        }
            
        sap.n.DragDrop.restrictedTo(document.getElementById(container.getId()), undefined, onStop);
    },

    setBackgroundShade: function (dataTile, dataCat, card, isIcon) {
        let backgroundColor, backgroundShade;

        if (typeof dataCat === 'undefined') dataCat = {};

        if (dataCat.styleClass) card.addStyleClass(dataCat.styleClass);
        if (dataTile.styleClass) card.addStyleClass(dataTile.styleClass);

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

        if (isIcon && !backgroundColor) backgroundColor = 'ColorSet10';

        card.addStyleClass('sap' + backgroundColor + backgroundShade.substr(5, 1));
    },

    cardWidth: function (config) {
        // Backward compability
        if (parseInt(AppCache.p9Version.substring(0, 2)) < 21) {
            if (!config.dataTile.cardWidth && config.dataTile.frameType) {
                switch (parseInt(config.dataTile.frameType)) {
                    case 20:
                    case 25:
                        config.dataTile.cardWidth = sap.n.Layout.tileWidth.SMALL;
                        break;

                    case 30:
                    case 40:
                        config.dataTile.cardWidth = sap.n.Layout.tileWidth.MEDIUM;
                        break;

                    case 50:
                    case 60:
                    case 70:
                        config.dataTile.cardWidth = sap.n.Layout.tileWidth.WIDE;
                        break;

                    case 75:
                    case 80:
                    case 90:
                        config.dataTile.cardWidth = sap.n.Layout.tileWidth.WIDER;
                        break;

                    case 100:
                        config.dataTile.cardWidth = sap.n.Layout.tileWidth.MAX;
                        break;
                }
            }

            if (!config.dataTile.cardWidth && config.dataTile.forceRow) config.dataTile.cardWidth = sap.n.Layout.tileWidth.MAX;

        }

        return config.dataTile.cardWidth || sap.n.Layout.tileWidth.SMALL;
    },

    buildCardDefault: function (config) {
        // Customization Properties
        const props = sap.n.Customization.getProperties([...config.path, config.dataTile.id]);
        if (props.width) config.dataTile.cardWidth = props.width;
        if (props.height) config.dataTile.cardHeight = props.height;

        let cardWidth = sap.n.Card.cardWidth(config);
        let cardHeader;

        // Favorites
        if (config.isFav) {
            let favData = ModelData.FindFirst(AppCacheTilesFav, 'id', config.dataTile.id);
            if (favData) {
                if (favData.cardWidth) cardWidth = favData.cardWidth;
                if (favData.cardHeight) config.dataTile.cardHeight = favData.cardHeight;
            }
        }

        // Card Container
        const cardContainerId = `${nepId()}_tile${config.dataTile.id}`;
        let cardContainer = new sap.m.FlexBox(cardContainerId, {
            width: '100%',
            fitContainer: true,
        }).addStyleClass('nepFCardContainer nepTile' + cardWidth);

        cardContainer.addEventDelegate({
            onkeyup: function (evt) {
                // open the Tile on pressing Enter
                if (evt.key === 'Enter') {
                    sap.n.Launchpad.HandleTilePress(config.dataTile, config.dataCat);
                }
            },
        });
        
        addCustomData(cardContainer, {
            type: 'tile',
            context: 'tile',
            'tile-id': config.dataTile.id,
        });

        if (!config.isFav && !sap.n.Customization.isDisabled()) {
            const { lockScreenChanges } = modelAppCacheDiaSettings.getData();
            if (!lockScreenChanges) {
                cardContainer.addEventDelegate(
                    sap.n.Customization.Popover.createEventDelegate({
                        type: 'tile',
                        elmId: cardContainerId,
                        tileId: config.dataTile.id,
                    })
                );
            }

            // Remove Card
            const btnRemoveCard = new sap.m.Button();
            btnRemoveCard.addStyleClass('nepDeleteCard');
            btnRemoveCard.tooltip = new sap.ui.core.TooltipBase().setText('');
            btnRemoveCard.setIcon('sap-icon://less');
            btnRemoveCard.setType(sap.m.ButtonType.Reject);
            btnRemoveCard.attachPress(() => {
                sap.n.Customization.remove([...config.path, config.dataTile.id]);
                cardContainer.destroy();
            });
            cardContainer.addItem(btnRemoveCard);
        }

        // Card
        let card = new sap.f.Card(nepId(), {
            width: '100%',
        }).addStyleClass('nepFCard tile' + config.dataTile.id);

        if (config.dataTile.styleClass) cardContainer.addStyleClass(config.dataTile.styleClass);
        if (config.dataTile.cardHeight) cardContainer.addStyleClass('nepTile' + config.dataTile.cardHeight);
        if (config.dataTile.openClickTile) card.addStyleClass('nepTileClickable');
        if (config.dataTile.cardHeightFit || config.dataCat.cardHeightFit) card.addStyleClass('sapFCardFitContent');

        // Aria Label
        card.onAfterRendering = function () {
            var elem = card.getDomRef();

            elem.setAttribute(
                "aria-label",
                sap.n.Launchpad.translateTile("title", config.dataTile) + " " + sap.n.Launchpad.translateTile("subTitle", config.dataTile)
            );
        };

        // Background Color
        sap.n.Card.setBackgroundShade(config.dataTile, config.dataCat, card);

        // Icon/Image
        let cardIconSrc = config.dataTile.icon || '';

        if (config.dataTile.cardImage) {
            let imageUrl = AppCache.Url + config.dataTile.cardImage;
            if (AppCache.isMobile && config.dataTile.cardImageData) cardIconSrc = config.dataTile.cardImageData;
            cardIconSrc = imageUrl;
        }

        // Header
        cardHeader = new sap.f.cards.Header(nepId(), {
            title: sap.n.Launchpad.translateTile('title', config.dataTile),
            subtitle: sap.n.Launchpad.translateTile('subTitle', config.dataTile),
            statusText: sap.n.Launchpad.translateTile('footer', config.dataTile),
            iconSrc: cardIconSrc,
        });

        // Content
        let cardContent = new sap.m.FlexBox(nepId(), {
            direction: 'Column',
            height: '100%',
            justifyContent: 'SpaceBetween',
            width: '100%',
            fitContainer: true
        });
        
        // Content Body
        let cardBody = new sap.m.FlexBox(nepId(), {
            fitContainer: true,
            renderType: 'Bare',
            direction: 'Column',
            justifyContent: 'Start'
        }).addStyleClass('nepFCardBody');

        // Background Image 
        let imageSource = config.dataTile.image
        if (AppCache.isMobile && config.dataTile.imageData) imageSource = config.dataTile.imageData;

        let inlineHeight = config.dataTile.imageHeight || 'auto';

        // Background Image Inline
        if (config.dataTile.image && !config.dataTile.imagePosition) {
            let imageSource = config.dataTile.image
            if (AppCache.isMobile && config.dataTile.imageData) imageSource = config.dataTile.imageData;

            let cardImage = new sap.m.Image(nepId(), {
                src: emptyBase64Image(),
                width: '100%',
                height: inlineHeight,
                densityAware: false,
            }).addStyleClass('nepFCardInlineImage tileInlineImage' + config.dataTile.id);
            lazyLoadImage(imageSource, cardImage, 'sap-component');

            cardBody.addItem(cardImage);
        }

        // Background Image on Top
        function getBackgroundImageOnTop() {
            cardHeader.topImageId = nepId();
            const id = cardHeader.topImageId;
            const tileId = config.dataTile.id;

            const img = new Image();
            img.oncontextmenu = function () {
                if (!sap.n.Customization.isDisabled()) {
                    sap.n.Customization.Popover.open(img, {
                        tileId,
                        type: 'tile',
                        elmId: card.getId(), 
                    });
                    return false;
                }
            };

            Object.entries({
                'src': emptyBase64Image(),
                'alt': '',
                'aria-hidden': 'true',
                'role': 'presentation',
                'data-sap-ui': id,
            }).forEach(function ([k, v]) {
                img.setAttribute(k, v);
            });
            lazyLoadImage(imageSource, img, 'element');

            addClass(img, ['sapMImg', 'nepFCardTopImage', 'tileTopImage', tileId, `tileTopImage${tileId}`]);
            img.style.cssText = `
                width: 100%;
                height: ${inlineHeight};
            `;

            return img;
        }

        const isBackgroundImageOnTop = config.dataTile.imagePosition === 'top';
        const img = isBackgroundImageOnTop ? getBackgroundImageOnTop() : '';

        // Card Body Content
        switch (config.dataTile.type) {
            case 'adaptive':
                cardBody.addItem(sap.n.Card.buildCardBodyAdaptive(config));
                break;

            case 'application':
                cardBody.addItem(sap.n.Card.buildCardBodyApplication(config));
                break;

            case 'intcard':
                cardBody.addItem(sap.n.Card.buildCardBodyIntCard(config));
                cardHeader.setVisible(false);
                break;

            case 'highchart':
                cardBody.addItem(sap.n.Card.buildCardBodyHighchart(config));
                break;

            case 'highstock':
                cardBody.addItem(sap.n.Card.buildCardBodyHighstock(config));
                break;

            default:
                break;
        }

        // Description
        if (config.dataTile.description) cardBody.addItem(new sap.m.Text({ text: sap.n.Launchpad.translateTile('description', config.dataTile) }).addStyleClass('nepCardDescription'));

        // Action Panel
        let cardAction = new sap.m.VBox(nepId());

        // Add Objects
        cardContainer.addItem(card);
        cardContent.addItem(cardBody);
        cardContent.addItem(cardAction);
        card.setHeader(cardHeader);
        card.setContent(cardContent);

        // Actions 
        sap.n.Card.buildCardAction({
            pageID: config.pageID,
            dataTile: config.dataTile,
            parent: cardAction,
            cardActionParent: card,
            dataCat: config.dataCat,
            cardContainer: cardContainer,
            isFav: config.isFav
        });

        let _cardHeader_delegate = {
            onAfterRendering: function () {
                let dom = cardHeader.getDomRef();
                if (!dom) {
                    return;
                }

                let labelledby = dom.getAttribute('aria-labelledby') || '';
                let split = labelledby.split(' ');

                dom.setAttribute('aria-labelledby', split[0]);
                dom.removeAttribute('tabindex');

                // Background Image on Top
                if (config.dataTile.imagePosition === 'top') {
                    if (!elById(cardHeader.topImageId)) {
                        insertBeforeElm(elById(cardHeader.getId()), img);
                    }
                }

                let focusableCardHeader = dom.querySelector(".sapFCardHeaderWrapper");
                if (focusableCardHeader) focusableCardHeader.removeAttribute("tabindex");

                const ariaHeader = dom.querySelector('[role="heading"]');
                if (ariaHeader) ariaHeader.setAttribute('aria-level', '2');
            }
        };
        cardHeader.addEventDelegate(_cardHeader_delegate);

        return cardContainer;
    },

    setCardContentHeight: function (config, cardContent) {
        if (config.dataTile.bodyHeight) cardContent.setHeight(config.dataTile.bodyHeight);
    },

    buildCardBodyAdaptive: function (config) {
        let cardContent = new sap.m.Panel(nepId(), {
            backgroundDesign: 'Transparent'
        }).addStyleClass('sapUiNoContentPadding nepTileApplicationPanel');

        this.setCardContentHeight(config, cardContent);
        if (!config.dataTile.settings.adaptive.idTile) return cardContent;

        sap.n.Adaptive.getConfig(config.dataTile.settings.adaptive.idTile).then(function (startParams) {
            // Exists ? 
            if (!startParams) {
                sap.m.MessageToast.show(AppCache_tAdaptiveNotFound.getText());
                return;
            }

            AppCache.Load(startParams.application, {
                parentObject: cardContent,
                appGUID: ModelData.genID(),
                startParams: startParams
            });
        }).catch(function (_data) { });
        return cardContent;
    },

    buildCardBodyApplication: function (config) {
        let cardContent = new sap.m.Panel(nepId(), {
            backgroundDesign: 'Transparent'
        }).addStyleClass('sapUiNoContentPadding nepTileApplicationPanel');

        this.setCardContentHeight(config, cardContent);

        let startParams = {};
        try {
            startParams = JSON.parse(config.dataTile.startParams);
        } catch (e) { }

        if (config.dataTile.tileApplication) {
            AppCache.Load(config.dataTile.tileApplication, {
                parentObject: cardContent,
                startParams: startParams,
            });
        }

        return cardContent;
    },

    buildCardBodyIntCard: function (config) {

        if (!sap.ui.integration) sap.ui.getCore().loadLibrary("sap.ui.integration")

        let cardContent = new sap.m.Panel(nepId(), {
            backgroundDesign: 'Transparent'
        }).addStyleClass('sapUiNoContentPadding nepTileApplicationPanel');
        this.setCardContentHeight(config, cardContent);

        // Integration Card 
        let intCard = new sap.ui.integration.widgets.Card(nepId(), {
            width: '100%',
            manifest: AppCache.Url + config.dataTile.dataUrl,
        }).addStyleClass('nepFCard nepICCard');

        cardContent.addContent(intCard);
        return cardContent;
    },

    buildCardBodyHighchart: function (config) {
        let cardContent = new sap.m.Panel(nepId(), {
            backgroundDesign: 'Transparent'
        }).addStyleClass('sapUiNoContentPadding nepTileApplicationPanel');

        this.setCardContentHeight(config, cardContent);

        let chartId = 'chart' + ModelData.genID();
        let chartHeight = config.dataTile.bodyHeight || '400px';
        let oHighchart;

        let oHighchartHTML = new sap.ui.core.HTML(nepId(), {
            content: `<div id="${chartId}" style="height:100%; width:100%"></div>`,
            afterRendering: function (oEvent) {
                setTimeout(function () {
                    let chartData = localStorage.getItem(`p9TileChart${config.dataTile.id}`);
                    if (chartData) {
                        chartData = JSON.parse(chartData);
                        if (!chartData.chart) chartData.chart = {};
                        chartData.chart.renderTo = chartId;
                        oHighchart = Highcharts.chart(chartData);
                    } else {
                        oHighchart = Highcharts.chart({
                            chart: {
                                renderTo: chartId,
                                height: chartHeight,
                                style: { fontFamily: '72' }
                            },
                            credits: { enabled: false },
                            title: { text: '' },
                            subTitle: { text: '' },
                            series: []
                        });
                    }

                    // Fetch Data 
                    if (config.dataTile.dataUrl) {

                        // Trigger Pull 1. Time
                        setTimeout(function () { sap.n.Launchpad.getHighchartData(config.dataTile, oHighchart, config.pageID, chartId, 'start'); }, 250);

                        // Pull Interval
                        if (config.dataTile.dataInterval && config.dataTile.dataInterval !== '0' && !sap.n.Launchpad.Timers[chartId]) {
                            sap.n.Launchpad.Timers[chartId] = {
                                timer: setInterval(function () {
                                    if (sap.n.Launchpad.Timers[chartId].pageId !== AppCacheNav.getCurrentPage().sId) return;
                                    sap.n.Launchpad.getHighchartData(config.dataTile, oHighchart, config.pageID, chartId, 'continue');
                                }, config.dataTile.dataInterval * 1000),
                                pageId: config.pageID
                            };
                        }
                    }

                }, 200);
            }
        });

        cardContent.addContent(oHighchartHTML);
        return cardContent;
    },

    buildCardBodyHighstock: function (config) {
        let cardContent = new sap.m.Panel(nepId(), {
            backgroundDesign: 'Transparent'
        }).addStyleClass('sapUiNoContentPadding nepTileApplicationPanel');

        this.setCardContentHeight(config, cardContent);

        let chartId = 'chart' + ModelData.genID();
        let chartHeight = config.dataTile.bodyHeight || '400px';
        let oHighchart;

        let oHighchartHTML = new sap.ui.core.HTML(nepId(), {
            content: `<div id="${chartId}" style='height:100%;width:100%'></div>`,
            afterRendering: function (oEvent) {
                let chartData = localStorage.getItem('p9TileChart' + config.dataTile.id);
                if (chartData) {
                    let chartData = JSON.parse(chartData);
                    if (!chartData.chart) chartData.chart = {};
                    chartData.chart.renderTo = chartId;
                    oHighchart = Highcharts.stockChart(chartData);
                } else {
                    oHighchart = Highcharts.stockChart({
                        chart: {
                            renderTo: chartId,
                            height: chartHeight,
                            style: { fontFamily: '72' }
                        },
                        credits: { enabled: false },
                        title: { text: '' },
                        subTitle: { text: '' },
                        series: []
                    });
                }

                // Fetch Data 
                if (config.dataTile.dataUrl) {
                    // Trigger Pull 1. Time
                    setTimeout(function () { sap.n.Launchpad.getHighstockData(config.dataTile, oHighchart, config.pageID, chartId, 'start'); }, 250);

                    // Pull Interval
                    if (config.dataTile.dataInterval && config.dataTile.dataInterval !== '0' && !sap.n.Launchpad.Timers[chartId]) {
                        sap.n.Launchpad.Timers[chartId] = {
                            timer: setInterval(function () {
                                if (sap.n.Launchpad.Timers[chartId].pageId !== AppCacheNav.getCurrentPage().sId) return;
                                sap.n.Launchpad.getHighstockData(config.dataTile, oHighchart, config.pageID, chartId, 'continue');
                            }, config.dataTile.dataInterval * 1000),
                            pageId: config.pageID
                        };
                    }
                }
            }
        });

        cardContent.addContent(oHighchartHTML);
        return cardContent;
    },

    buildCardAction: function (config) {
        let dataTile = config.dataTile;
        let buttonStyle = '';
        let supportedBrowser = true;
        let openEnabled = true;
        let cardActionContainer = new sap.m.FlexBox(nepId(), {}).addStyleClass('nepActionContainer nepCardAction sapUiSizeCompact');

        // Check Offline Mode -> Disable Open button 
        if (AppCache.isOffline) {
            if (dataTile.actionURL) openEnabled = false;
            if (dataTile.type === 'storeitem') openEnabled = false;
            if (!dataTile.urlApplication) dataTile.urlApplication = '';

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
                        p9GetView(viewName).then(function (viewData) {
                            if (viewData.length < 10) openEnabled = false;
                        });
                    } else {
                        if (!sapStorageGet(viewName)) openEnabled = false;
                    }
                }
            }
        }

        // Supported Browsers
        const w = dataTile.browserBlockWin;
        if (sap.ui.Device.os.name === 'win' && w && w !== '[]' && w.indexOf(sap.ui.Device.browser.name) === -1) {
            supportedBrowser = false;
        }

        const m = dataTile.browserBlockMac;
        if (sap.ui.Device.os.name === 'mac' && m && dataTile.browserBlockWin !== '[]' && m.indexOf(sap.ui.Device.browser.name) === -1) {
            supportedBrowser = false;
        }

        let butStart;
        let inFavCat;

        if (dataTile.actionType === 'F' || dataTile.actionApplication || dataTile.actionWebApp || dataTile.actionURL || dataTile.actiongroup || dataTile.type === 'storeitem') {
            if (supportedBrowser) {
                if (dataTile.blackoutEnabled) {
                    butStart = new sap.m.Button(nepId(), {
                        text: dataTile.blackoutText,
                        press: function (oEvent) {
                            descBlackout.editor.setData(dataTile.blackoutDescription);
                            popBlackout.openBy(this);
                        }
                    });
                    butStart.addStyleClass('nepTileAction sapUiTinyMarginEnd nepTileBlackout ' + buttonStyle);
                } else {
                    if (dataTile.openClickTile) {
                        if (openEnabled) {
                            config.cardActionParent.attachBrowserEvent('tap', function (oEvent) {
                                // button would decide the tap action
                                if (oEvent.target && oEvent.target.classList.contains('sapMBtnIcon')) {
                                    return;
                                }
                                
                                oEvent.stopImmediatePropagation();
                                setTimeout(function () {
                                    if (sap.n.Launchpad.favInProcess) {
                                        sap.n.Launchpad.favInProcess = false;
                                    } else {
                                        sap.n.Launchpad.HandleTilePress(dataTile, config.dataCat);
                                    }
                                }, 50);
                            });
                            config.cardActionParent.attachBrowserEvent('keypress', function (oEvent) {
                                setTimeout(function () {
                                    if (oEvent.code !== 'Enter') {
                                        return;
                                    }
                                    if (sap.n.Launchpad.favInProcess) {
                                        sap.n.Launchpad.favInProcess = false;
                                    } else {
                                        sap.n.Launchpad.HandleTilePress(dataTile, config.dataCat);
                                    }
                                }, 50);
                            });
                            cardActionContainer.addStyleClass('nepNavBarTile');
                            let _cardActionParent_delegate = {
                                onAfterRendering: function () {
                                    let elem = config.cardActionParent.getDomRef();
                                    // TODO Fix tabindex
                                    // elem.setAttribute("tabindex", "0");
                                    elem.setAttribute("role", "button");
                                    elem.removeAttribute("aria-labelledby");
                                }
                            };
                            config.cardActionParent.addEventDelegate(_cardActionParent_delegate);
                            config.cardActionParent.exit = function () {
                                config.cardActionParent.removeEventDelegate(_cardActionParent_delegate);
                            };
                        }
                    } else {
                        let openText = (dataTile.cardButtonIconOnly) ? '' : AppCache_tOpen.getText();
                        if (dataTile.openText) openText = sap.n.Launchpad.translateTile('openText', dataTile);
                        butStart = new sap.m.Button(nepId(), {
                            text: openText,
                            enabled: openEnabled,
                            icon: dataTile.cardButtonIcon,
                            press: function (oEvent) {
                                sap.n.Launchpad.HandleTilePress(dataTile, config.dataCat);
                            }
                        });

                        butStart.addStyleClass('nepTileAction sapUiTinyMarginEnd ' + buttonStyle);
                    }
                }
            } else {
                butStart = new sap.m.Button(nepId(), {
                    text: AppCache_tIncompatible.getText(),
                    iconFirst: false,
                    enabled: openEnabled,
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
                cardActionContainer.addItem(butStart);
            }

            let butIdAdd = config.isFav ? '' : 'FavAdd';
            let butFavAdd = new sap.m.Button(`${nepPrefix()}${butIdAdd}${dataTile.id}`, {
                tooltip: AppCache_tAddFav.getText(),
                icon: 'sap-icon://unfavorite',
                press: function (oEvent) {
                    sap.n.Launchpad.favInProcess = true;

                    ModelData.Update(AppCacheTilesFav, 'id', dataTile.id, dataTile);
                    setCacheAppCacheTilesFav();

                    butFavDel.setVisible(true);
                    butFavAdd.setVisible(false);

                    sap.n.Launchpad.handleFavRedraw();
                }
            });

            butFavAdd.addStyleClass('nepTileAction sapUiTinyMarginEnd ' + buttonStyle);

            let butIdDel = config.isFav ? '' : 'FavDel';
            let butFavDel = new sap.m.Button(`${nepPrefix()}${butIdDel}${dataTile.id}`, {
                tooltip: AppCache_tDelFav.getText(),
                icon: 'sap-icon://favorite',
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

                            let butFavDel = sap.ui.getCore().byId(`${nepPrefix()}FavDel${dataTile.id}`);
                            if (butFavDel) butFavDel.setVisible(false);

                            sap.n.Launchpad.handleFavRedraw();
                        }
                    });
                }
            });

            butFavDel.addStyleClass('nepTileAction sapUiTinyMarginEnd ' + buttonStyle);

            // Tile is by default in Fav Category
            inFavCat = ModelData.FindFirst(config.dataCat.tiles, 'id', dataTile.id);

            // Fav
            let rec = ModelData.Find(AppCacheTilesFav, 'id', dataTile.id);
            if (rec.length) {
                butFavAdd.setVisible(false);
                butFavDel.setVisible(true);
            } else {
                butFavAdd.setVisible(true);
                butFavDel.setVisible(false);
            }

            if (!dataTile.openClickTile || dataTile.blackoutEnabled) cardActionContainer.addItem(butStart);

            if (!AppCache.isPublic && sap.n.Launchpad.enableFav && !AppCache.isOffline) {
                if (config.dataCat.inclFav && inFavCat) {
                } else {
                    cardActionContainer.addItem(butFavAdd);
                    cardActionContainer.addItem(butFavDel);
                }
            }
        }

        this.addCardHelpAction(cardActionContainer, dataTile)
        this.addCardResizeAction(cardActionContainer, config);

        config.parent.addItem(cardActionContainer);
    },

    addCardHelpAction(container, dataTile) {
        if (dataTile.helpEnabled) {
            let butHelp = new sap.m.Button(nepId(), {
                tooltip: AppCache_tHelp.getText(),
                icon: 'sap-icon://sys-help',
                press: function (oEvent) {
                    descBlackout.editor.setData(dataTile.helpText);
                    popBlackout.openBy(this);
                }
            });

            container.addItem(butHelp);
        }
    },

    addCardResizeAction(container, config) {
        if (sap.n.Customization.isDisabled() || sap.n.Customization.areScreensLocked()) {
            return;
        }

        // without the popover
        let spacer = new sap.m.HBox(nepId(), { width: '100%' });
        container.addItem(spacer);

        const resizeIcon = new sap.ui.core.Icon({
            src: 'sap-icon://resize-corner'
        }).addStyleClass('nepResizable');
        
        resizeIcon.attachBrowserEvent('mousedown', (evt) => {
            sap.n.Customization.Resize.onMouseDown(evt, config);
        });

        container.addItem(resizeIcon);
    },
};
