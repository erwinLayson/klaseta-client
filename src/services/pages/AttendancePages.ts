import { getDatabase } from "../database/connection";
import type { Student } from "../../types/student";
import type { AttendanceSession, AttendanceRecord } from "../../types/attendance";

export interface AttendanceSpreadsheet {
    students: Student[];
    sessions: AttendanceSession[];
    recordsMap: Record<string, "1" | "0">;
}

export function normalizeAttendanceValue(value: string | null | undefined): "1" | "0" {
    if (!value) return "1";
    const trimmed = String(value).trim();
    if (trimmed === "0" || trimmed.toLowerCase() === "absent") {
        return "0";
    }
    return "1";
}

export async function createAttendanceSession(
    username: string,
    date: string,
    title?: string,
    classId?: number | null
): Promise<{ success: boolean; message: string; sessionId?: number }> {
    if (!date.trim()) {
        return { success: false, message: "Date is required." };
    }

    try {
        const db = await getDatabase();

        const teacher = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM users WHERE username = ?",
            [username.trim()]
        );

        if (!teacher) {
            return { success: false, message: "Teacher account not found." };
        }

        const sessionTitle = title?.trim() ? title.trim() : null;

        let newSessionId: number = 0;

        await db.withTransactionAsync(async () => {
            const insertResult = await db.runAsync(
                "INSERT INTO attendance_sessions (date, title, teacherId, classId) VALUES (?, ?, ?, ?)",
                [date.trim(), sessionTitle, teacher.id, classId ?? null]
            );

            newSessionId = insertResult.lastInsertRowId;

            // Fetch students to pre-populate:
            // If classId is specified, fetch students enrolled in this class; otherwise all teacher students
            const students = classId
                ? await db.getAllAsync<{ id: number }>(
                      `SELECT s.id FROM students s
                       JOIN class_students cs ON cs.studentId = s.id
                       WHERE cs.classId = ?`,
                      [classId]
                  )
                : await db.getAllAsync<{ id: number }>(
                      "SELECT id FROM students WHERE teacherId = ?",
                      [teacher.id]
                  );

            // Pre-populate each student as "1" (present) by default
            for (const student of students) {
                await db.runAsync(
                    "INSERT INTO attendance_records (sessionId, studentId, status) VALUES (?, ?, '1')",
                    [newSessionId, student.id]
                );
            }
        });

        return {
            success: true,
            message: "Attendance session created successfully!",
            sessionId: newSessionId,
        };
    } catch (error) {
        console.error("Error creating attendance session:", error);
        return { success: false, message: "Failed to create attendance session." };
    }
}

export async function getAttendanceSpreadsheet(
    username: string,
    classId?: number | null
): Promise<AttendanceSpreadsheet> {
    try {
        const db = await getDatabase();

        const teacher = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM users WHERE username = ?",
            [username.trim()]
        );

        if (!teacher) {
            return { students: [], sessions: [], recordsMap: {} };
        }

        const students = classId
            ? await db.getAllAsync<Student>(
                  `SELECT s.* FROM students s
                   JOIN class_students cs ON cs.studentId = s.id
                   WHERE cs.classId = ?
                   ORDER BY s.lastname ASC, s.firstname ASC`,
                  [classId]
              )
            : await db.getAllAsync<Student>(
                  "SELECT * FROM students WHERE teacherId = ? ORDER BY lastname ASC, firstname ASC",
                  [teacher.id]
              );

        const sessions = classId
            ? await db.getAllAsync<AttendanceSession>(
                  `SELECT * FROM attendance_sessions 
                   WHERE teacherId = ? AND (classId = ? OR classId IS NULL) 
                   ORDER BY date DESC, id DESC`,
                  [teacher.id, classId]
              )
            : await db.getAllAsync<AttendanceSession>(
                  "SELECT * FROM attendance_sessions WHERE teacherId = ? ORDER BY date DESC, id DESC",
                  [teacher.id]
              );

        const records = await db.getAllAsync<AttendanceRecord>(
            `SELECT ar.* FROM attendance_records ar
             JOIN attendance_sessions s ON ar.sessionId = s.id
             WHERE s.teacherId = ?`,
            [teacher.id]
        );

        const recordsMap: Record<string, "1" | "0"> = {};
        for (const r of records) {
            recordsMap[`${r.studentId}_${r.sessionId}`] = normalizeAttendanceValue(r.status);
        }

        return {
            students: students ?? [],
            sessions: sessions ?? [],
            recordsMap,
        };
    } catch (error) {
        console.error("Error loading attendance spreadsheet:", error);
        return { students: [], sessions: [], recordsMap: {} };
    }
}

export async function saveAllAttendanceRecords(
    records: { sessionId: number; studentId: number; status: "1" | "0" }[]
): Promise<boolean> {
    if (records.length === 0) return true;

    try {
        const db = await getDatabase();

        await db.withTransactionAsync(async () => {
            for (const r of records) {
                await db.runAsync(
                    `INSERT INTO attendance_records (sessionId, studentId, status)
                     VALUES (?, ?, ?)
                     ON CONFLICT(sessionId, studentId) DO UPDATE SET status = excluded.status`,
                    [r.sessionId, r.studentId, r.status]
                );
            }
        });

        return true;
    } catch (error) {
        console.error("Error saving all attendance records:", error);
        return false;
    }
}

export async function updateAttendanceRecord(
    sessionId: number,
    studentId: number,
    status: "1" | "0"
): Promise<boolean> {
    try {
        const db = await getDatabase();

        await db.runAsync(
            `INSERT INTO attendance_records (sessionId, studentId, status)
             VALUES (?, ?, ?)
             ON CONFLICT(sessionId, studentId) DO UPDATE SET status = excluded.status`,
            [sessionId, studentId, status]
        );

        return true;
    } catch (error) {
        console.error("Error updating attendance record:", error);
        return false;
    }
}
