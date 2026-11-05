import type { Migration } from "../types";

export const addAcademicSettingsAndQuarterTracking: Migration = {
    version: 8,
    name: "add_academic_settings_and_quarter_tracking",
    up: async (db) => {
        // 1. Create academic_settings table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS academic_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacherId INTEGER NOT NULL UNIQUE,
                academicYear TEXT NOT NULL DEFAULT '2024-2025',
                activeQuarter TEXT NOT NULL DEFAULT 'Q1',
                semester TEXT NOT NULL DEFAULT '1st Semester',
                passingScore REAL NOT NULL DEFAULT 75.0,
                quarterCount INTEGER NOT NULL DEFAULT 4,
                updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (teacherId) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        // Helper to add a column safely if it doesn't exist
        const addColumnIfNotExists = async (table: string, column: string, colDef: string) => {
            const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
            const exists = cols.some((c) => c.name === column);
            if (!exists) {
                await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${colDef}`);
            }
        };

        // 2. Add quarter column to attendance_sessions and assessments, and quarterCount to academic_settings
        await addColumnIfNotExists("academic_settings", "quarterCount", "INTEGER DEFAULT 4");
        await addColumnIfNotExists("attendance_sessions", "quarter", "TEXT DEFAULT 'Q1'");
        await addColumnIfNotExists("assessments", "quarter", "TEXT DEFAULT 'Q1'");

        // 3. Ensure existing records have a valid quarter
        await db.runAsync("UPDATE attendance_sessions SET quarter = 'Q1' WHERE quarter IS NULL OR quarter = ''");
        await db.runAsync("UPDATE assessments SET quarter = 'Q1' WHERE quarter IS NULL OR quarter = ''");

        // 4. Initialize default academic settings for all existing teachers
        const teachers = await db.getAllAsync<{ id: number }>("SELECT id FROM users");
        for (const t of teachers) {
            await db.runAsync(
                `INSERT OR IGNORE INTO academic_settings (teacherId, academicYear, activeQuarter, semester, passingScore)
                 VALUES (?, '2024-2025', 'Q1', '1st Semester', 75.0)`,
                [t.id]
            );
        }
    },
};

