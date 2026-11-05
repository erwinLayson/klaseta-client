import type { Migration } from "../types";

export const createAcademicHistoryAndRecords: Migration = {
    version: 10,
    name: "create_academic_history_and_records",
    up: async (db) => {
        // 1. Add status column to academic_settings if it doesn't already exist
        const settingsCols = await db.getAllAsync<{ name: string }>(
            "PRAGMA table_info(academic_settings)"
        );
        if (!settingsCols.some((c) => c.name === "status")) {
            await db.execAsync(
                "ALTER TABLE academic_settings ADD COLUMN status TEXT NOT NULL DEFAULT 'active'"
            );
        }

        // 2. Create academic_years table to track school years and their status
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS academic_years (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacherId INTEGER NOT NULL,
                schoolYear TEXT NOT NULL,
                semester TEXT NOT NULL DEFAULT '1st Semester',
                quarterCount INTEGER NOT NULL DEFAULT 4,
                status TEXT NOT NULL DEFAULT 'active',
                completedAt TEXT,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (teacherId) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(teacherId, schoolYear)
            );
        `);

        // 3. Create academic_records table (stores class-level archived records per school year)
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS academic_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacherId INTEGER NOT NULL,
                academicYearId INTEGER,
                schoolYear TEXT NOT NULL,
                classId INTEGER,
                className TEXT NOT NULL,
                section TEXT,
                subject TEXT,
                studentCount INTEGER NOT NULL DEFAULT 0,
                passedCount INTEGER NOT NULL DEFAULT 0,
                failedCount INTEGER NOT NULL DEFAULT 0,
                averageGrade REAL,
                averageAttendance REAL,
                status TEXT NOT NULL DEFAULT 'completed',
                notes TEXT,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (teacherId) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (academicYearId) REFERENCES academic_years(id) ON DELETE CASCADE
            );
        `);

        // 4. Create academic_student_records table (stores individual student grade snapshots)
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS academic_student_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recordId INTEGER NOT NULL,
                studentId INTEGER,
                studentName TEXT NOT NULL,
                lrn TEXT,
                gender TEXT,
                finalGrade REAL,
                letterGrade TEXT,
                remarks TEXT,
                attendanceRate REAL,
                quarterGrades TEXT,
                breakdown TEXT,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (recordId) REFERENCES academic_records(id) ON DELETE CASCADE
            );
        `);

        // 5. Seed initial active school year in academic_years for every teacher based on settings
        const teachers = await db.getAllAsync<{ id: number }>("SELECT id FROM users");
        for (const t of teachers) {
            const settings = await db.getFirstAsync<{
                academicYear: string;
                semester: string;
                quarterCount: number;
                status: string;
            }>("SELECT academicYear, semester, quarterCount, status FROM academic_settings WHERE teacherId = ?", [
                t.id,
            ]);

            const year = settings?.academicYear || "2024-2025";
            const sem = settings?.semester || "1st Semester";
            const qc = settings?.quarterCount || 4;
            const status = settings?.status || "active";

            await db.runAsync(
                `INSERT OR IGNORE INTO academic_years (teacherId, schoolYear, semester, quarterCount, status)
                 VALUES (?, ?, ?, ?, ?)`,
                [t.id, year, sem, qc, status]
            );
        }
    },
};

