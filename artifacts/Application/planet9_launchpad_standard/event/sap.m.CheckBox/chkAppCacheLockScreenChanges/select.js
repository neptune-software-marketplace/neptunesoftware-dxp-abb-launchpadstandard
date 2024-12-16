setCacheAppCacheDiaSettings();

const lockScreensState = this.getSelected();
const disableScreenChangesState = chkAppCacheDisableScreenChanges.getSelected();

chkAppCacheDisableScreenChanges.setEnabled(!lockScreensState);
AppCacheUserActionEditScreen.setVisible(
    !lockScreensState && !disableScreenChangesState
);

if (!lockScreensState) {
    sap.n.Launchpad.RebuildTiles();
    sap.n.Launchpad.BuildMenuTop();
    sap.n.Launchpad.BuildTreeMenu();
}