const value = this.getValue().toLowerCase().trim();
if (value.length === 0) {
    modelAddTiles.setData(
        modelAddTiles.getData().map(tile => {
            tile.visible = true;
            return tile;
        })
    );
    return;
}

modelAddTiles.setData(
    modelAddTiles.getData().map(tile => {
        const { title, subTitle } = tile;
        tile.visible = false;
        if (title && title.toLowerCase().includes(value) ||
            subTitle && subTitle.toLowerCase().includes(value)) {
            tile.visible = true;
        }
        return tile;
    })
);