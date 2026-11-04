import type { Migration } from "../types";

export const addAttendanceClassGuard: Migration = {
    version: 7,
    name: "add_attendance_class_guard",
    up: async (db) => {
        // 1. Repair and clean up any unassigned or orphaned attendance sessions
        const teachers = await db.getAllAsync<{ id: number }>("SELECT id FROM users");

        for (const t of teachers) {
            // Find sessions without a valid class
            const unassignedSessions = await db.getAllAsync<{ id: number }>(
                `SELECT s.id FROM attendance_sessions s
                 WHERE s.teacherId = ? AND (
                     s.classId IS NULL 
                     OR s.classId <= 0 
                     OR s.classId NOT IN (SELECT id FROM classes WHERE teacherId = ?)
                 )`,
                [t.id, t.id]
            );

            if (unassignedSessions.length > 0) {
                // Ensure teacher has a default class
                let classRow = await db.getFirstAsync<{ id: number }>(
                    "SELECT id FROM classes WHERE teacherId = ? ORDER BY id ASC LIMIT 1",
                    [t.id]
                );

                if (!classRow) {
                    const res = await db.runAsync(
                        `INSERT INTO classes (teacherId, name, section, subject, color)
                         VALUES (?, 'My Class', 'Section 1', 'General', '#4F46E5')`,
                        [t.id]
                    );
                    classRow = { id: res.lastInsertRowId };
                }

                const targetClassId = classRow.id;

                for (const session of unassignedSessions) {
                    await db.runAsync(
                        "UPDATE attendance_sessions SET classId = ? WHERE id = ?",
                        [targetClassId, session.id]
                    );
                }
            }
        }

        // 2. Ensure all students referenced in attendance_records are enrolled in the session's class
        await db.runAsync(`
            INSERT OR IGNORE INTO class_students (classId, studentId)
            SELECT DISTINCT s.classId, ar.studentId
            FROM attendance_records ar
            JOIN attendance_sessions s ON ar.sessionId = s.id
            WHERE s.classId IS NOT NULL AND s.classId > 0;
        `);

        // 3. Create indices for strict class-based attendance performance and integrity
        await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_teacher 
            ON attendance_sessions(classId, teacherId);

            CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_date 
            ON attendance_sessions(classId, date);

            CREATE INDEX IF NOT EXISTS idx_attendance_records_session_student 
            ON attendance_records(sessionId, studentId);
        `);

        // 4. Guards (Triggers) to ensure class integrity on attendance_sessions and attendance_records
        // Trigger: Guard session insert
        await db.execAsync(`
            CREATE TRIGGER IF NOT EXISTS guard_attendance_sessions_class_insert
            BEFORE INSERT ON attendance_sessions
            FOR EACH ROW
            BEGIN
                SELECT CASE
                    WHEN NEW.classId IS NULL OR NEW.classId <= 0
                    THEN RAISE(ABORT, 'Guard violation: attendance session must have a valid classId')
                    WHEN (SELECT id FROM classes WHERE id = NEW.classId AND teacherId = NEW.teacherId) IS NULL
                    THEN RAISE(ABORT, 'Guard violation: classId does not belong to the session teacher')
                END;
            END;
        `);

        // Trigger: Guard session update
        await db.execAsync(`
            CREATE TRIGGER IF NOT EXISTS guard_attendance_sessions_class_update
            BEFORE UPDATE OF classId, teacherId ON attendance_sessions
            FOR EACH ROW
            BEGIN
                SELECT CASE
                    WHEN NEW.classId IS NULL OR NEW.classId <= 0
                    THEN RAISE(ABORT, 'Guard violation: attendance session must have a valid classId')
                    WHEN (SELECT id FROM classes WHERE id = NEW.classId AND teacherId = NEW.teacherId) IS NULL
                    THEN RAISE(ABORT, 'Guard violation: classId does not belong to the session teacher')
                END;
            END;
        `);

        // Trigger: Guard attendance records student enrollment in session's class
        await db.execAsync(`
            CREATE TRIGGER IF NOT EXISTS guard_attendance_records_student_class_insert
            BEFORE INSERT ON attendance_records
            FOR EACH ROW
            BEGIN
                SELECT CASE
                    WHEN (
                        SELECT cs.id FROM class_students cs
                        JOIN attendance_sessions s ON s.id = NEW.sessionId
                        WHERE cs.classId = s.classId AND cs.studentId = NEW.studentId
                    ) IS NULL
                    THEN RAISE(ABORT, 'Guard violation: student is not enrolled in the class of this attendance session')
                END;
            END;
        `);

        // Trigger: Cascade delete sessions when a class is deleted
        await db.execAsync(`
            CREATE TRIGGER IF NOT EXISTS guard_attendance_sessions_class_delete
            AFTER DELETE ON classes
            FOR EACH ROW
            BEGIN
                DELETE FROM attendance_sessions WHERE classId = OLD.id;
            END;
        `);
    },
};

