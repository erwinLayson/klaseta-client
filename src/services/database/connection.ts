import * as SQLITE from "expo-sqlite";

const db = SQLITE.openDatabaseAsync("klaseta.db");

const initilizeDatabase = async () => {
    try {
       (await db).execAsync(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL
            );
        `)
    }catch(err) {
        throw err;
    }
}