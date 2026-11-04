import type { Migration } from "../types";

export const createAttendanceTables: Migration = {
    version: 4,
    name: "create_attendance_tables",
    up: async (db) => {
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS attendance_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                title TEXT,
                teacherId INTEGER NOT NULL,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (teacherId) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS attendance_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sessionId INTEGER NOT NULL,
                studentId INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'present',

                FOREIGN KEY (sessionId) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
                FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
                UNIQUE(sessionId, studentId)
            );
        `);
    },
};

