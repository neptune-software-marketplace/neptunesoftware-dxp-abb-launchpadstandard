sap.n.Layout = {
    row: {
        ONE: "One",
        FEW: "Few",
        MORE: "More",
        MANY: "Many",
    },
    tileWidth: {
        SMALL: "Small",
        MEDIUM: "Medium",
        WIDE: "Wide",
        WIDER: "Wider",
        MAX: "Max",
    },

    tileHeight: {
        DEFAULT: "",
        TALL: "Tall",
        TOWER: "Tower",
        SKYSCRAPER: "Skyscraper",
    },

    waitForLayout: 0,

    setHeaderPadding: function (noRebuild) {
        [
            "nepSideCollapsed",
            "nepSideExpanded",
            "nepSideMenu",
            "nepSideMenuCollapsed",
            "nepSideMenuExpanded",
        ].forEach(function (c) {
            topMenu.removeStyleClass(c);
        });

        sap.n.Layout.setLaunchpadContentNavigatorWidth();
        sap.n.Launchpad.setLaunchpadContentWidth();

        if (
            !noRebuild &&
            sap.n.Launchpad.currLayoutContent.shellContentWidth !== "Full" &&
            sap.n.Launchpad.currLayoutContent.headerContentWidth
        ) {
            let menu = launchpadContentMenu.getWidth();
            let navBar = launchpadContentNavigator.getWidth();

            if (menu === "300px" && navBar === "68px")
                topMenu.addStyleClass("nepSideMenuCollapsed");
            else if (menu === "300px" && navBar === "300px")
                topMenu.addStyleClass("nepSideMenuExpanded");
            else if (menu === "300px") topMenu.addStyleClass("nepSideMenu");
            else if (navBar === "68px") topMenu.addStyleClass("nepSideCollapsed");
            else if (navBar === "300px") topMenu.addStyleClass("nepSideExpanded");
        }
    },

    setLaunchpadContentNavigatorWidth: function () {
        if (openApps.getItems().length === 0) {
            launchpadContentNavigator.setWidth("0px");
            return;
        }

        if (sap.n.Launchpad.isPhone()) {
            launchpadContentNavigator.setWidth(
                AppCache.config.activeAppsSideMobile ? "70px" : "0px"
            );
        } else {
            // desktop
            launchpadContentNavigator.setWidth(AppCache.config.activeAppsSide ? "70px" : "0px");
        }
    },

    showAppTitle: function () {
        if (sap.n.Launchpad.isPhone()) {
            if (typeof AppCache.config.showAppTitleMobile === 'undefined') {
                return false;
            }
            return AppCache.config.showAppTitleMobile;
        }

        if (typeof AppCache.config.showAppTitle === 'undefined') {
            return false;
        }
        return AppCache.config.showAppTitle;
    },

    activeAppsSide: function () {
        if (sap.n.Launchpad.isPhone()) {
            if (typeof AppCache.config.activeAppsSideMobile === 'undefined') {
                return false;
            }
            return AppCache.config.activeAppsSideMobile;
        }
        
        if (typeof AppCache.config.activeAppsSide === 'undefined') {
            return false;
        }
        return AppCache.config.activeAppsSide;
    },

    activeAppsTop: function () {
        if (sap.n.Launchpad.isPhone()) {
            if (typeof AppCache.config.activeAppsTopMobile === 'undefined') {
                return false;
            }
            return AppCache.config.activeAppsTopMobile;
        }
        
        if (typeof AppCache.config.activeAppsTop === 'undefined') {
            return false;
        }
        return AppCache.config.activeAppsTop;
    },
    
    showActiveApps: function () {
        return !this.showAppTitle() && !this.activeAppsSide() && !this.activeAppsTop();
    },

    isVerticalMenuPinned: function() {
        return sap.n.Launchpad.isDesktop() && AppCache.config.verticalMenu;
    },

    clearAppCacheAppButtonItems: function () {
        AppCacheAppButton.getItems().forEach((item) => {
            if (item.sId !== 'AppCacheShellAppTitle') {
                item.remove && item.remove();
            }
        });
    },
};
