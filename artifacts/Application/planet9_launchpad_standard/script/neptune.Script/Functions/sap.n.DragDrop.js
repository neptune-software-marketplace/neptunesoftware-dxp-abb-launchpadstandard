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
    isAvailable() {
        return typeof jQuery.fn.sortable === 'function';
    },

    restrictedTo(elm, onDragStart, onDragStop) {
        if (!sap.n.DragDrop.isAvailable() || sap.n.Customization.isDisabled()) return;

        return jQuery(elm).sortable({
            ...dragDropProps,
            start: onDragStart,
            stop: onDragStop,
            containment: 'parent',
        });
    },

    connectWith(selector, onDragStart, onDragStop) {
        if (!sap.n.DragDrop.isAvailable() || sap.n.Customization.isDisabled()) return;
        
        return jQuery(selector).sortable({
            ...dragDropProps,
            start: onDragStart,
            stop: onDragStop,
            connectWith: selector,
        });
    },

    setOption(selector, attribute, value) {
        if (!sap.n.DragDrop.isAvailable() || sap.n.Customization.isDisabled()) return;
        
        jQuery(selector).sortable('option', attribute, value);
    },
};