const CustomizationStorage = {
    formatTile(tile) {
        return {
            id: tile.id,
            status: "active",
            props: {},
            isCustom: false,
        };
    },

    formatTiles(tiles) {
        return tiles.map(this.formatTile);
    },

    formatTileGroup(tilegroup) {
        return {
            id: tilegroup.id,
            status: "active",
            props: {},
            isCustom: false,
            tiles: this.formatTiles(tilegroup.tiles),
            tilegroups: tilegroup.tilegroups.map((tg) => ({
                id: tg.id,
                status: "active",
                props: {},
                isCustom: false,
            })),
        };
    },

    formatCategory(selected, data) {
        return {
            id: selected.id,
            status: "active",
            props: {},
            isCustom: false,
            tiles: this.formatTiles(selected.tiles),
            tilegroups: selected.tilegroups
                .map((tilegroup) => {
                    const tg = data.categoryChilds.find((child) => child.id === tilegroup.id);
                    if (!tg) return null;

                    return this.formatTileGroup(tg);
                })
                .filter((tilegroup) => tilegroup !== null),
        };
    },

    formatCategories(data) {
        return data.category.map((c) => this.formatCategory(c, data));
    },

    // convert list of objects to [{ id }]
    arrToIds(arr) {
        return arr.map((item) => item.id);
    },

    // get new category/tilegroup/tile from what are available
    // current = current list of category/tilegroup/tile in customization
    // available = available list of category/tilegroup/tile from p9 backend
    newFromAvailable(current, available, src) {
        const currentIds = this.arrToIds(current);
        const availableIds = this.arrToIds(available);
        const newIds = availableIds.filter((id) => !currentIds.includes(id));
        return newIds
            .map((newId) => src.find(({ id }) => id === newId))
            .filter((item) => item !== undefined);
    },

    // check if user has access category/tilegroup/tile
    // current = current list of category/tilegroup/tile in customization
    // available = available list of category/tilegroup/tile from p9 backend
    filterByAccess(current, available) {
        const availableIds = this.arrToIds(available);
        return current.filter((item) => {
            if (item.isCustom) return true;
            return availableIds.includes(item.id);
        });
    },

    // group can be a category or a tilegroup
    mergeTiles(type, group, data) {
        group.tiles = this.filterByAccess(group.tiles, data.tiles);

        // add new tiles
        let groupData = null;
        if (type === "category")
            groupData = data.category.find((category) => category.id === group.id);
        else if (type === "tilegroup")
            groupData = data.categoryChilds.find((tilegroup) => tilegroup.id === group.id);

        if (groupData) {
            const newTiles = this.newFromAvailable(group.tiles, groupData.tiles, data.tiles);
            if (newTiles.length === 0) return;

            newTiles.forEach((tile) => {
                // find tile position relative to original position inside the tiles list
                // try to place tile on that particular position
                const placeAt = groupData.tiles.findIndex((groupTile) => groupTile.id === tile.id)
                const formatted = this.formatTile(tile);

                // if we are able to find a position to place the tile, then place the tile
                // otherwise just push it the end
                if (placeAt > -1) {
                    group.tiles.splice(placeAt, 0, formatted);
                } else {
                    group.tiles.push(formatted);
                }
            });
        }
    },

    mergeTileGroups(category, data) {
        category.tilegroups = this.filterByAccess(category.tilegroups, data.categoryChilds);

        // add new tilegroups
        const categoryData = data.category.find((cat) => cat.id === category.id);
        if (categoryData) {
            const newTileGroups = this.newFromAvailable(
                category.tilegroups,
                categoryData.tilegroups,
                data.categoryChilds
            );

            if (newTileGroups.length > 0) {
                newTileGroups.forEach((newTileGroup) => {
                    const placeAt = categoryData.tilegroups.findIndex((tileGroup) => tileGroup.id === newTileGroup.id)
                    const formatted = this.formatTileGroup(newTileGroup);

                    if (placeAt > -1) {
                        category.tilegroups.splice(placeAt, 0, formatted);
                    } else {
                        category.tilegroups.push(formatted);
                    }
                });
            }
        }

        // merge tiles in tilegroup
        for (const tilegroup of category.tilegroups) {
            this.mergeTiles("tilegroup", tilegroup, data);
        }
    },

    mergeCategories(existing, data) {
        existing.categories = this.filterByAccess(existing.categories, data.category);

        for (const category of existing.categories) {
            this.mergeTileGroups(category, data);
            this.mergeTiles("category", category, data);
        }

        // add newly added categories
        const newCategories = this.newFromAvailable(
            existing.categories,
            data.category,
            data.category
        );
        newCategories.forEach((newCategory) => {
            const placeAt = data.category.findIndex((cat) => cat.id === newCategory.id);
            const formatted = this.formatCategory(newCategory, data);

            if (placeAt > -1) {
                existing.categories.splice(placeAt, 0, formatted);
            } else {
                existing.categories.push(formatted);
            }
        });
    },

    merge(existing, data) {
        this.mergeCategories(existing, data);
    },
};

sap.n.Customization = {
    // if customization are not enabled per device
    // by default we will use 'default' as the device name
    getDeviceType() {
        return this.isDeviceBased() ? sap.n.Launchpad.deviceType() : 'default';
    },

    isEmpty(obj) {
        return Object.keys(obj).length === 0;
    },

    isInitialized() {
        return !this.isEmpty(this.getCustomizationsFor(this.getDeviceType()));
    },

    // buttons to customize screens is active / inactive
    isActive: false,

    setActivation(visible) {
        this.isActive = visible;

        btnAddNewPage.setVisible(visible);
        btnManagePages.setVisible(visible);
        btnEditPagesDone.setVisible(visible);

        if (visible) {
            this.jiggle();
        }

        this.tileSelectors.forEach((selector) => {
            sap.n.DragDrop.setOption(selector, 'disabled', !visible);
        });
    },

    isDeviceBased() {
        return AppCache.config && AppCache.config.enableDeviceBasedCustomizations === true;
    },

    areScreensLocked() {
        const { lockScreenChanges } = modelAppCacheDiaSettings.getData();
        return !!lockScreenChanges;
    },

    isUserAnonymous() {
        return AppCache && AppCache.userInfo && AppCache.userInfo.username && AppCache.userInfo.username === 'anonymous';
    },

    areExplicitlyDisabled() {
        return AppCache.config && AppCache.config.disableCustomizations === true;
    },

    // force disabled, otherwise existing launchpads would break
    isDisabled() {
        if (this.areExplicitlyDisabled()) return true;
        
        if (!this.isSupported()) return true;

        // anonymous user is not logged in, and has random public access to the launchpad
        // so saving customizations for such user is not useful
        if (this.isUserAnonymous()) return true;

        // public launchpads are used by everyone in the same standard way
        // so customizations are disabled
        if (AppCache.isPublic) return true;

        // view standard screens
        const { disableScreenChanges } = modelAppCacheDiaSettings.getData();
        if (disableScreenChanges) return true;

        return false;
    },

    addCustomizableClass() {
        querySelector("html").classList.add("lp-is-customizable");
    },

    removeCustomizableClass() {
        querySelector("html").classList.remove("lp-is-customizable");
    },

    initOffline() {
        if (!this.isDisabled()) {
            this.addCustomizableClass();
        }
        
        return Promise.resolve();
    },

    init(data) {
        if (this.isDisabled()) {
            this.setCustomizationsInContext(this.formatForStorage(data));
            return Promise.resolve();
        }

        this.addCustomizableClass();

        if (this.isInitialized()) {
            CustomizationStorage.merge(this.getCustomizationsInContext(), data);
            this.save();
            return Promise.resolve();
        }

        return new Promise((resolve, _reject) => {
            this.fetchFromP9()
                .then((customizations) => {
                    if (customizations && !this.isEmpty(customizations)) {
                        // update from server
                        this.setCustomizationsInContext(customizations);
                        CustomizationStorage.merge(this.getCustomizationsInContext(), data);
                    } else {
                        // initiate based on current launchpad settings
                        this.setCustomizationsInContext(this.formatForStorage(data));
                    }

                    this.save();
                })
                .finally(() => {
                    resolve();
                });
        });
    },

    getCustomizations() {
        return modelAppCacheCustomization.getData();
    },

    getCustomizationsFor(deviceType) {
        const data = this.getCustomizations()[deviceType];
        if (!data || this.isEmpty(data)) return {};
        return data;
    },

    getCustomizationsInContext() {
        return this.getCustomizationsFor(this.getDeviceType());
    },

    setCustomizationsFor(deviceType, customizations) {
        const data = this.getCustomizations();
        data[deviceType] = customizations;
        modelAppCacheCustomization.setData(data);
    },

    setCustomizationsInContext(customizations) {
        this.setCustomizationsFor(this.getDeviceType(), customizations);
    },

    saveToLocal() {
        setCacheAppCacheCustomization();
    },

    // customizations are only supported for 21-lts onwards, with 22-lts offering backend storage
    isSupported() {
        return parseInt(AppCache.p9Version.split(".")[0]) >= 21;
    },

    // we only support storing customization from 22-LTS onwards
    isP9Supported() {
        if (!AppCache.p9Version) return false;
        return parseInt(AppCache.p9Version.split(".")[0]) >= 22;
    },

    getP9URL(deviceType) {
        return `${AppCache.Url}/api/launchpad_customizations/${AppCache.launchpadID}/${deviceType}`;
    },

    fetchFromP9() {
        if (!this.isP9Supported()) return Promise.resolve({});

        // make a call to p9 to fetch customizations for device
        return new Promise((resolve, _reject) => {
            jsonRequest({
                type: "GET",
                url: this.getP9URL(this.getDeviceType()),
            }).then((res) => {
                if (this.isEmpty(res)) {
                    return resolve({});
                }

                return resolve(res["config"]);
            });
        });
    },

    saveToP9() {
        if (!this.isP9Supported()) return;

        const deviceType = this.getDeviceType();
        return jsonRequest({
            type: "POST",
            url: this.getP9URL(deviceType),
            data: JSON.stringify({
                config: this.getCustomizationsFor(deviceType),
            }),
        });
    },

    removeFromP9() {
        if (!this.isP9Supported()) return;

        const deviceType = this.getDeviceType();
        return jsonRequest({
            type: "DELETE",
            url: this.getP9URL(deviceType),
        });
    },

    clearCustomizations() {
        this.setCustomizationsInContext(null);
        this.saveToLocal();
        return this.removeFromP9();
    },

    formatForStorage(data) {
        return {
            categories: CustomizationStorage.formatCategories(data),
        };
    },

    save() {
        this.saveToLocal();
        this.saveToP9();
    },

    // give the id (uuid) of a Category/TileGroup/Tile find it's path
    // only search within category if provided
    // status = active/inactive/'', empty = don't filter on status
    findPath(id, status = "") {
        const customizations = this.getCustomizationsInContext();
        if (this.isEmpty(customizations)) return;

        const categories = customizations.categories.filter((category) => {
            if (status === "") return true;
            return category.status === status;
        });

        for (const { id: categoryId, tiles, tilegroups } of categories) {
            if (id === categoryId) return { type: "category", path: [categoryId] };

            for (const { id: tileId } of tiles) {
                if (id === tileId) return { type: "tile", path: [categoryId, tileId] };
            }

            for (const { id: tileGroupId, tiles } of tilegroups) {
                if (id === tileGroupId)
                    return { type: "tilegroup", path: [categoryId, tileGroupId] };

                for (const { id: tileId } of tiles) {
                    if (id === tileId)
                        return { type: "tile", path: [categoryId, tileGroupId, tileId] };
                }
            }
        }
    },

    // find item the list [{ id }]
    findInList(id, list) {
        const item = list.find((item) => item.id === id);
        if (item) return [item, list, list.findIndex((item) => item.id === id)];
        return [null, list, -1];
    },

    // returns item for the last uuid in uuids array, and the array inside which the item exists
    // returning
    //      [null, message, -1] not found, message will clarify the reason
    //      [null, list, -1]    not found, in the list
    //      [item, list, index] item was found, in the list
    // status can be active/inactive, on removal status becomes inactive
    find(uuids, status = "active") {
        const customizations = this.getCustomizationsInContext();
        if (this.isEmpty(customizations)) return [null, "customization is not initialized", -1];

        function itemStatusCheck(item) {
            // if item exists and status to find is '' then it exists
            if (item && status === "") return true;
            return item && item.status === status;
        }

        let found;
        const level = uuids.length;
        if (level === 1) {
            found = this.findInList(uuids[0], customizations.categories);
            if (itemStatusCheck(found[0])) return found;
            return [null, "category does not exist", -1];
        } else if (level === 2) {
            const [category, categories] = this.find([uuids[0]]);
            if (!category) return [null, categories, -1];

            // at the level 2, item exists in either a tile or  tilegroup

            found = this.findInList(uuids[1], category.tiles);
            if (itemStatusCheck(found[0])) return found;

            found = this.findInList(uuids[1], category.tilegroups);
            if (itemStatusCheck(found[0])) return found;

            return [null, "does not exist in tile or tile group", -1];
        } else if (level === 3) {
            found = this.find([uuids[0], uuids[1]]);

            // if tilegroup does not exist, or
            if (!found[0]) return [null, found[1], -1];

            // if tilegroup does not have tiles (which means uuids[1] probably refers to a tile)
            //  so we won't be able to use uuid[2] further to find the actual match
            if (found[0] && !found[0].tiles)
                return [null, "unable to use the 3rd uuid to find further", -1];

            // TileGroup > TileGroup > Tile
            // at this last-level we are only looking for a tile
            found = this.findInList(uuids[2], found[0].tiles);
            if (itemStatusCheck(found[0])) return found;

            return [null, "tile does not exist in TileGroup > TileGroup", -1];
        }

        // should never get here, if it does we return not found
        return [null, "we do not know where to look", -1];
    },

    // type can be T=TILE or TG=TILE_GROUP
    // add item to index, uuids is destination path
    add(type, item, index, uuids = []) {
        // on move the item status might be removed
        item.status = "active";

        // if no uuid then add it to categories
        if (uuids.length === 0) {
            if (type === "TG") {
                const customizations = this.getCustomizationsInContext();
                const [category, _, categoryIndex] = this.findInList(
                    item.id,
                    customizations.categories
                );

                if (category) customizations.categories.splice(categoryIndex, 1);
                customizations.categories.splice(index, 0, item);
                this.save();
            }
            return;
        }

        // get the item on the uuids path, add to that item to category or tilegroups at the specified index
        let [found] = this.find(uuids, "active");
        if (!found) return;

        if (type === "TG") {
            const [tilegroup, _, tilegroupIndex] = this.findInList(item.id, found.tilegroups);

            if (tilegroup) found.tilegroups.splice(tilegroupIndex, 1);
            found.tilegroups.splice(index, 0, item);
        } else if (type === "T") {
            const [tile, _, tileIndex] = this.findInList(item.id, found.tiles);
            if (tile) found.tiles.splice(tileIndex, 1);
            found.tiles.splice(index, 0, item);
        }

        this.save();
    },

    remove(uuids) {
        let [found, list, index] = this.find(uuids);
        if (!found) return;

        found.status = "inactive";

        // custom items can be removed
        if (found.isCustom) {
            list.splice(index, 1);
        }

        this.save();
    },

    // only useful for calculating then next index when moving
    // a Category/Tile/TileGroup within it's own list
    moveToIndex(current, next) {
        return current === 0 || next === 0 || next + 1 >= current ? next : next - 1;
    },

    // is moving inside categories, tilegroups or within it's parent group
    isSrcEqualToDst(src, dst) {
        const srcLen = src.length;
        const dstLen = dst.length;

        if (srcLen === 1 && dstLen === 0) {
            // moving category inside categories
            return true;
        } else if (srcLen === 2 && dstLen === 1 && src[0] === dst[0]) {
            // moving tile group inside category or tile inside category
            return true;
        } else if (srcLen === 3 && dstLen === 2 && src[0] === dst[0] && src[1] === dst[1]) {
            // moving tile inside tilegroup
            return true;
        }

        return false;
    },

    // an array of from/to consisting of UUID's defining the location to move from/to
    // e.g. src: [tile_group_id, tile_id], dst: [tile_group_id, tile_group_id, tile_id]
    //      src: Tile Group > Tile
    //      dst: Tile Group > Tile Group > Tile at (position 2)
    move(type, src, dst, index) {
        let [item, _list, currentIndex] = this.find(src);
        if (!item) return;

        if (this.isSrcEqualToDst(src, dst)) {
            if (index === currentIndex) return;
            index = this.moveToIndex(currentIndex, index);
        }

        this.remove(src);
        this.add(type, JSON.parse(JSON.stringify(item)), index, dst);
    },

    // categories, tilegroups, tiles in an array, based on status
    filterByStatus(item, status) {
        return item !== undefined && item.status === status;
    },

    filterByActiveStatus(item) {
        if (typeof item.status === 'undefined') return true;
        return this.filterByStatus(item, "active");
    },

    getCategory(categoryId) {
        const category = ModelData.FindFirst(AppCacheCategory, "id", categoryId);
        if (category) return Object.assign({}, JSON.parse(JSON.stringify(category)), {
            status: "active",
        });

        return this.getCategories().find((category) => category.id === categoryId);
    },

    getAllCategories() {
        if (this.isDisabled()) {
            return modelAppCacheCategory.getData();
        }

        const { categories } = this.getCustomizationsInContext();
        return categories
            .map((category) => {
                if (category.isCustom) return category;
                return Object.assign({}, this.getCategory(category.id), {
                    status: category.status,
                });
            })
            .filter((category) => typeof category !== "undefined");
    },

    getCategories() {
        const { categories } = this.getCustomizationsInContext();
        if (typeof categories === "undefined") {
            return modelAppCacheCategory
                .getData()
                .map((c) => Object.assign({}, JSON.parse(JSON.stringify(c))), {
                    status: "active",
                });
        }

        return categories
            .filter((category) => this.filterByActiveStatus(category))
            .map((category) => {
                if (category.isCustom) return category;
                return Object.assign({}, this.getCategory(category.id), {
                    status: "active",
                });
            })
            .filter((category) => typeof category !== "undefined");
    },

    getTileGroup(tileGroupId) {
        return ModelData.FindFirst(AppCacheCategoryChild, "id", tileGroupId);
    },

    getTileGroups(id) {
        if (this.isDisabled()) {
            const category = ModelData.FindFirst(AppCacheCategory, "id", id);
            if (category) return category.tilegroups;
        }

        const result = this.findPath(id);
        if (result === undefined) {
            // exceptional case: tiles groups referenced from a tile group, which is linked as an action from a launchpad tile
            // but that tile group is not included as part of standard tile groups in the launchpad
            const tilegroup = sap.n.Customization.getTileGroup(id);
            if (Array.isArray(tilegroup.tilegroups) && tilegroup.tilegroups.length > 0) {
                return tilegroup.tilegroups;
            }

            return [];
        }

        const { path } = this.findPath(id);
        if (path.length === 0) return [];

        const [item] = this.find(path);
        if (!item) return [];

        const { tilegroups } = item;
        return tilegroups
            .filter((tileGroup) => this.filterByActiveStatus(tileGroup))
            .map((tileGroup) => this.getTileGroup(tileGroup.id))
            .filter((tileGroup) => typeof tileGroup !== "undefined");
    },

    getTile(tileId) {
        return ModelData.FindFirst(AppCacheTiles, "id", tileId);
    },

    getTiles(id) {
        if (this.isDisabled()) {
            const category = ModelData.FindFirst(AppCacheCategory, "id", id);
            if (category) return category.tiles;

            const childCategory = ModelData.FindFirst(AppCacheCategoryChild, "id", id);
            if (childCategory) return childCategory.tiles;
        }

        const result = this.findPath(id);
        if (result === undefined || result.path.length === 0) {
            // if we are fetching tiles for tile group, but get nothing
            // it "might" be a referenced from a Tile itself as action. But,
            // the tiles inside it are not included directly as part of the launchpad
            const tileGroup = sap.n.Customization.getTileGroup(id);
            if (Array.isArray(tileGroup.tiles) && tileGroup.tiles.length > 0) {
                return tileGroup.tiles;
            }

            return [];
        }

        const [item] = this.find(result.path);
        if (!item) return [];

        const { tiles } = item;
        return tiles
            .filter((tile) => this.filterByActiveStatus(tile))
            .map((tile) => this.getTile(tile.id))
            .filter((tile) => typeof tile !== "undefined");
    },

    jiggleElement() {
        return querySelector("html");
    },

    jiggle() {
        this.jiggleElement().classList.add("jiggle");
    },

    isJiggling() {
        return this.jiggleElement().classList.contains("jiggle");
    },

    stopJiggling() {
        this.setActivation(false);
        this.jiggleElement().classList.remove("jiggle");
        sap.n.Launchpad.BuildTreeMenu();
    },

    checkToStopJigglingOnMouseDown(e) {
        if (!sap.n.Customization.isJiggling()) return;

        let el = e.target;

        // check if mousedown has occurred inside the AppCacheNav
        let inContext = false;
        while (el) {
            if (el.id === "AppCacheNav") {
                inContext = true;
                break;
            }

            el = el.parentNode;
        }

        if (!inContext) return;

        // check if event was recieved by nepFCardContainer or one of it's children
        const clsCardContainer = "nepFCardContainer";
        const clsNewCard = "nepNewCard";
        el = e.target;
        while (
            el &&
            el.classList &&
            !el.classList.contains(clsCardContainer) &&
            !el.classList.contains(clsNewCard)
        ) {
            el = el.parentNode;
        }

        // event was not recieved on the Edit Screen interactive element
        if (
            !el ||
            !el.classList ||
            (!el.classList.contains(clsCardContainer) && !el.classList.contains(clsNewCard))
        ) {
            sap.n.Customization.stopJiggling();
        }
    },

    findTileIndex(tileId, parentElm) {
        return Array.from(parentElm.querySelectorAll(".nepFCardContainer")).findIndex((tileElm) => {
            return tileElm.dataset.tileId === tileId;
        });
    },

    findTileElement(elm) {
        for (let parent = elm; parent; parent = parent.parentNode) {
            const ds = parent.dataset;
            if (ds.context && ds.context === "tile") {
                return parent;
            }
        }

        return null;
    },

    findTileDragContext(tileId, tileElm) {
        const index = this.findTileIndex(tileId, tileElm.parentNode);

        for (let parent = tileElm.parentNode; parent; parent = parent.parentNode) {
            const ds = parent.dataset;
            if (ds.context) {
                const context = ds.context;

                if (context === "page" || context === "category-tiles") {
                    return {
                        index,
                        tileId,
                        context,
                        parent: [ds.categoryId],
                    };
                } else if (context === "tilegroup-tiles") {
                    return {
                        index,
                        tileId,
                        context,
                        parent: [ds.categoryId, ds.tilegroupId],
                    };
                }
            }
        }

        return null;
    },

    tilesDragDropClass: "tiles-drag-drop",
    tileSelectors: new Set(),
    applyDragDropToTiles(sapElm) {
        if (this.isDisabled()) return;

        let src, dst;

        function onStart(evt, ui) {
            const elm = ui.item.get(0);
            if (!elm) return;

            const tileId = elm.dataset.tileId;
            if (!tileId) return;

            src = this.findTileDragContext(tileId, elm);
        }

        function onStop(evt, ui) {
            const elm = ui.item.get(0);
            if (!elm) return;

            const tileId = elm.dataset.tileId;
            if (!tileId) return;

            dst = this.findTileDragContext(tileId, elm);

            // moving tiles within category / tilegroup
            if (src.parent.join("") === dst.parent.join("")) {
                dst.index = sap.n.Customization.moveToIndex(src.index, dst.index);
            }

            sap.n.Customization.move("T", [...src.parent, src.tileId], dst.parent, dst.index);
        }

        const selector = `#${sapElm.getId()} .${this.tilesDragDropClass}`;
        this.tileSelectors.add(selector);
        
        sap.n.DragDrop.connectWith(selector, onStart.bind(this), onStop.bind(this));
        sap.n.DragDrop.setOption(selector, 'disabled', true);
    },

    setCardSize(elm, width, height) {
        if (!elm) return;

        elm.classList.remove(
            ...["Small", "Medium", "Wide", "Wider", "Max", "Tall", "Tower", "Skyscraper"].map(
                (v) => `nepTile${v}`
            )
        );

        elm.classList.add(`nepTile${width ?? "Small"}`);
        if (height) elm.classList.add(`nepTile${height}`);
    },

    showManagePagesDialog() {
        modelManagePages.setData(
            sap.n.Customization.getAllCategories().map((c) => ({
                id: c.id,
                status: c.status,
                isCustom: !!c.isCustom,
                title: c.isCustom ? c.props.menuText : c.title,
            }))
        );

        diaManagePages.open();
    },

    showAddPageDialog() {
        modelPageForm.setData({
            menuText: "New Screen",
            title: "New Screen Title",
            subTitle: "",
        });
        diaPage.open();
    },

    addPage(props) {
        const id = ModelData.genID();
        const customizations = this.getCustomizationsInContext();
        this.add(
            "TG",
            {
                props,
                id,
                isCustom: true,
                tilegroups: [],
                tiles: [],
            },
            customizations.categories.length
        );
        sap.n.Launchpad.BuildMenuTop();
        location.hash = `neptopmenu&${id}`;

        // activate edit screen, on creating a new screen
        this.setActivation(true);
        this.jiggle();

        // open add new app dialog
        this.onAddTile([id]);
    },

    setPage(props) {
        const categoryId = props.id;
        const { menuText, title, subTitle } = props;
        this.saveProperties([categoryId], { menuText, title, subTitle });

        const pageCat = sap.ui.getCore().byId(`page${categoryId}`);
        if (pageCat) pageCat.destroy();

        const category = this.getCategory(categoryId);
        if (category) sap.n.Launchpad.BuildTiles(category);

        sap.n.Launchpad.BuildMenuTop();
    },

    onAddTile(parent) {
        const [obj, _list, index] = sap.n.Customization.find(parent);
        if (index === -1) return;

        const activeTileIds = obj.tiles
            .filter((tile) => sap.n.Customization.filterByActiveStatus(tile))
            .map((tile) => tile.id);
        const missingTiles = modelAppCacheTiles
            .getData()
            .filter((tile) => !activeTileIds.includes(tile.id));

        modelAddTiles.setData(
            missingTiles.map((tile) => ({
                parent,
                id: tile.id,
                title: tile.title,
                subTitle: tile.subTitle,
                visible: true,
            }))
        );
        diaAddTile.open();
    },

    // path to where page/tilegroup/tile exists
    // props can be anything from { width, height } to complete information about the page/tilegroup/tile
    saveProperties(path, props) {
        let [found] = this.find(path);
        if (!found) return;

        found.props = props;
        this.save();
    },

    getProperties(path) {
        let [found] = this.find(path);
        if (!found) return false;
        return found.props;
    },
};

sap.n.Customization.Popover = {
    // context in which popover was called
    context: null,

    createEventDelegate(config) {
        let longPressTimer = null;
        return {
            oncontextmenu(e) {
                if (sap.n.Customization.isJiggling()) return;
                if (e.button < 2) return;

                const { disableScreenChanges } = modelAppCacheDiaSettings.getData();
                if (disableScreenChanges) return true;

                const elm = elById(config.elmId);
                if (!elm) return;

                sap.n.Customization.Popover.open(elm, config);
                e.preventDefault();
            },
            onmousedown(e) {
                if (sap.n.Customization.isJiggling()) return;

                const { disableScreenChanges } = modelAppCacheDiaSettings.getData();
                if (disableScreenChanges) return true;

                // long press to show user menu is not applicable for the desktop
                if (navigator.maxTouchPoints === 0) return;

                longPressTimer = setTimeout(() => {
                    const elm = elById(config.elmId);
                    if (!elm) return;

                    sap.n.Customization.Popover.open(elm, config);
                }, 1000);
            },
            onmouseup(e) {
                clearTimeout(longPressTimer);
            },
        };
    },

    onEditCustomPage(id) {
        const category = sap.n.Customization.getCategory(id);
        if (!category) return;

        const { menuText, title, subTitle } = category.props;
        modelPageForm.setData({ id, menuText, title, subTitle });
        diaPage.open();
        diaManagePages.close();
    },

    onAddCustomPage() {
        sap.n.Customization.showAddPageDialog();
        this.close();
    },

    onEditPage() {
        sap.n.Customization.setActivation(true);
        sap.n.Customization.jiggle();
        this.close();
    },

    onDeletePage(id) {
        diaManagePages.close();

        const category = sap.n.Customization.getCategory(id);
        if (!category) return;

        let title = category.title;
        if (category.isCustom) title = category.props.menuText;

        sap.m.MessageBox.confirm(`Are you sure, you want to remove ${title}? `, {
            onClose: function (action) {
                if (action === "OK") {
                    sap.n.Customization.remove([id]);
                    sap.n.Launchpad.BuildMenuTop();

                    if (id === getActivePageCategoryId()) {
                        AppCache._Home();
                    }

                    sap.n.Customization.showManagePagesDialog();
                }
            },
        });
    },

    onActivatePage(id) {
        const [category] = sap.n.Customization.find([id], "inactive");
        if (!category) return;

        category.status = "active";
        sap.n.Customization.save();
        sap.n.Launchpad.BuildMenuTop();
    },

    onManagePages() {
        this.close();
        sap.n.Customization.showManagePagesDialog();
    },

    addTileFromDialog(tileId, parent) {
        const item = CustomizationStorage.formatTile(sap.n.Customization.getTile(tileId));
        const [parentItem] = sap.n.Customization.find(parent);
        sap.n.Customization.add("T", item, parentItem.tiles.length, parent);
        sap.n.Launchpad.RebuildTiles();
    },

    onTileResize() {
        console.log("onTileResize");
        this.close();
    },

    onMoveTileToAnotherPage() {
        modeldiaMoveTile.setData(this.context);
        
        const cats = sap.n.Customization.getCategories().filter((c) => c.id !== getActivePageCategoryId());
        modelMoveTile.setData(
            cats.map((c) => ({
                id: c.id,
                title: c.isCustom ? c.props.menuText : c.title,
            }))
        );

        this.close();
        diaMoveTile.open();
    },

    onTileRemove() {
        const { elmId, tileId } = this.context;
        const elm = sap.ui.getCore().byId(elmId);
        if (elm) {
            const ctx = sap.n.Customization.findTileDragContext(tileId, elm.getDomRef());
            if (!ctx) return;

            sap.n.Customization.remove([...ctx.parent, ctx.tileId]);
            elm.destroy();
        }

        this.close();
    },

    init() {
        if (sap.n.Customization.isDisabled()) return;
    },

    isOpen() {
        return popCustomizationTiles.isOpen();
    },

    open(elm, config) {
        if (!elm || this.isOpen()) return;
        
        this.context = config;
        popCustomizationTiles.openBy(elm);
    },

    close() {
        popCustomizationTiles.close();
    },
};

// used for resizing tiles
sap.n.Customization.Resize = {
    active: false,
    context: null,

    init() {
        this.active = true;
        this.context = {
            config: null,

            x1: -1,
            y1: -1,
            x2: -1,
            y2: -1,

            startWidth: -1,
            startHeight: -1,
            endWidth: -1,
            endHeight: -1,
        }
    },

    getTileSize() {
        const rect = this.context.config.cardContainer.getDomRef().getBoundingClientRect();
        return [rect.width, rect.height];
    },

    getTileWidthClass(width) {
        if (width <= 215) return sap.n.Layout.tileWidth.SMALL;
        else if (width > 215 && width <= 430) return sap.n.Layout.tileWidth.MEDIUM;
        else if (width > 430 && width <= 645) return sap.n.Layout.tileWidth.WIDE;
        else if (width > 645 && width <= 860) return sap.n.Layout.tileWidth.WIDER;
        else if (width > 860) return sap.n.Layout.tileWidth.MAX;

        return sap.n.Layout.tileWidth.SMALL; // default
    },

    getHeightClass(height) {
        if (height <= 270) return sap.n.Layout.tileHeight.DEFAULT;
        else if (height > 270 && height <= 540) return sap.n.Layout.tileHeight.TALL;
        else if (height > 540 && height <= 710) return sap.n.Layout.tileHeight.TOWER;
        else if (height > 710) return sap.n.Layout.tileHeight.SKYSCRAPER;

        return sap.n.Layout.tileHeight.DEFAULT;
    },

    getCardFromCardContainer(container) {
        const cards = container.getItems().filter(item => item.hasStyleClass('nepFCard'));
        if (cards.length === 0) return null;
        return cards[0];
    },

    setTileSize(width, height) {
        const ref = this.context.config.cardContainer;
        [
            sap.n.Layout.tileWidth.SMALL,
            sap.n.Layout.tileWidth.MEDIUM,
            sap.n.Layout.tileWidth.WIDE,
            sap.n.Layout.tileWidth.WIDER,
            sap.n.Layout.tileWidth.MAX
        ].forEach(size => ref.removeStyleClass(`nepTile${size}`));
        const widthClass = this.getTileWidthClass(width);
        ref.addStyleClass(`nepTile${widthClass}`);

        [
            sap.n.Layout.tileHeight.DEFAULT,
            sap.n.Layout.tileHeight.TALL,
            sap.n.Layout.tileHeight.TOWER,
            sap.n.Layout.tileHeight.SKYSCRAPER,
        ].forEach(size => ref.removeStyleClass(`nepTile${size}`));
        
        const heightClass = this.getHeightClass(height);
        if (heightClass) ref.addStyleClass(`nepTile${heightClass}`);
        console.log('nepTile', `nepTile${heightClass}`);
        
        const card = this.getCardFromCardContainer(ref);
        if (!card) return;

        card.setWidth(`${width}px`);
        card.setHeight(`${height}px`);
    },

    onMouseDown(evt, config) {
        this.init();
        document.body.classList.add('resizing');

        this.context.config = config;
        [this.context.startWidth, this.context.startHeight] = this.getTileSize();
        [this.context.x1, this.context.y1] = [evt.pageX, evt.pageY];
    },
    
    onMouseMove(evt) {
        if (!this.active) return;

        const width = this.context.startWidth + (evt.pageX - this.context.x1);
        const height = this.context.startHeight + (evt.pageY - this.context.y1);
        this.setTileSize(width, height);
    },

    onMouseUp(evt) {
        if (!this.active) return;

        document.body.classList.remove('resizing');

        const width = this.context.startWidth + (evt.pageX - this.context.x1);
        const height = this.context.startHeight + (evt.pageY - this.context.y1);
        
        const widthClass = this.getTileWidthClass(width);
        const heightClass = this.getHeightClass(height);

        const card = this.getCardFromCardContainer(this.context.config.cardContainer);
        card.setWidth('100%');
        card.setHeight('100%');
        
        const { config } = this.context;
        const tileId = config.dataTile.id;
        if (config.isFav) {
            const fav = ModelData.FindFirst(AppCacheTilesFav, "id", tileId);
            fav.cardWidth = widthClass;
            fav.cardHeight = heightClass;

            ModelData.Update(AppCacheTilesFav, "id", tileId, fav);
            setCacheAppCacheTilesFav();
            sap.n.Launchpad.saveFav();
        } else {
            let path = null;
            for (let parent = config.cardContainer.getDomRef(); parent; parent = parent.parentNode) {
                const ds = parent.dataset;
                if (!ds || !ds.context) continue;

                if (ds.context === "page" || ds.context === "category-tiles") {
                    path = [ds.categoryId, tileId];
                    break;
                } else if (ds.context === "tilegroup-tiles") {
                    path = [ds.categoryId, ds.tilegroupId, tileId];
                    break;
                }
            }

            if (path) {
                sap.n.Customization.saveProperties(path, { width: widthClass, height: heightClass });
            }
        }

        this.active = false;
        this.context = {
            config: null,
            x1: -1,
            y1: -1,
            x2: -1,
            y2: -1,
            initialWidth: -1,
            initialHeight: -1,
        };
    }
};

// mousedown event to check and stop jiggling
document.body.addEventListener("mousedown", sap.n.Customization.checkToStopJigglingOnMouseDown);

// mouse up/move events for resizing tiles
document.body.addEventListener("mousemove", (evt) => {
    sap.n.Customization.Resize.onMouseMove(evt);
});
document.body.addEventListener("mouseup", (evt) => {
    sap.n.Customization.Resize.onMouseUp(evt);
});