// standard page (Not a custom page)
const pageId = this.mProperties.fieldGroupIds[0];
const page = modelManagePages.getData().find(page => page.id === pageId);
if (!page) {
    console.log('cannot find page in, standard page (Not a custom page) delete operation');
    return;
}

const prevStatus = page.status;

// update model
modelManagePages.setData(
    modelManagePages.getData().map(page => {
        if (page.id !== pageId) return page;
        page.status = page.status === 'active' ? 'inactive' : 'active';
        return page;
    })
);

// re-enabling standard pages
if (prevStatus === 'inactive') {
    sap.n.Customization.Popover.onActivatePage(pageId);
} else {
    sap.n.Customization.Popover.onDeletePage(pageId);
}