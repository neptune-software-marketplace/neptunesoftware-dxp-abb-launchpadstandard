// Dialog Constructor
sap.m.Dialog.extend('sap.n.Dialog', {
    metadata: {
        properties: {
            'hideMinimize': { type: 'boolean', defaultValue: false },
            'hideMosaic': { type: 'boolean', defaultValue: false },
            'hideMaximize': { type: 'boolean', defaultValue: false },
            'icon': { type: 'sap.ui.core.Icon', },
            'contentIsURL': { type: 'boolean', defaultValue: false },
            '_origWidth': { type: 'sap.ui.core.CSSSize' },
            '_origHeight': { type: 'sap.ui.core.CSSSize' },
            '_origTop': { type: 'sap.ui.core.CSSSize' },
            '_origLeft': { type: 'sap.ui.core.CSSSize' },
            '_headerIcon': { type: 'sap.ui.core.Icon' },
            '_headerTitle': { type: 'sap.m.Title' },
            '_butMaximize': { type: 'sap.m.Button' },
            '_butMinimize': { type: 'sap.m.Button' },
            '_butRestore': { type: 'sap.m.Button' },
            '_butMosaic': { type: 'sap.m.Button' },
            '_butClose': { type: 'sap.m.Button' },
            '_viewContent': { type: 'string' }
        },
    },

    init: function () {
        sap.m.Dialog.prototype.init.call(this);

        const dia = this;
        dia._viewContent = AppCache.diaView;

        // Dialog Header
        const diaHeader = new sap.m.Bar();
        dia.setCustomHeader(diaHeader);

        this._headerIcon = new sap.ui.core.Icon({ width: '30px' });
        diaHeader.addContentLeft(this._headerIcon);

        // Dialog Icon
        if (sap.n.Launchpad.contextType === 'Tile') {
            this._headerIcon.setSrc(sap.n.Launchpad.contextTile.icon);
        } else {
            this._headerIcon.setSrc();
        }

        // Dialog Title
        this._headerTitle = new sap.m.Title({ titleStyle: 'H6' });
        diaHeader.addContentLeft(this._headerTitle);

        // Minimize button
        this._butMinimize = new sap.m.Button({
            icon: 'sap-icon://minimize',
            press: function (oEvent) {
                dia.minimize(dia);
            }
        });
        this._butMinimize.setTooltip(' ');
        diaHeader.addContentRight(this._butMinimize);

        // Mosaic button
        this._butMosaic = new sap.m.Button({
            icon: 'sap-icon://grid',
            press: function (oEvent) {
                dia.mosaic();
            }
        });
        this._butMosaic.setTooltip(' ');
        diaHeader.addContentRight(this._butMosaic);


        // Maximize button
        this._butMaximize = new sap.m.Button({
            icon: 'sap-icon://full-screen',
            press: function (oEvent) {
                dia.maximize();
            }
        });
        this._butMaximize.setTooltip(' ');
        diaHeader.addContentRight(this._butMaximize);

        this._butRestore = new sap.m.Button({ // Restore button
            icon: 'sap-icon://exit-full-screen',
            visible: false,
            press: function (oEvent) {
                dia.restore();
            }
        });
        this._butRestore.setTooltip(' ');
        diaHeader.addContentRight(this._butRestore);


        // Close button
        this._butClose = new sap.m.Button({
            icon: 'sap-icon://decline',
            press: function (oEvent) {
                dia.close();
            }
        });
        this._butClose.setTooltip(' ');
        diaHeader.addContentRight(this._butClose);

        setTimeout(function () {
            dia._headerTitle.setText(dia.getTitle());
            if (dia.getIcon()) dia._headerIcon.setSrc(dia.getIcon());
        }, 50);

        // Dialog Styling
        dia.addStyleClass('sapUiNoContentPadding');

        const modal = AppCache.LoadOptions.dialogModal ? true : false;
        dia.oPopup.setModal(modal);
    },

    onBeforeRendering: function () {
        this._butMinimize.setVisible(!this.getHideMinimize());
        this._butMosaic.setVisible(!this.getHideMosaic());
        this._butMaximize.setVisible(!this.getHideMaximize());
    },


    // trigger BeforeClose event before closing
    close: function () {
        if (this.getContent()[0].sViewName) {
            const applid = this.getContent()[0].sViewName.replace(/\//g, ''); // Format ID
            if (applid) { // trigger custom beforeClose
                if (sap.n.Apps[applid] && sap.n.Apps[applid].beforeClose) {
                    sap.n.Apps[applid].beforeClose.forEach(function (data) {
                        data();
                    });
                }
            }
        }

        sap.m.Dialog.prototype.close.call(this);
        return this;
    },

    ondblclick: function (oEvent) { },

    targetElId: function () { return `#${this.sId}`; },
    targetEl: function () { return querySelector(this.targetElId()); },

    _getCSS: function (name) { return getStyle(this.targetEl(), name); },
    _setCSS: function (name, value) { setStyle(this.targetEl(), name, value); },

    setVisibility: function (value) { this._setCSS('visibility', value); },
    setHeight: function (height) {
        const dialog = this.getDomRef();
        if (!dialog) return;

        const section = dialog.querySelector('.sapMDialogSection');
        if (!section) return;

        section.style.height = height;
    },

    maximize: function (event) {
        if (this.getContentIsURL()) {
            const oDomRef = this.getDomRef();

            // Store original values
            this._origLeft = oDomRef.style.left;
            this._origTop = oDomRef.style.top;
            this._origWidth = oDomRef.style.width;
            this._origHeight = oDomRef.style.height;

            // Maximize
            oDomRef.style.width = '100%';
            oDomRef.style.height = '99%';
            oDomRef.style.top = oDomRef.style.top.includes('%') ? '50%' : '1px';
            oDomRef.style.left = oDomRef.style.left.includes('%') ? '50%' : '1px';
            
            oDomRef.style['max-height'] = '94%';
            oDomRef.style['max-width'] = '100%';
        } else {
            this.setStretch(true);
        }

        this.setHeight('');
        this._butMaximize.setVisible(false);
        this.setHideMaximize(true);
        this._butRestore.setVisible(true);
    },

    unminimize: function (oControl) {
        AppCacheShellDialog.focus(); // IE11 looses focus
        oControl.destroy(); // Destroy toolbar button

        if (this.getContentIsURL()) {
            this.setVisibility('visible');
        } else {
            this.setVisible(true);
        }

        if (AppCacheUserDialog.getButtons().length === 1) AppCacheShellDialog.setVisible(false);
    },

    onAfterRendering: function () {
        sap.m.Dialog.prototype.onAfterRendering.call(this);

        if (!this.getContentIsURL()) { // override CSS after rerender
            applyCSSToElmId(this.targetElId(), {
                'max-height': '95%',
                'max-width': '98%',
                'min-height': 'initial',
                'min-width': 'initial',
                'transform': '',
            });
        }
    },

    minimize: function () {
        const dia = this;

        AppCacheShellDialog.setVisible(true);
        // Add button to Top Shell Bar
        AppCacheUserDialog.addButton(new sap.m.Button({
            icon: dia._headerIcon.getSrc(),
            text: dia._headerTitle.getText(),
            press: function () {
                dia.unminimize(this);
            }

        }));

        if (this.getContentIsURL()) {
            this.setVisibility('hidden');
        } else {
            this.setVisible(false);
        }
    },

    restore: function (event) {
        if (this.getContentIsURL()) {
            applyCSSToElmId(this.targetElId(), {
                'left': this._origLeft,
                'top': this._origTop,
                'width': this._origWidth,
                'height': this._origHeight,
            });
        } else {
            this.setStretch(false);
        }

        this.setHeight('');
        this._butMaximize.setVisible(true);
        this.setHideMaximize(false);
        this._butRestore.setVisible(false);
    },

    _isPrime: function (num) {
        for (let i = 2; i < num; i++) {
            if (num % i === 0) {
                return false;
            }
        }
        return true;
    },

    _buildPrimesArray: function (max) {
        let arr = [2];
        for (let i = 3; i <= max; i += 2) {
            if (this._isPrime(i)) {
                arr.push(i);
            }
        }
        return arr;
    },

    mosaic: function () {
        let diaArray = [];
        AppCache.Dialogs.forEach(function (data) {
            let dia = sap.ui.getCore().byId(data);
            if (dia.getVisible() && dia._getCSS('visibility') !== 'hidden') {
                diaArray.push(data);
            }
        });

        if (diaArray.length <= 1) {
            return;
        }

        // Calculate sections needed (prime numbers)
        let primesArray = this._buildPrimesArray(diaArray.length);

        let hsecs, vsecs;
        for (i = 0; i < primesArray.length; i++) {
            let r = diaArray.length % primesArray[i];
            if (r === 0) {
                let div = diaArray.length / primesArray[i];

                if (div >= primesArray[i]) {
                    hsecs = div;
                    vsecs = primesArray[i];
                } else {
                    hsecs = primesArray[i];
                    vsecs = div;
                }
                i = primesArray.length + 1;
            }
        }

        let eachSecWidth = Math.floor((window.innerWidth - 10) / hsecs);
        let eachSecHeight = Math.floor((window.innerHeight - 10) / vsecs) - 48;
        let eachSecWidthCSS = eachSecWidth + 'px';
        let eachSecHeightCSS = eachSecHeight + 'px';

        let currHsec = 1;
        let currVsec = 1;
        for (i = 0; i < diaArray.length; i++) {
            let newTop = ((currVsec - 1) * eachSecHeight) + 4;
            let newLeft = ((currHsec - 1) * eachSecWidth) + 5;

            if (currVsec > 1)
                newTop = newTop + 48;

            let d = sap.ui.getCore().byId(diaArray[i]);
            //remove the transform translate
            d._bDisableRepositioning = true;
            d._$dialog.addClass('sapDialogDisableTransition sapMDialogTouched');

            d._oManuallySetPosition = {
                x: newLeft,
                y: newTop
            };

            d._oManuallySetSize = {
                height: eachSecHeightCSS,
                width: eachSecWidthCSS
            };

            applyCSSToElmId(d.sId, {
                'top': `${newTop}px`,
                'left': `${newLeft}px`,
                'width': eachSecWidthCSS,
                'height': eachSecHeightCSS,
                'max-height': '95%',
                'max-width': '98%',
                'min-height': 'initial',
                'min-width': 'initial',
                'transform': '',
            });

            if (currHsec === hsecs) {
                currVsec++;
                currHsec = 1;
            } else {
                currHsec++;
            }
        }
    },

    rerender: function () {
        if (!this.getContentIsURL()) {
            sap.m.Dialog.prototype.rerender.call(this);
        }
    },

    renderer: {}
});
