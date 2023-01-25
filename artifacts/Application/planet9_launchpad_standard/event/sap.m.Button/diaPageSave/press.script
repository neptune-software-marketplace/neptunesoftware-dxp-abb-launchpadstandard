const data = modelPageForm.getData();
const { id, menuText, title } = data;

if (
    !title || title.trim().length === 0 ||
    !menuText || menuText.trim().length === 0
) {
    sap.m.MessageToast.show('Required fields are missing.');
    return;
}

if (id) {
    sap.n.Customization.setPage(data);
} else {
    sap.n.Customization.addPage(data);
}

modelPageForm.setData({});
diaPage.close();