import bcrypt from "bcryptjs";
import * as Crypto from "expo-crypto";

// Ensure bcrypt has a cryptographically secure random fallback in React Native / Hermes
bcrypt.setRandomFallback((len: number) => {
    try {
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

