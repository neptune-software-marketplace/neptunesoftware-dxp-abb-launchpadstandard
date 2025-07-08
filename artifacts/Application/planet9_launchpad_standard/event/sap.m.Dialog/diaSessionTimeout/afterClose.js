if (AppCache.enablePasscode) {
    AppCache.Lock();
} else {
    AppCache.Logout();
}