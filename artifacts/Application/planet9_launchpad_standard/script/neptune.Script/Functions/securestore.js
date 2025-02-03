const SecureStore = {
    async openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("SecureStore", 1);

            request.onupgradeneeded = function () {
                request.result.createObjectStore("keys", { keyPath: "key" });
            };

            request.onsuccess = function () {
                resolve(request.result);
            };

            request.onerror = reject;
        });
    },

    async write(key, value) {
        const db = await this.openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction("keys", "readwrite");
            transaction.objectStore("keys").put({ key, value });
            transaction.oncomplete = resolve;
            transaction.onerror = reject;
        });
    },

    async read(key) {
        const db = await this.openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction("keys", "readonly");
            const req = transaction.objectStore("keys").get(key);
            req.onsuccess = () => resolve(req.result?.value || null);
            req.onerror = reject;
        });
    },

    async generateKey() {
        const key = crypto.getRandomValues(new Uint8Array(32)); // 256-bit key
        return btoa(String.fromCharCode(...key)); // Convert to Base64 for storage
    },
};