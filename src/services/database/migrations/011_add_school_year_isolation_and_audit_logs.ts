import type { Migration } from "../types";

export const addSchoolYearIsolationAndAuditLogs: Migration = {
    version: 11,
    name: "add_school_year_isolation_and_audit_logs",
    up: async (db) => {
        // 1. Helper to add a column safely if it doesn't already exist
        const addColumnIfNotExists = async (table: string, column: string, colDef: string) => {
            const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
            const exists = cols.some((c) => c.name === column);
            if (!exists) {
                await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${colDef}`);
            }
        };

        // 2. Add school_year_id to all operational tables
        await addColumnIfNotExists("classes", "school_year_id", "INTEGER");
        await addColumnIfNotExists("class_students", "school_year_id", "INTEGER");
        await addColumnIfNotExists("attendance_sessions", "school_year_id", "INTEGER");
        await addColumnIfNotExists("grading_weights", "school_year_id", "INTEGER");
        await addColumnIfNotExists("assessments", "school_year_id", "INTEGER");
        await addColumnIfNotExists("academic_settings", "current_school_year_id", "INTEGER");

        // 3. Create school_year_audit_logs table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS school_year_audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacherId INTEGER NOT NULL,
                schoolYearId INTEGER,
                schoolYear TEXT NOT NULL,
                action TEXT NOT NULL,
                performedBy TEXT NOT NULL,
                notes TEXT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (teacherId) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (schoolYearId) REFERENCES academic_years(id) ON DELETE SET NULL
            );
        `);

        // 4. Backfill existing data for all teachers
        const teachers = await db.getAllAsync<{ id: number; username: string }>(
            "SELECT id, username FROM users"
        );

        for (const t of teachers) {
            // Find or initialize active academic settings
            let settings = await db.getFirstAsync<{
                academicYear: string;
                semester: string;
                quarterCount: number;
                status: string;
                current_school_year_id: number | null;
            }>("SELECT * FROM academic_settings WHERE teacherId = ?", [t.id]);

            if (!settings) {
                await db.runAsync(
                    `INSERT OR IGNORE INTO academic_settings (teacherId, academicYear, activeQuarter, semester, passingScore, quarterCount, status)
                     VALUES (?, '2024-2025', 'Q1', '1st Semester', 75.0, 4, 'active')`,
                    [t.id]
                );
                settings = await db.getFirstAsync<{
                    academicYear: string;
                    semester: string;
                    quarterCount: number;
                    status: string;
                    current_school_year_id: number | null;
                }>("SELECT * FROM academic_settings WHERE teacherId = ?", [t.id]);
            }

            const schoolYear = settings?.academicYear || "2024-2025";
            const semester = settings?.semester || "1st Semester";
            const quarterCount = settings?.quarterCount || 4;
            const status = settings?.status || "active";

            // Find or insert in academic_years
            await db.runAsync(
                `INSERT OR IGNORE INTO academic_years (teacherId, schoolYear, semester, quarterCount, status)
                 VALUES (?, ?, ?, ?, ?)`,
                [t.id, schoolYear, semester, quarterCount, status]
            );

            const yearRow = await db.getFirstAsync<{ id: number }>(
                "SELECT id FROM academic_years WHERE teacherId = ? AND schoolYear = ?",
                [t.id, schoolYear]
            );

            if (yearRow) {
                const yearId = yearRow.id;

                // Set current_school_year_id in settings
                await db.runAsync(
                    "UPDATE academic_settings SET current_school_year_id = ? WHERE teacherId = ?",
                    [yearId, t.id]
                );

                // Backfill classes
                await db.runAsync(
                    "UPDATE classes SET school_year_id = ? WHERE teacherId = ? AND school_year_id IS NULL",
                    [yearId, t.id]
                );

                // Backfill class_students
                await db.runAsync(
                    `UPDATE class_students SET school_year_id = ? 
                     WHERE school_year_id IS NULL AND classId IN (SELECT id FROM classes WHERE teacherId = ?)`,
                    [yearId, t.id]
                );

                // Backfill attendance_sessions
                await db.runAsync(
                    "UPDATE attendance_sessions SET school_year_id = ? WHERE teacherId = ? AND school_year_id IS NULL",
                    [yearId, t.id]
                );

                // Backfill grading_weights
                await db.runAsync(
                    "UPDATE grading_weights SET school_year_id = ? WHERE teacherId = ? AND school_year_id IS NULL",
                    [yearId, t.id]
                );

                // Backfill assessments
                await db.runAsync(
                    "UPDATE assessments SET school_year_id = ? WHERE teacherId = ? AND school_year_id IS NULL",
                    [yearId, t.id]
                );

                // Insert initial audit log if none exists
                const existingLog = await db.getFirstAsync<{ id: number }>(
                    "SELECT id FROM school_year_audit_logs WHERE teacherId = ? AND schoolYearId = ?",
                    [t.id, yearId]
                );
                if (!existingLog) {
                    await db.runAsync(
                        `INSERT INTO school_year_audit_logs (teacherId, schoolYearId, schoolYear, action, performedBy, notes)
                         VALUES (?, ?, ?, 'INITIALIZED', ?, 'System initialization of school-year isolation')`,
                        [t.id, yearId, schoolYear, t.username]
                    );
                }
            }
        }
    },
};

