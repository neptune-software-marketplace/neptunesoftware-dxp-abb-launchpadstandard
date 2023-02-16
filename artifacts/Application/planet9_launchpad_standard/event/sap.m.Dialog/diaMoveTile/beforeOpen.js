const { tileId } = modeldiaMoveTile.getData();
const tile = sap.n.Customization.getTile(tileId);
const heading = tile.title ?? tile.label;
titleMoveTile.setText(`${heading} - Move to Screen`);