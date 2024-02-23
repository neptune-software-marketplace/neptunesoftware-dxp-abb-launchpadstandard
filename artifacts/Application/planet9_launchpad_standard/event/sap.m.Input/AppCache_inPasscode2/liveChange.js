const value = sanitizePincode(this.getValue());
if (value.length > AppCache.passcodeLength) {
    this.setValue(value.substr(0, AppCache.passcodeLength));
    return;
}

this.setValue(value);