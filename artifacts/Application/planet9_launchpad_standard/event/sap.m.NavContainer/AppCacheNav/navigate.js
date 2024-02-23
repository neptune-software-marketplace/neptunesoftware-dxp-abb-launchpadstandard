const params = oEvent.getParameters();
const page = params.to;

// pincode reset screen
if (page.sId === 'AppCache_boxPasscode') {
    if (userIsNotLoggedIn()) {
        oEvent.preventDefault();
    }
}