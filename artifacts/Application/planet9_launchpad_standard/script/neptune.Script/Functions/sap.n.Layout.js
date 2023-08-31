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
        if (typeof AppCache.config.showAppTitle === 'undefined') {
            return true;
        }

        return sap.n.Launchpad.isPhone()
            ? !!AppCache.config.showAppTitleMobile
            : AppCache.config.showAppTitle;
    },

    activeAppsSide: function () {
        if (typeof AppCache.config.activeAppsSide === 'undefined') {
            return true;
        }

        return sap.n.Launchpad.isPhone()
            ? !!AppCache.config.activeAppsSideMobile
            : AppCache.config.activeAppsSide;
    },

    activeAppsTop: function () {
        if (typeof AppCache.config.activeAppsTop === 'undefined') {
            return true;
        }

        return sap.n.Launchpad.isPhone()
            ? !!AppCache.config.activeAppsTopMobile
            : AppCache.config.activeAppsTop;
    },
    
    activeAppsDisplay: function () {
        return sap.n.Launchpad.isPhone()
            ? !AppCache.config.activeAppsSideMobile &&
                  !AppCache.config.showAppTitleMobile &&
                  !AppCache.config.activeAppsTopMobile
            : (activeAppsDisplay =
                  !AppCache.config.activeAppsSide &&
                  !AppCache.config.showAppTitle &&
                  !AppCache.config.activeAppsTop);
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
