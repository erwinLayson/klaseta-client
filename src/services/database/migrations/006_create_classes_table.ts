import type { Migration } from "../types";

export const createClassesTable: Migration = {
    version: 6,
    name: "create_classes_table",
    up: async (db) => {
        // 1. Create classes table
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS classes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacherId INTEGER NOT NULL,
                name TEXT NOT NULL,
                section TEXT,
                subject TEXT,
                room TEXT,
                schedule TEXT,
                color TEXT DEFAULT '#4F46E5',
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (teacherId) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS class_students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                classId INTEGER NOT NULL,
                studentId INTEGER NOT NULL,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE CASCADE,
                FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
                UNIQUE(classId, studentId)
            );
        `);

        // Helper to add column if it does not already exist
        const addColumnIfNotExists = async (table: string, column: string, colDef: string) => {
            const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
            const exists = cols.some((c) => c.name === column);
            if (!exists) {
                await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${colDef}`);
            }
        };

        // 2. Add classId to students, attendance_sessions, grading_weights, assessments
        await addColumnIfNotExists("students", "classId", "INTEGER");
        await addColumnIfNotExists("attendance_sessions", "classId", "INTEGER");
        await addColumnIfNotExists("grading_weights", "classId", "INTEGER");
        await addColumnIfNotExists("assessments", "classId", "INTEGER");

        // 3. Migrate existing records for any teachers who already have data
        const teachers = await db.getAllAsync<{ id: number }>("SELECT id FROM users");
        for (const t of teachers) {
            // Check if teacher has existing students or sessions without classId
            const unassignedStudents = await db.getAllAsync<{ id: number }>(
                "SELECT id FROM students WHERE teacherId = ? AND (classId IS NULL OR classId = 0)",
                [t.id]
            );

            if (unassignedStudents.length > 0) {
                // Check if teacher already has any class
                let classRow = await db.getFirstAsync<{ id: number }>(
                    "SELECT id FROM classes WHERE teacherId = ? ORDER BY id ASC LIMIT 1",
                    [t.id]
                );

                if (!classRow) {
                    const result = await db.runAsync(
                        `INSERT INTO classes (teacherId, name, section, subject, color)
                         VALUES (?, 'My Class', 'Section 1', 'General', '#4F46E5')`,
                        [t.id]
                    );
                    classRow = { id: result.lastInsertRowId };
                }

                const defaultClassId = classRow.id;

                // Associate unassigned students
                await db.runAsync(
                    "UPDATE students SET classId = ? WHERE teacherId = ? AND (classId IS NULL OR classId = 0)",
                    [defaultClassId, t.id]
                );

                for (const st of unassignedStudents) {
                    await db.runAsync(
                        "INSERT OR IGNORE INTO class_students (classId, studentId) VALUES (?, ?)",
                        [defaultClassId, st.id]
                    );
                }

                // Associate unassigned attendance sessions
                await db.runAsync(
                    "UPDATE attendance_sessions SET classId = ? WHERE teacherId = ? AND (classId IS NULL OR classId = 0)",
                    [defaultClassId, t.id]
                );

                // Associate unassigned grading weights & assessments
                await db.runAsync(
                    "UPDATE grading_weights SET classId = ? WHERE teacherId = ? AND (classId IS NULL OR classId = 0)",
                    [defaultClassId, t.id]
                );
                await db.runAsync(
                    "UPDATE assessments SET classId = ? WHERE teacherId = ? AND (classId IS NULL OR classId = 0)",
                    [defaultClassId, t.id]
                );
            }
        }
    },
};

