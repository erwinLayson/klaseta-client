import * as SQLITE from "expo-sqlite";
import { runMigrations } from "./migrationRunner";

const DATABASE_NAME = "klaseta.db";

let databasePromise: Promise<SQLITE.SQLiteDatabase> | null = null;

export function getDatabase() {
    if (!databasePromise) {
        databasePromise = SQLITE.openDatabaseAsync(DATABASE_NAME);
    }

    return databasePromise;
}

export async function initializeDatabase() {
    const db = await getDatabase();
    await runMigrations(db);

    return db;
}
