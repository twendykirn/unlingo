// Helper function to convert ArrayBuffer to Hex String
function arrayBufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Helper function to convert Hex String to Uint8Array
// This is needed for a robust timingSafeCompare if we compare byte arrays
function hexToUint8Array(hexString: string): Uint8Array {
    if (hexString.length % 2 !== 0) {
        // Or handle as an error, depending on how strict you want to be.
        // For signature verification, this is an immediate fail.
        console.warn('Hex string has odd length, cannot be valid signature format.');
        return new Uint8Array(0); // Return empty array, comparison will fail
    }
    const byteArray = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        byteArray[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
        if (isNaN(byteArray[i / 2])) {
            console.warn('Hex string contains non-hex characters.');
            return new Uint8Array(0); // Invalid hex
        }
    }
    return byteArray;
}

// Timing-safe string comparison for hex strings
// Note: Node's crypto.timingSafeEqual expects Buffers of the same length.
// This implementation compares the hex strings directly after ensuring same length.
// For a more robust byte-level timing safe comparison, convert to Uint8Array first.
function timingSafeCompareHex(aHex: string, bHex: string): boolean {
    if (aHex.length !== bHex.length) {
        // This check itself isn't "timing-safe" in the abstract sense, but for
        // fixed-length outputs like HMACs, if lengths differ, it's an invalid signature.
        // Node's crypto.timingSafeEqual throws if buffer lengths are different.
        return false;
    }

    // Convert to byte arrays for a byte-by-byte comparison
    // This is closer to what crypto.timingSafeEqual does.
    const aBytes = hexToUint8Array(aHex);
    const bBytes = hexToUint8Array(bHex);

    if (aBytes.length === 0 || bBytes.length === 0) {
        // Handles malformed hex from hexToUint8Array
        return false;
    }

    // At this point, aBytes.length should equal bBytes.length because aHex.length === bHex.length
    // and hexToUint8Array halves the length.
    // If hexToUint8Array returned an empty array for one due to malformation,
    // this check ensures we don't proceed with mismatched (or zero-length) byte arrays.
    if (aBytes.length !== bBytes.length) {
        return false; // Should ideally not be reached if hex strings were same length and valid
    }

    let diff = 0;
    for (let i = 0; i < aBytes.length; i++) {
        diff |= aBytes[i] ^ bBytes[i];
    }
    return diff === 0;
}

export const verifyCreemSignature = async (args: {
    rawPayload: string;
    receivedSignature: string;
    webhookSecret: string;
}): Promise<boolean> => {
    console.log('Web Crypto Action: Verifying Creem signature...');

    if (!args.webhookSecret) {
        console.error('Web Crypto Action Error: CREEM_WEBHOOK_SECRET environment variable is not set.');
        return false;
    }

    if (!args.rawPayload || !args.receivedSignature) {
        console.error('Web Crypto Action Error: Missing rawPayload or receivedSignature.');
        return false;
    }

    try {
        const encoder = new TextEncoder(); // To convert strings to Uint8Array

        // 1. Import the secret key
        const keyData = encoder.encode(args.webhookSecret);
        const cryptoKey = await crypto.subtle.importKey(
            'raw', // format
            keyData, // key material
            { name: 'HMAC', hash: 'SHA-256' }, // algorithm details
            false, // extractable
            ['sign'] // usages
        );

        // 2. Prepare the payload
        const payloadData = encoder.encode(args.rawPayload);

        // 3. Sign the payload (generate HMAC)
        const signatureBuffer = await crypto.subtle.sign(
            'HMAC', // algorithm
            cryptoKey, // key
            payloadData // data to sign
        );

        // 4. Convert the ArrayBuffer signature to a hex string
        const expectedSignature = arrayBufferToHex(signatureBuffer);

        // 5. Use timing-safe comparison
        //    Make sure receivedSignature is also treated as hex
        const isValid = timingSafeCompareHex(
            args.receivedSignature, // Already a hex string
            expectedSignature // Our generated hex string
        );

        if (!isValid) {
            console.warn(
                'Web Crypto Action: Signature verification failed. Expected:',
                expectedSignature,
                'Received:',
                args.receivedSignature
            );
        } else {
            console.log('Web Crypto Action: Signature verified successfully.');
        }
        return isValid;
    } catch (error: any) {
        // Handle errors like invalid hex strings in the signature (though hexToUint8Array tries to catch some)
        // or issues with crypto.subtle operations.
        console.error('Web Crypto Action Error during signature verification:', error.message, error.stack);
        return false;
    }
};
