let movePageId, fromIndex, toIndex;
const elm = document.getElementById('ManagePages-listUl');

const activeCategoryId = getActivePageCategoryId();

sap.n.DragDrop.restrictedTo(elm, (evt, ui) => {
    const elm = ui.item.get(0);
    if (!elm) return;
    
    fromIndex = ui.item.index();
    movePageId = elm.querySelector('.managePagesId').innerText;
}, (evt, ui) => {
    if (!movePageId) return;
    
    toIndex = ui.item.index();
    sap.n.Customization.move('TG', [movePageId], [], toIndex);
    movePageId = null;
    sap.n.Launchpad.BuildMenuTop();
    sap.n.Launchpad.MarkTopMenu(activeCategoryId);
});