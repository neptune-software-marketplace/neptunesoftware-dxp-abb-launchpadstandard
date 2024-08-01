sap.n.Ajax = {
    SuccessGetMenu: function () {
        // Enhancement
        if (sap.n.Enhancement.SuccessGetMenu) {
            try {
                sap.n.Enhancement.SuccessGetMenu();
            } catch (e) {
                appCacheError('Enhancement SuccessGetMenu ' + e);
            }
        }

        let delRun = [];
        let delFav = [];

        // Check Most Run
        Object.entries(modelAppCacheTilesRun.oData).forEach(function ([_, data]) {
            let rec = ModelData.FindFirst(AppCacheTiles, 'id', data.id);
            if (!rec) {
                delRun.push(data);
            } else {
                ModelData.Update(AppCacheTilesRun, 'id', rec.id, rec);
            }
        });

        delRun.forEach(function (data) {
            ModelData.Delete(AppCacheTilesRun, 'id', data.id);
        });

        modelAppCacheTilesFav.oData.forEach(function (data) {
            let rec = ModelData.FindFirst(AppCacheTiles, 'id', data.id);
            if (!rec) delFav.push(data);
        });

        delFav.forEach(function (data) {
            ModelData.Delete(AppCacheTilesFav, 'id', data.id);
        });

        // Save Run/Fav
        setCacheAppCacheTilesRun();
        setCacheAppCacheTilesFav();

        if (delRun.length) sap.n.Launchpad.handleFavRedraw();

        // Check for rebuilding menu
        let rebuild = false;

        // Tiles - Check last update
        Array.isArray(currTiles) && currTiles.forEach(function (data) {
            let rec = ModelData.FindFirst(AppCacheTiles, 'id', data.id);
            if (rec) {
                if (data.updatedAt !== rec.updatedAt) rebuild = true;
            } else {
                rebuild = true;
            }
        });

        // Category - Check last update
        Array.isArray(currCategory) && currCategory.forEach(function (data) {
            let rec = ModelData.FindFirst(AppCacheCategory, 'id', data.id);
            if (rec) {
                if (data.updatedAt !== rec.updatedAt) rebuild = true;
            } else {
                rebuild = true;
            }
        });

        // Category Child - Check last update
        Array.isArray(currCategoryChild) && currCategoryChild.forEach(function (data) {
            let rec = ModelData.FindFirst(AppCacheCategoryChild, 'id', data.id);
            if (rec) {
                if (data.updatedAt !== rec.updatedAt) rebuild = true;
            } else {
                rebuild = true;
            }
        });

        // New/Deleted
        if (currTiles.length !== modelAppCacheTiles.oData.length) rebuild = true;
        if (currCategory.length !== modelAppCacheCategory.oData.length) rebuild = true;
        if (currCategoryChild.length !== modelAppCacheCategoryChild.oData.length) rebuild = true;
        if (currFav.length !== modelAppCacheTilesFav.oData.length) rebuild = true;

        // Rebuild 
        if (rebuild) {
            if (isSemanticObjectActionPathInHashNavigation()) {
                openTileFromSemanticObjectActionPath(getSemanticObjectActionPathFromHashNavigation());
            } else {
                location.hash = '';
            }

            sap.n.Launchpad.BuildMenu();
            sap.n.Launchpad.RebuildTiles();
        }

        // When using hash first time, need to get tiles from server before hash will work
        if (sap.n.HashNavigation.lateNav) {
            location.hash = sap.n.HashNavigation.lateNav;
            sap.n.HashNavigation.lateNav = null;
        }

        // Cleanup
        currCategoryChild = [];
        currCategory = [];
        currTiles = [];
    },

    loadApps: function (dataTile) {
        if (!dataTile.urlApplication) dataTile.urlApplication = '';
        if (!dataTile.urlType) dataTile.urlType = '';
        if (!dataTile.urlAuth) dataTile.urlAuth = '';

        // Application
        if (dataTile.actionApplication) {
            const { actionApplication, urlApplication } = dataTile;
            const viewName = getAppViewName(actionApplication, urlApplication);

            p9GetView(viewName).then(function (viewData) {
                if (viewData.length <= 2) {
                    appCacheLog(`LoadApps: loading ${actionApplication}`);
                    AppCache.Load(actionApplication, {
                        load: 'download',
                        appPath: urlApplication,
                        appType: dataTile.urlType,
                        appAuth: dataTile.urlAuth,
                        sapICFNode: dataTile.sapICFNode,
                    });
                }
            }).catch(function (e) {
                if (!sapStorageGet(viewName)) {
                    appCacheLog(`LoadApps: loading ${actionApplication}`);
                    AppCache.Load(actionApplication, {
                        load: 'download',
                        appPath: urlApplication,
                        appType: dataTile.urlType,
                        appAuth: dataTile.urlAuth,
                        sapICFNode: dataTile.sapICFNode,
                    });
                }
            });
        }

        // Application in Tile
        if (dataTile.type === 'application' && dataTile.tileApplication) {
            const { tileApplication, urlApplication } = dataTile;
            const viewName = getAppViewName(tileApplication, urlApplication);

            p9GetView(viewName).then(function (viewData) {
                if (viewData.length <= 2) {
                    appCacheLog(`LoadApps: loading ${tileApplication}`);
                    AppCache.Load(tileApplication, { load: 'download' });
                }
            }).catch(function (e) {
                if (!sapStorageGet(viewName)) {
                    appCacheLog(`LoadApps: loading ${tileApplication}`);
                    AppCache.Load(tileApplication, { load: 'download' });
                }
            });
        }
    }
}