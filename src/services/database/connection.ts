import type { SQLiteDatabase } from "expo-sqlite";
import { runMigrations } from "./migrationRunner";

const DATABASE_NAME = "klaseta.db";

let databasePromise: Promise<SQLiteDatabase> | null = null;

export function setDatabaseInstance(db: SQLiteDatabase | any) {
    databasePromise = Promise.resolve(db);
}

export function resetDatabaseInstance() {
    databasePromise = null;
}

export async function getDatabase(): Promise<SQLiteDatabase> {
    if (!databasePromise) {
        const SQLITE = await import("expo-sqlite");
        databasePromise = SQLITE.openDatabaseAsync(DATABASE_NAME);
    }

    return databasePromise;
}

export async function initializeDatabase() {
    const db = await getDatabase();
    await runMigrations(db);

    return db;
}

