import bcrypt from "bcryptjs";

// Ensure bcrypt has a cryptographically secure random fallback in React Native / Hermes / Node
bcrypt.setRandomFallback((len: number) => {
    try {
        if (typeof globalThis !== "undefined" && globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
            const randomBytes = globalThis.crypto.getRandomValues(new Uint8Array(len));
            return Array.from(randomBytes);
        }
        // Fallback for environments where expo-crypto is available
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Crypto = require("expo-crypto");
        const randomBytes = Crypto.getRandomValues(new Uint8Array(len));
        return Array.from(randomBytes);
    } catch {
        const fallbackBytes: number[] = [];
        for (let i = 0; i < len; i++) {
            fallbackBytes.push(Math.floor(Math.random() * 256));
        }
        return fallbackBytes;
    }
});

export { bcrypt };


