// custom page
const pageId = this.mProperties.fieldGroupIds[0];
modelManagePages.setData(
    modelManagePages.getData().map(page => {
        if (page.id !== pageId) return page;
        page.status = page.status === 'active' ? 'inactive' : 'active';
        return page;
    })
);
sap.n.Customization.Popover.onDeletePage(pageId);
