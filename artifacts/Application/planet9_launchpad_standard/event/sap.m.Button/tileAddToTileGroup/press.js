let parent = oEvent.getSource().getDomRef();
for (; parent.nodeName !== 'LI'; parent = parent.parentElement);
if (!parent) {
    console.log('DialogAddTile: parent node not found');
    return;
}

const tileId = parent.querySelector('.addTileId').innerText.trim();
const tile = modelAddTiles.getData().find(tile => tile.id === tileId);
if (!tile) {
    console.log('DialogAddTile: on add, tile not found in model');
    return;
}

sap.n.Customization.Popover.addTileFromDialog(tileId, tile.parent);
modelAddTiles.setData(
    modelAddTiles.getData().filter(t => (t.id !== tile.id))
);
