async function openSecureDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("SecureStore", 1);
        
        request.onupgradeneeded = function () {
            request.result.createObjectStore("keys", { keyPath: "id" });
        };
        
        request.onsuccess = function () {
            resolve(request.result);
        };

        request.onerror = reject;
    });
}

async function getKeyIndexedDB() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("keys", "readonly");
        const getRequest = transaction.objectStore("keys").get("k");
        getRequest.onsuccess = () => resolve(getRequest.result?.value || null);
        getRequest.onerror = reject;
    });
}

function generatePBKDF2Key(phrase, salt) {
    return CryptoJS.PBKDF2(phrase, salt, {
        keySize: 256 / 32,
        iterations: typeof AppCache.pincodeKeyIterations !== 'undefined' ? AppCache.pincodeKeyIterations : 10,
    });
}

function encryptAES(msg, secret) {
    return CryptoJS.AES.encrypt(msg, secret);
}

function decryptAES(encrypted, secret) {
    const decrypted = CryptoJS.AES.decrypt(encrypted, secret);
    return decrypted.toString(CryptoJS.enc.Utf8);
}

function generateKeyForLoginToken() {
    return generatePBKDF2Key(location.hostname, location.protocol).toString();
}