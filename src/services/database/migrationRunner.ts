import type { SQLiteDatabase } from "expo-sqlite";
import { migrations } from "./migrations";

export async function runMigrations(db: SQLiteDatabase) {
    await db.execAsync("PRAGMA journal_mode = WAL;");

    const result = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
    const currentVersion = result?.user_version ?? 0;

    const pendingMigrations = migrations
        .filter((migration) => migration.version > currentVersion)
        .sort((a, b) => a.version - b.version);

    for (const migration of pendingMigrations) {
        await db.withTransactionAsync(async () => {
            await migration.up(db);
            await db.execAsync(`PRAGMA user_version = ${migration.version};`);
        });
    }
}
