setCacheAppCacheDiaSettings();

const lockScreensState = this.getSelected();
const disableScreenChangesState = chkAppCacheDisableScreenChanges.getSelected();

chkAppCacheDisableScreenChanges.setEnabled(!lockScreensState);
AppCacheUserActionEditScreen.setVisible(
    !lockScreensState && !disableScreenChangesState
);