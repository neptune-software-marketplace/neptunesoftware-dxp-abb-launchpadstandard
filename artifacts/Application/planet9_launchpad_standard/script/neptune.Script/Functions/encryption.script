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