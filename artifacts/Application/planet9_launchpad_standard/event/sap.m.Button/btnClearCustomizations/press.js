if (AppCache.isOffline) {
    // user should never be able to remove customizations while in offline mode, otherwise refresh will cause an empty launchpad
    return;
}

sap.m.MessageBox.warning('Are you are sure, you want to clear all your customizations?', {
    title: 'Clear Customizations',
    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.CANCEL],
    emphasizedAction: sap.m.MessageBox.Action.YES,
    onClose: function (sAction) {
        if (sAction === sap.m.MessageBox.Action.YES) {
            sap.n.Customization.clearCustomizations().then(() => {
                sap.m.MessageBox.information('Please refresh to see your standard launchpad.', {
                    icon: sap.m.MessageBox.Icon.SUCCESS,
                    title: 'Customizations Cleared',
                    actions: [sap.m.MessageBox.Action.OK],
                    emphasizedAction: sap.m.MessageBox.Action.OK,
                    onClose: function () {
                        AppCache._Home();
                        location.reload();
                    },
                })
            });
        }
    }
});
