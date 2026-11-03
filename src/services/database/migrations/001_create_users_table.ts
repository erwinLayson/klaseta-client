import type { Migration } from "../types";

export const createUsersTable: Migration = {
    version: 1,
    name: "create_users_table",
    up: async (db) => {
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL
            );
        `);
    },
};
