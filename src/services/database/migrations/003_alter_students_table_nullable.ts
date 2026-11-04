import type { Migration } from "../types";

export const alterStudentsTableNullable: Migration = {
    version: 3,
    name: "alter_students_table_nullable",
    up: async (db) => {
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS students_temp (
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

        const tableCheck = await db.getFirstAsync<{ name: string }>(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='students';"
        );

        if (tableCheck) {
            try {
                await db.execAsync(`
                    INSERT INTO students_temp (id, student_id, firstname, middlename, lastname, suffix, email, teacherId)
                    SELECT id, student_id, firstname, middlename, lastname, suffix, email, teacherId FROM students;
                `);
            } catch {
                try {
                    await db.execAsync(`
                        INSERT INTO students_temp (id, firstname, lastname, teacherId)
                        SELECT id, firstname, lastname, teacherId FROM students;
                    `);
                } catch (e) {
                    console.warn("Could not copy legacy student records:", e);
                }
            }

            await db.execAsync("DROP TABLE students;");
        }

        await db.execAsync("ALTER TABLE students_temp RENAME TO students;");
    },
};

