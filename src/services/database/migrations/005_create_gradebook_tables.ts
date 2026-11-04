import type { Migration } from "../types";

export const createGradebookTables: Migration = {
    version: 5,
    name: "create_gradebook_tables",
    up: async (db) => {
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS grading_weights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacherId INTEGER NOT NULL,
                name TEXT NOT NULL,
                weight REAL NOT NULL,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (teacherId) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS assessments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacherId INTEGER NOT NULL,
                weightId INTEGER,
                title TEXT NOT NULL,
                maxScore REAL NOT NULL,
                date TEXT NOT NULL,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (teacherId) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (weightId) REFERENCES grading_weights(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS assessment_scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                assessmentId INTEGER NOT NULL,
                studentId INTEGER NOT NULL,
                score REAL NOT NULL,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (assessmentId) REFERENCES assessments(id) ON DELETE CASCADE,
                FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
                UNIQUE(assessmentId, studentId)
            );
        `);
    },
};

