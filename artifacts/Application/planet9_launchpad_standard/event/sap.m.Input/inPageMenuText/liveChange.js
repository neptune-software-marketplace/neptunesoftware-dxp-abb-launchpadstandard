const val = this.getValue();
if (!val || val.trim().length === 0) {
    this.setValueState('Error');
    this.setValueStateText('Menu title is required.')
    return;
}

this.setValueState().setValueStateText('');
