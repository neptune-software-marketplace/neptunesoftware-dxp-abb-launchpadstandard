function isAutoLockTimerEnabled() {
    return AppCache.timerLock && AppCache.timerLock > 0;
}

function getAutoLockTimeoutInMilliSecs() {
    return AppCache.timerLock * 1000;
}

const AutoLockTimer = {
    labelId: "AutoLockTimerID",
    labelTimestamp: "AutoLockTimerTimestamp",
    events: [
        "mousemove",
        "mousedown",
        "keypress",
        "DOMMouseScroll",
        "mousewheel",
        "touchmove",
        "MSPointerMove",
    ],
    addEventListeners: function () {
        this.events.forEach((evt) => document.addEventListener(evt, AutoLockTimer.onEvent, false));
    },
    removeEventListeners: function () {
        this.events.forEach((evt) => document.removeEventListener(evt, AutoLockTimer.onEvent, false));
    },
    onEvent: function () {
        AutoLockTimer.reset();
    },

    getTimeoutId: function () {
        return localStorage.getItem(this.labelId);
    },
    setTimeoutId: function (id) {
        localStorage.setItem(this.labelId, id);
    },
    removeTimeoutId: function () {
        localStorage.removeItem(this.labelId);
    },

    getTimestamp: function () {
        return localStorage.getItem(this.labelTimestamp);
    },
    setTimestamp: function (value) {
        localStorage.setItem(this.labelTimestamp, value);
    },
    removeTimestamp: function () {
        localStorage.removeItem(this.labelTimestamp);
    },
    hasElapsed: function () {
        let timestamp = this.getTimestamp();

        // timer lock is enabled, but we don't have any timestamp
        if (isAutoLockTimerEnabled() && !timestamp) {
            return true;
        }

        if (!timestamp) {
            return false;
        }

        const elapsed = Date.now() - parseInt(timestamp);
        return elapsed >= getAutoLockTimeoutInMilliSecs();
    },

    visibilityChangeEnabled: false,
    start: function () {
        if (!isAutoLockTimerEnabled()) return;

        const timeoutId = window.setTimeout(this.onTimeout.bind(this), getAutoLockTimeoutInMilliSecs());
        this.setTimeoutId(timeoutId);
        this.setTimestamp(Date.now());

        this.addEventListeners();
        if (!this.visibilityChangeEnabled) {
            document.addEventListener('visibilitychange', this.onVisibilityChange.bind(this));
            this.visibilityChangeEnabled = true;
        }
    },
    stop: function () {
        if (!isAutoLockTimerEnabled()) return;
        
        this.removeEventListeners();

        const timeoutId = this.getTimeoutId();
        if (timeoutId) {
            window.clearTimeout(parseInt(timeoutId));
        }

        this.removeTimeoutId();
        this.removeTimestamp();
    },
    reset: function () {
        this.stop();
        this.start();
    },
    onVisibilityChange: function () {
        if (this.hasElapsed()) {
            this.onTimeout();
        }
    },
    onTimeout: function () {
        if (AppCache.enablePasscode) {
            AppCache.Lock();
        } else {
            this.showTimedOutDialog();
            AppCache.Logout();
        }
    },
    showTimedOutDialog: function () {
        if (!diaAutolocked.isOpen()) {
            // open with a delay since navigating back to lock screen hides the dialog
            setTimeout(() => {
                diaAutolocked.open()
            }, 3000);
        }
    },
};

sap.n.Phonegap.onPauseCustom = function () {
    // Handle the pause event
    // in P9 AppCache.Initialized might not exist. Just use if (AppCache)
    if (AppCache.Initialized) {
        let timeoutId = AutoLockTimer.getTimeoutId();
        if (timeoutId) {
            window.clearTimeout(parseInt(timeoutId));
        }
    }
};

sap.n.Phonegap.onResumeCustom = function () {
    // Handle the resume event
    // in P9 AppCache.Initialized might not excist. Just use if (AppCache)
    if (AppCache.Initialized) {
        if (AutoLockTimer.hasElapsed()) {
            AutoLockTimer.showTimedOutDialog();
            AppCache.Lock();
            AutoLockTimer.stop();
        } else {
            AutoLockTimer.start();
        }
    }
};
