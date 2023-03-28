let dragDropProps = {
    forceHelperSize: true,
    tolerance: 'pointer',
    revert: 25,
    opacity: 0.5,
    scroll: true,
    placeholder: 'dragPlaceholder',
    cancel: '.nepResizable',
};

sap.n.DragDrop = {
    restrictedTo(elm, onDragStart, onDragStop) {
        return jQuery(elm).sortable({
            ...dragDropProps,
            start: onDragStart,
            stop: onDragStop,
            containment: 'parent',
        });
    },

    connectWith(selector, onDragStart, onDragStop) {
        return jQuery(selector).sortable({
            ...dragDropProps,
            start: onDragStart,
            stop: onDragStop,
            connectWith: selector,
        });
    },

    setOption(selector, attribute, value) {
        jQuery(selector).sortable('option', attribute, value);
    },
};