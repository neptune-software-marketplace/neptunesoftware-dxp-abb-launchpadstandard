sap.n.HashNavigation = {
    lateNav: null,

    _handler: function () {
        if (location.hash === '#') location.hash === '';

        // Any content ?
        if (location.hash === '') return;

        // Sections 
        if (isSection(location.hash)) return;

        // AppCache Home
        if (location.hash === '#Home') {
            AppCache._Home();
            return;
        }

        // AppCache Back
        if (location.hash === '#Back') {
            AppCache._Back();
            return;
        }

        // Parse Hash
        let parts = location.hash.substring(1).split('&');

        // Top Menu Navigation
        if (parts[0].indexOf('neptopmenu') > -1) {
            const category = sap.n.Customization.getCategory(parts[1]);
            if (category) {
                sap.n.Launchpad.BuildTiles(category);
            } else {
                const url = window.location.href;
                window.location = url.substr(0, url.indexOf('#'));
            }
            return;
        }

        // Enhancement
        if (sap.n.Enhancement.HashNavigation) {
            try {
                let preventDefault = sap.n.Enhancement.HashNavigation(location.hash);
                if (preventDefault) return;
            } catch (e) {
                appCacheError('Enhancement HashNavigation ' + e);
            }
        }

        // Object
        if (parts[0].indexOf('-') > -1) {
            sap.n.HashNavigation.object = parts[0].split('-')[0];
            sap.n.HashNavigation.action = parts[0].split('-')[1];
        }

        // Data
        if (typeof parts[1] !== 'undefined') {
            sap.n.HashNavigation.data = decodeURIComponent(parts[1]);
        } else {
            sap.n.HashNavigation.data = '';
        }

        // Tile
        if (typeof sap.n.HashNavigation.object !== 'undefined' && typeof sap.n.HashNavigation.action !== 'undefined') {
            if (typeof modelAppCacheTiles === 'undefined') {
                sap.n.HashNavigation.initialLoad(sap.n.HashNavigation.guid);
                return;
            }

            let tileData = sap.n.HashNavigation.findTile();
            if (tileData.id) {
                let dataCat = sap.n.HashNavigation.findCategory(tileData.id);
                if (sap.n.Launchpad.currentTile && sap.n.Launchpad.currentTile.id === tileData.id) {
                    if (!sap.n.Apps[tileData.id]) {
                        sap.n.Launchpad._HandleTilePress(tileData, dataCat);
                        return;
                    }

                    if (sap.n.Apps[tileData.id].onNavigation) {
                        sap.n.Apps[tileData.id].onNavigation.forEach(function (data) {
                            if (sap.n.HashNavigation.data) {
                                sap.n.HashNavigation.data = JSON.parse(sap.n.HashNavigation.data);
                            }
                            data(sap.n.HashNavigation.data);
                            sap.n.HashNavigation.data = '';
                        });
                    } else {
                        sap.n.Launchpad._HandleTilePress(tileData, dataCat);
                    }
                } else {
                    sap.n.Launchpad._HandleTilePress(tileData, dataCat);
                }
            } else {
                sap.n.HashNavigation.lateNav = location.hash;
                location.hash = '';
            }

        } else {
            location.hash = '';
            sap.n.Launchpad.SelectHomeMenu();
        }
    },

    findTile: function () {
        return ModelData.FindFirst(AppCacheTiles, ['navObject', 'navAction'], [sap.n.HashNavigation.object, sap.n.HashNavigation.action]) || {};
    },

    findCategory: function (tileId) {
        let dataCat = {};

        // TileGroups
        modelAppCacheCategory.oData.forEach(function (category) {
            let tileFound = ModelData.FindFirst(category.tiles, 'id', tileId)
            if (tileFound) dataCat = category;
        });

        // TileGroupsChild
        modelAppCacheCategoryChild.oData.forEach(function (category) {
            let tileFound = ModelData.FindFirst(category.tiles, 'id', tileId)
            if (tileFound) dataCat = category;
        });

        return dataCat;
    },

    toExternal: function (data) {
        if (data.params) {
            if (data.params === '{}') {
                location.hash = data.target.semanticObject + '-' + data.target.action;
            } else {
                location.hash = data.target.semanticObject + '-' + data.target.action + '&' + encodeURIComponent(JSON.stringify(data.params));
            }
        } else {
            location.hash = data.target.semanticObject + '-' + data.target.action
        }
    },
}

// Register Event
window.onhashchange = function () {
    sap.n.HashNavigation._handler();
}