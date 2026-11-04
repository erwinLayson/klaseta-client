import type { Migration } from "../types";

export const createStudentsTable: Migration = {
    version: 2,
    name: "create_students_table",
    up: async (db) => {
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id TEXT,
                firstname TEXT NOT NULL,
                middlename TEXT,
                lastname TEXT NOT NULL,
                suffix TEXT,
                email TEXT,
                teacherId INTEGER NOT NULL,

                FOREIGN KEY (teacherId) REFERENCES users(id) ON DELETE CASCADE     
            );
        `);
    },
};
