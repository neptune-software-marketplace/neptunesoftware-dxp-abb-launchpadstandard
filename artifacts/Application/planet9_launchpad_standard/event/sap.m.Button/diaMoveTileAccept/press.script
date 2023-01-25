const activeCategoryId = getActivePageCategoryId();
const { id: selectedCategoryId } = MoveTile.getSelectedItem().getBindingContext().getObject();
if (selectedCategoryId === activeCategoryId) return;

const context = modeldiaMoveTile.getData();
if (!context || Object.keys(context).length === 0) return;

if (context.type === 'tile') {
    const tileId = context.tileId;
    const tileElm = document.getElementById(context.elmId);
    
    const currentContext = sap.n.Customization.findTileDragContext(tileId, tileElm);
    sap.n.Customization.move('T', [...currentContext.parent, tileId], [selectedCategoryId], 0);

    sap.ui.getCore().byId(context.elmId).destroy();

    // destroy content of destination page and re-build it when user navigates to it
    const matchPageId = `page${selectedCategoryId}`;
    AppCacheNav.getPages().forEach((page) => {
        if (page.sId === matchPageId) {
            page.destroy();
        }
    });
}

modeldiaMoveTile.setData({});
diaMoveTile.close();