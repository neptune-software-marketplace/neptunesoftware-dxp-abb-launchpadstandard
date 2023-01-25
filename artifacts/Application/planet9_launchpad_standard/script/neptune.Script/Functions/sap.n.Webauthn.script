sap.n.Webauthn = {
    register: function (userinfo) {
        return new Promise(function (resolve) {
            let challenge = new Uint8Array(16);
            let userid = new Uint8Array(16);
            let publicKeyCredentialOptions = {
                challenge: window.crypto.getRandomValues(challenge),
                rp: {
                    name: 'Neptune DX Platform',
                    id: location.hostname
                },
                user: {
                    id: window.crypto.getRandomValues(userid),
                    name: userinfo.username,
                    displayName: userinfo.name,
                },
                pubKeyCredParams: [
                    { 'type': 'public-key', 'alg': -7 },
                    { 'type': 'public-key', 'alg': -35 },
                    { 'type': 'public-key', 'alg': -36 },
                    { 'type': 'public-key', 'alg': -257 },
                    { 'type': 'public-key', 'alg': -258 },
                    { 'type': 'public-key', 'alg': -259 },
                    { 'type': 'public-key', 'alg': -37 },
                    { 'type': 'public-key', 'alg': -38 },
                    { 'type': 'public-key', 'alg': -39 },
                    { 'type': 'public-key', 'alg': -8 }],
                authenticatorSelection: {
                    requireResidentKey: false,
                    userVerification: 'discouraged',
                },
                transports: ['usb', 'ble', 'nfc'],
                timeout: 60000,
                attestation: 'none',
                extensions: {
                    auth: userinfo.auth
                }
            };

            // Create User
            navigator.credentials.create({
                publicKey: publicKeyCredentialOptions
            }).then(function (credential) {
                let decodedAttestationObject = CBOR.decode(credential.response.attestationObject);
                let { authData } = decodedAttestationObject;
                let dataView = new DataView(new ArrayBuffer(2));
                let idLenBytes = authData.slice(53, 55);

                idLenBytes.forEach((value, index) => dataView.setUint8(index, value));
                let credentialIdLength = dataView.getUint16();
                let credentialId = authData.slice(55, 55 + credentialIdLength);

                resolve(sap.n.Webauthn.bufferEncode(credentialId));

            }).catch(function (e) {
                appCacheLog(e);
                resolve('ERROR');
            });
        });
    },

    login: function (userId) {
        return new Promise(function (resolve) {
            const challenge = new Uint8Array(16);
            const publicKeyCredentialOptions = {
                challenge: window.crypto.getRandomValues(challenge),
                allowCredentials: [{
                    id: sap.n.Webauthn.bufferDecode(userId),
                    type: 'public-key',
                }],
                userVerification: 'discouraged',
                rpId: location.hostname,
                timeout: 60000
            };

            // Get User
            navigator.credentials.get({
                publicKey: publicKeyCredentialOptions
            })
            .then(resolve)
            .catch(function (e) {
                appCacheLog(e);
                resolve(e);
            });
        });
    },

    string2buffer: function (str) {
        return (new Uint8Array(str.length)).map(function (x, i) {
            return str.charCodeAt(i)
        });
    },

    bufferEncode: function (value) {
        return sap.n.Webauthn.fromByteArray(value);
    },

    bufferDecode: function (value) {
        return Uint8Array.from(atob(value), c => c.charCodeAt(0));
    },

    buffer2string: function (buf) {
        let str = '';
        if (!(buf.constructor === Uint8Array)) buf = new Uint8Array(buf);
        buf.map(function (x) {
            return str += String.fromCharCode(x)
        });
        return str;
    },

    fromByteArray: function (uint8) {
        let lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/-';
        let i;
        let extraBytes = uint8.length % 3;
        let output = '';
        let temp, length;

        function encode(num) {
            return lookup.charAt(num);
        }

        function tripletToBase64(num) {
            return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
        }

        for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
            temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
            output += tripletToBase64(temp)
        }

        switch (extraBytes) {
            case 1:
                temp = uint8[uint8.length - 1];
                output += encode(temp >> 2);
                output += encode((temp << 4) & 0x3F);
                output += '==';
                break;
            case 2:
                temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
                output += encode(temp >> 10);
                output += encode((temp >> 4) & 0x3F);
                output += encode((temp << 2) & 0x3F);
                output += '=';
                break;
            default:
                break;
        }

        return output;
    }
}