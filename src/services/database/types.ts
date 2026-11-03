import type { SQLiteDatabase } from "expo-sqlite";

export type Migration = {
    version: number;
    name: string;
    up: (db: SQLiteDatabase) => Promise<void>;
};
