import { bcrypt } from "../auth/bcryptSetup";
import { getDatabase } from "../database/connection";
import type { UserRegisterProp } from "../../types/users";

export type RegisterResult = {
    success: boolean;
    message: string;
};

export async function handleRegister(form: UserRegisterProp): Promise<RegisterResult> {
    const { username, email, password, confirmPassword } = form;

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
        return { success: false, message: "All fields are required." };
    }

    if (password.length < 6) {
        return { success: false, message: "Password must be at least 6 characters." };
    }

    if (password !== confirmPassword) {
        return { success: false, message: "Passwords do not match." };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        return { success: false, message: "Please enter a valid email address." };
    }

    try {
        const db = await getDatabase();

        const existing = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM users WHERE email = ?",
            [email.trim()]
        );

        if (existing) {
            return { success: false, message: "An account with this email already exists." };
        }

        const hashPassword = await bcrypt.hash(password.toString(), 10);

        await db.runAsync(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            [username.trim(), email.trim(), hashPassword]
        );

        return { success: true, message: "Account created successfully!" };
    } catch (error) {
        console.error("Registration error:", error);
        return { success: false, message: "Something went wrong. Please try again." };
    }
}
