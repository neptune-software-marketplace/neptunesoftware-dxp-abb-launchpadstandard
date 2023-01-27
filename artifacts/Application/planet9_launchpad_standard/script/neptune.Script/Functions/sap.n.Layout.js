sap.n.Layout = {
    row: {
        ONE: 'One',
        FEW: 'Few',
        MORE: 'More',
        MANY: 'Many'
    },
    tileWidth: {
        SMALL: 'Small',
        MEDIUM: 'Medium',
        WIDE: 'Wide',
        WIDER: 'Wider',
        MAX: 'Max'
    },

    tileHeight: {
        DEFAULT: '',
        TALL: 'Tall',
        TOWER: 'Tower',
        SKYSCRAPER: 'Skyscraper'
    },

    waitForLayout: 0,

    setHeaderPadding: function (noRebuild) {
        ['nepSideCollapsed', 'nepSideExpanded', 'nepSideMenu', 'nepSideMenuCollapsed', 'nepSideMenuExpanded'].forEach(function (c) {
            topMenu.removeStyleClass(c);
        });

        sap.n.Launchpad.setLaunchpadContentWidth();

        if (!noRebuild && sap.n.Launchpad.currLayoutContent.shellContentWidth !== 'Full' && sap.n.Launchpad.currLayoutContent.headerContentWidth) {
            let menu = launchpadContentMenu.getWidth();
            let navBar = launchpadContentNavigator.getWidth();

            if (menu === '300px' && navBar === '68px') topMenu.addStyleClass('nepSideMenuCollapsed');
            else if (menu === '300px' && navBar === '300px') topMenu.addStyleClass('nepSideMenuExpanded');
            else if (menu === '300px') topMenu.addStyleClass('nepSideMenu');
            else if (navBar === '68px') topMenu.addStyleClass('nepSideCollapsed');
            else if (navBar === '300px') topMenu.addStyleClass('nepSideExpanded');
        }
    },
};
