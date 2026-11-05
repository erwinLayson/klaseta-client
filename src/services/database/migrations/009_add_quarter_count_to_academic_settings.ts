import type { Migration } from "../types";

export const addQuarterCountToAcademicSettings: Migration = {
    version: 9,
    name: "add_quarter_count_to_academic_settings",
    up: async (db) => {
        const cols = await db.getAllAsync<{ name: string }>("PRAGMA table_info(academic_settings)");
        const exists = cols.some((c) => c.name === "quarterCount");
        if (!exists) {
            await db.execAsync("ALTER TABLE academic_settings ADD COLUMN quarterCount INTEGER DEFAULT 4;");
        }
        await db.runAsync("UPDATE academic_settings SET quarterCount = 4 WHERE quarterCount IS NULL OR quarterCount <= 0;");
    },
};

