sap.n.Style = {
    getLayoutCss: function (config) {
        let layout = config.layout;

        css = '<style>';
        // Top Menu
        if (layout.TOP_BACK_COLOR) {
            css += `
                .nepTopMenu {
                    background: ${layout.TOP_BACK_COLOR};
                }
                .nepDialogWithObjHeader .sapContrastPlus.sapMOHR.sapMOHRBgTranslucent,
                .sapContrastPlus .nepDialogWithObjHeader .sapMOHR.sapMOHRBgTranslucent,
                .nepDialogSubObjHeader {
                    background: ${layout.TOP_BACK_COLOR};
                }
                html.sap-desktop
                    .nepDialogSubObjHeader
                    .sapContrastPlus
                    .sapMIBar.sapMFooter-CTX,
                html.sap-desktop
                    .nepDialogSubObjHeader
                    .sapContrastPlus.sapMIBar.sapMFooter-CTX {
                    border-top-color: ${layout.TOP_BACK_COLOR};
                }
                .nepDialogWithObjHeader.sapMDialog.sapMPopup-CTX > header .sapMHeader-CTX,
                .nepDialogWithObjHeader.sapMDialog.sapMPopup-CTX > header .sapMSubHeader-CTX,
                .nepDialogWithObjHeader .sapMITH {
                    background-color: ${layout.TOP_BACK_COLOR};
                }
                .nepPopover.sapMDialog.sapMPopup-CTX > header .sapMHeader-CTX,
                .nepPopover.sapMDialog.sapMPopup-CTX > header .sapMSubHeader-CTX,
                .nepPopover :not(.sapMBtnDisabled) > .sapMBtnTransparent.sapMBtnActive,
                .nepPopover :not(.sapMBtnDisabled):hover > .sapMBtnTransparent.sapMBtnActive,
                .nepPopover :not(.sapMBtnDisabled) > .sapMBtnGhost.sapMBtnActive,
                .nepPopover :not(.sapMBtnDisabled):hover > .sapMBtnGhost.sapMBtnActive {
                    background-color: ${layout.TOP_BACK_COLOR};
                    border-color: ${layout.TOP_BACK_COLOR};
                }
            `;
        }

        if (layout.TOP_ACT_COLOR) {
            /**
             * 1. Active Top Menu
             * 2. Hover normal Top Menu
             * 3. Sub Menu
             */
            css += `
                .nepDialogWithObjHeader .sapMITBSelected>.sapMITBContentArrow,
                .nepTopMenuActive.sapMBtn, 
                .nepTopMenuBtn.sapMBtn:hover {
                    border-bottom: 4px solid ${layout.TOP_ACT_COLOR};
                }
                .nepSubMenu.sapMPopover,
                .nepOverflowMenu.nepPopover.sapMPopover {
                    border-top: 4px solid ${layout.TOP_ACT_COLOR};
                }
            `;
        }

        if (layout.TOP_BOR_COLOR) {
            css += `
                .nepTopMenu {
                    border-bottom: 1px solid ${layout.TOP_BOR_COLOR};
                }
                .nepDialogWithObjHeader .sapMITH {
                    border-bottom: 2px solid ${layout.TOP_BOR_COLOR};
                }
            `;
        }

        if (layout.TOP_TXT_COLOR) {
            css += `
                .nepTopMenu :not(.sapMBtnDisabled) .sapMBtnTransparent > .sapMBtnIcon {
                    color: ${layout.TOP_TXT_COLOR};
                }
                .nepTopMenu span.sapMBtnInner,
                .nepDialogWithObjHeader
                    .sapMITBTextOnly
                    .sapMITBFilterDefault.sapMITBSelected
                    > .sapMITBText,
                .nepDialogWithObjHeader .sapMITBTextOnly .sapMITBFilterDefault > .sapMITBText {
                    color: ${layout.TOP_TXT_COLOR};
                    text-shadow: none;
                }
                .nepTopMenu .sapMTBSeparator {
                    background: ${layout.TOP_TXT_COLOR};
                }
                .nepDialogWithObjHeader .sapMOHRTitle h1,
                .nepDialogWithObjHeader .sapMOHRIntro .sapMText,
                .nepDialogWithObjHeader .sapMOHRIcon .sapUiIcon,
                .nepDialogWithObjHeader .sapMBtnIcon,
                .nepDialogSubObjHeader .sapMText {
                    color: ${layout.TOP_TXT_COLOR};
                    text-shadow: none;
                }
                .nepDialogWithObjHeader
                    :not(.sapMBtnDisabled)
                    > .sapMBtnInner.sapMBtnActive
                    .sapMBtnIcon {
                    color: ${layout.TOP_TXT_COLOR};
                    text-shadow: none;
                }
                .nepPopover .sapMBtnIcon {
                    color: ${layout.TOP_TXT_COLOR};
                    text-shadow: none;
                }
            `;
        }

        if (layout.TOP_MENU_COLOR) {
            css += `
                .nepListMenu .sapMSLITitleOnly,
                .nepListMenu .sapMSLIImgIcon {
                    color: ${layout.TOP_MENU_COLOR};
                }
                .nepListSetting .sapMLIBHoverable:hover {
                    background: transparent;
                    border: 1px solid ${layout.TOP_MENU_COLOR};
                }
                .nepUserActionText.sapMText {
                    color: ${layout.TOP_MENU_COLOR};
                }
            `;
        }
        
        if (layout.TOP_HOV_COLOR) {
            css += `
                .nepTopMenu span.sapMBtnInner:hover,
                .nepTopMenu .sapMBtnCustomIcon:hover,
                .nepTopMenu .nepTopMenuActive span.sapMBtnInner:hover,
                .nepTopMenu .nepTopMenuActiveHover span.sapMBtnInner,
                .nepTopMenu :not(.sapMBtnDisabled) > .sapMBtnInner.sapMBtnActive .sapMBtnIcon,
                .nepPopover .sapMIBar-CTX.sapMHeader-CTX :not(.sapMBtnDisabled) > .sapMBtnActive,
                .nepPopover .sapMIBar-CTX.sapMFooter-CTX :not(.sapMBtnDisabled) > .sapMBtnActive,
                .nepPopover :not(.sapMBtnDisabled) > .sapMBtnInner.sapMBtnActive .sapMBtnIcon,
                .nepTopMenu .sapMBtn:hover > .sapMBtnTransparent.sapMBtnHoverable:not(.sapMBtnActive):not(.sapMToggleBtnPressed),
                .nepTopMenu .sapMIBar-CTX .sapMBtn:hover > .sapMBtnTransparent.sapMBtnHoverable:not(.sapMBtnActive):not(.sapMToggleBtnPressed),
                .nepTopMenu .sapMBtn:hover:not(.sapMBtnDisabled) > .sapMBtnHoverable.sapMBtnTransparent:not(.sapMBtnActive):not(.sapMToggleBtnPressed) > .sapMBtnIcon,
                .nepTopMenu *.sapMBtn:hover:not(.sapMBtnDisabled) > span.sapMBtnInner.sapMBtnTransparent:not(.sapMBtnActive):not(.sapMToggleBtnPressed) > .sapMBtnIcon,
                .nepTopMenu :not(.sapMBtnDisabled):not(.sapMSBActive) > span.sapMBtnInner.sapMBtnTransparent:not(.sapMBtnActive):not(.sapMToggleBtnPressed):hover > .sapMBtnIcon,
                .nepTopMenu .sapMBtn:hover > .sapMBtnHoverable {
                    color: ${layout.TOP_HOV_COLOR};
                }
            `;
        }

        if (layout.TOP_HOV_BACK) {
            css += `
                .nepTopMenu span.sapMBtnInner:hover,
                .nepTopMenu .sapMBtnCustomIcon:hover,
                .nepTopMenu .nepTopMenuActive span.sapMBtnInner:hover,
                .nepTopMenu .sapMBtn:hover > .sapMBtnHoverable,
                .nepTopMenu :not(.sapMBtnDisabled) > .sapMBtnInner.sapMBtnActive .sapMBtnIcon,
                .nepTopMenu .nepTopMenuActive span.sapMBtnInner:hover,
                .nepPopover .sapMIBar-CTX.sapMHeader-CTX :not(.sapMBtnDisabled) > .sapMBtnActive,
                .nepPopover .sapMIBar-CTX.sapMFooter-CTX :not(.sapMBtnDisabled) > .sapMBtnActive,
                .nepTopMenu .sapMBtn:hover > .sapMBtnHoverable,
                .nepTopMenu :not(.sapMBtnDisabled) > .sapMBtnInner.sapMBtnActive,
                .nepTopMenu :not(.sapMBtnDisabled) > .sapMBtnInner.sapMBtnActive .sapMBtnIcon,
                .nepTopMenu .sapMBtn:hover > .sapMBtnTransparent.sapMBtnHoverable:not(.sapMBtnActive):not(.sapMToggleBtnPressed),
                .nepTopMenu .sapMIBar-CTX .sapMBtn:hover > .sapMBtnTransparent.sapMBtnHoverable:not(.sapMBtnActive):not(.sapMToggleBtnPressed),
                .nepTopMenu .sapMBtn:hover:not(.sapMBtnDisabled) > .sapMBtnHoverable.sapMBtnTransparent:not(.sapMBtnActive):not(.sapMToggleBtnPressed) > .sapMBtnIcon,
                .nepTopMenu *.sapMBtn:hover:not(.sapMBtnDisabled) > span.sapMBtnInner.sapMBtnTransparent:not(.sapMBtnActive):not(.sapMToggleBtnPressed) > .sapMBtnIcon,
                .nepTopMenu :not(.sapMBtnDisabled):not(.sapMSBActive) > span.sapMBtnInner.sapMBtnTransparent:not(.sapMBtnActive):not(.sapMToggleBtnPressed):hover > .sapMBtnIcon,
                .nepTopMenu .nepTopMenuActiveHover span.sapMBtnInner {
                    background-color: ${layout.TOP_HOV_BACK};
                    border-color: ${layout.TOP_HOV_BACK};
                }
            `;
        }
        
        if (layout.TOP_NOTIF_BACK) {
            css += `
                .nepTopMenu .nepNotificationButton span.sapMBtnInner,
                .nepTopMenu .nepNotificationButton.sapMBtn:hover > .sapMBtnHoverable {
                    background-color: ${layout.TOP_NOTIF_BACK};
                    border-color: ${layout.TOP_NOTIF_BACK};
                }
            `;
        }

        if (layout.TOP_NOTIF_COLOR) {
            css += `
                .nepTopMenu .nepNotificationButton span.sapMBtnInner {
                    color: ${layout.TOP_NOTIF_COLOR};
                }
                .nepTopMenu .nepNotificationButton span.sapMBtnInner:hover {
                    color: ${layout.TOP_NOTIF_COLOR};
                }
                .nepTopMenu .nepNotificationButton.sapMBtn:hover > .sapMBtnHoverable,
                .nepTopMenu :not(.sapMBtnDisabled) > .sapMBtnInner.sapMBtnActive {
                    color: ${layout.TOP_NOTIF_COLOR};
                }
            `;
        } else {
            css += `
                .nepTopMenu .nepNotificationButton span.sapMBtnInner {
                    color: ${layout.TOP_TXT_COLOR};
                }
                .nepTopMenu .nepNotificationButton.sapMBtn:hover > .sapMBtnHoverable,
                .nepTopMenu :not(.sapMBtnDisabled) > .sapMBtnInner.sapMBtnActive {
                    color: ${layout.TOP_TXT_COLOR};
                }
            `;
        }

        // Left Sidebar
        if (layout.SIDE_BACK_COLOR) css += `.nepNavBar { background: ${layout.SIDE_BACK_COLOR}; }`;
        if (layout.SIDE_BOR_COLOR) css += `.nepNavBarContent { border-right: 1px solid ${layout.SIDE_BOR_COLOR}; }`;
        if (layout.SIDE_ACT_COLOR) css += `.nepIconActive { border-left: 4px solid ${layout.SIDE_ACT_COLOR} !important; }`;
        if (layout.SIDE_ACT_COLOR) css += `
            html[dir="rtl"] .nepIconActive {
                border-left: none !important;
                border-right: 4px solid ${layout.SIDE_ACT_COLOR} !important;
            }
        `;

        // Shell
        if (layout.SHELL_BACK_COLOR) css += `.nepShell { background: ${layout.SHELL_BACK_COLOR} !important; }`;

        // Page
        if (layout.PAGE_BACK_COLOR) css += `.nepPage { background: ${layout.PAGE_BACK_COLOR}; }`;
        else css += '.nepPage { background: #fff; }';

        if (layout.PAGE_BACK_IMAGE) {
            let imageUrl = mediaUrl + layout.PAGE_BACK_IMAGE;
            if (isMobile || isHCP) imageUrl = imageData[layout.PAGE_BACK_IMAGE] || imageUrl;

            css += `
                nepShell .sapMShellBG.sapUiGlobalBackgroundImage {
                    background: inherit;
                    background-image: url('${imageUrl}');
                    background-repeat: no-repeat;
                    background-size: cover;
                }
            `;
        } else {
            css += '.nepShell .sapMShellBG.sapUiGlobalBackgroundImage { background: inherit; background-image: none; }';
        }

        // Tile Group
        if (layout.HEAD_COLOR) css += `.nepCatPanel { background-color: ${layout.HEAD_COLOR}; }`;

        let borderWidth = layout.HEAD_BORDER_WDT || '3px';
        if (layout.HEAD_BORDER_CLR) css += `.nepCatPanel { border-bottom: ${borderWidth} solid ${layout.HEAD_BORDER_CLR}; }`;

        if (layout.TITLE_COLOR) {
            css += `
                .nepCatTitle.sapMTitle {
                    color: ${layout.TITLE_COLOR};
                }
                .nepCatFavBtn:not(.sapMBtnDisabled) .sapMBtnTransparent > .sapMBtnIcon,
                .nepCatFavBtn:not(.sapMBtnDisabled) .sapMBtnGhost > .sapMBtnIcon {
                    color: ${layout.TITLE_COLOR};
                    text-shadow: none;
                }
            `;
        }
        
        if (layout.SUBTITLE_COLOR) css += `.nepCatSubTitle.sapMTitle { color: ${layout.SUBTITLE_COLOR}; }`;

        // Tiles
        if (layout.TILE_BACK_COLOR) css += `.nepTile { background-color: ${layout.TILE_BACK_COLOR}; }`;

        // Sub Menu Background Color
        if (layout.NAV_BACK_COLOR) {
            css += `
                .nepOverflowMenu.sapMPopover .sapMPopoverCont {
                    background-color: ${layout.NAV_BACK_COLOR};
                }
                .nepOverflowMenu .sapMLIB {
                    background: transparent;
                }
            `;
        }

        // Sub Menu Text Color
        if (layout.NAV_TXT_COLOR) {
            css += `
                .nepPopover .nepOpenAppsBtn .sapMBtnIcon,
                .nepOpenAppsBtn .sapMBtnInner,
                .nepOverflowMenu .nepOpenAppsBtn .sapMBtnInner,
                .nepOpenAppsClose.sapUiIcon,
                .nepOverflowMenu .sapMBtnInner,
                .nepOverflowMenu .sapMSTIIcon,
                .nepOverflowMenu .nepTreeCategory .sapMTreeItemBaseExpander,
                .nepOverflowMenu .sapMTreeItemBase {
                    color: ${layout.NAV_TXT_COLOR};
                    text-shadow: none;
                }
            `;
        }

        // Sub Menu Text Hover Color
        if (layout.NAV_HOV_COLOR) css += `.nepOverflowMenu .sapMBtn:hover > .sapMBtnHoverable { color: ${layout.NAV_HOV_COLOR}; }`;

        // Tile Button
        css += sap.nep.Style.getTileButtonCss({ layout });

        // Scrollbar
        if (layout.SCROLL_COLOR) css += `
            html.sap-desktop ::-webkit-scrollbar-thumb {
                background-color: ${layout.SCROLL_COLOR};
            }
            html.sap-desktop ::-webkit-scrollbar-thumb:hover {
                background-color: ${layout.SCROLL_COLOR};
            }

        `;

        if (layout.SCROLL_WIDTH) css += `
            html.sap-desktop ::-webkit-scrollbar {
                width: ${layout.SCROLL_WIDTH} !important;
                height: ${layout.SCROLL_WIDTH} !important;
            }
        `;

        // Mobile
        if (layout.MOB_TITLE_COL) css += `.nepMobileTitle.sapMTitle { color: ${layout.MOB_TITLE_COL}; text-shadow: none; }`;
        if (layout.MOB_LABEL_COL) css += `.nepMobileLabel { color: ${layout.MOB_LABEL_COL}; text-shadow: none; }`;
        if (layout.MOB_BUT_COL) css += `.nepMobileButton .sapMBtnInner { color: ${layout.MOB_BUT_COL} !important; text-shadow: none !important; }`;
        if (layout.MOB_BUT_BACK) {
            css += `
                .nepMobileButton .sapMBtnInner {
                    background: ${layout.MOB_BUT_BACK} !important;
                    border-color: ${layout.MOB_BUT_BACK} !important;
                }
                .numPad .sapMBtnInner {
                    background: ${layout.MOB_BUT_BACK};
                }
                #boxNumpadPanel .sapMCbBg {
                    background: ${layout.MOB_BUT_BACK};
                    opacity: 0.325;
                }
                #boxNumpadPanel .sapMCbBg.sapMCbMarkChecked {
                    background: ${layout.MOB_BUT_BACK};
                    opacity: 1;
                }
            `;
        }

        // Custom CSS
        if (layout.CUSTOM_CSS) css += layout.CUSTOM_CSS.replace(/\n|\r\n|\r/g, '');
        css += '</style>';

        return { css };
    },

    getTileButtonCss: function (config) {
        return '';
    }
};