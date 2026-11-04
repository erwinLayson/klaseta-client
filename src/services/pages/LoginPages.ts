import { bcrypt } from "../auth/bcryptSetup";
import { getDatabase } from "../database/connection";
import type { UserCredentialProp } from "../../types/users";

export type LoginResult = {
    success: boolean;
    message: string;
    username?: string;
};

export async function handleLogin(credential: UserCredentialProp): Promise<LoginResult> {
    const { username, password } = credential;

    if (!username.trim() || !password) {
        return { success: false, message: "Please enter your username and password." };
    }

    try {
        const db = await getDatabase();

        const user = await db.getFirstAsync<{ id: number; username: string; password: string }>(
            "SELECT id, username, password FROM users WHERE username = ?",
            [username.trim()]
        );

        if (!user) {
            return { success: false, message: "Account not found. Please check your username." };
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch && user.password !== password) {
            return { success: false, message: "Incorrect password. Please try again." };
        }

        return { success: true, message: "Login successful!", username: user.username };
    } catch (error) {
        console.error("Login error:", error);
        return { success: false, message: "Something went wrong. Please try again." };
    }
}
