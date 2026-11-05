import { getDatabase } from "../database/connection";
import type { Student } from "../../types/student";
import type { AttendanceSession, AttendanceRecord } from "../../types/attendance";
import { getActiveSchoolYear } from "./SchoolYearService";

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
    classId?: number | null,
    quarter?: string | null
): Promise<{ success: boolean; message: string; sessionId?: number }> {
    if (!date.trim()) {
        return { success: false, message: "Date is required." };
    }

    if (!classId || classId <= 0) {
        return { success: false, message: "A valid class must be selected to create an attendance session." };
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

        // Validate that class exists and belongs to this teacher
        const classRecord = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM classes WHERE id = ? AND teacherId = ?",
            [classId, teacher.id]
        );

        if (!classRecord) {
            return { success: false, message: "Selected class does not exist or does not belong to your account." };
        }

        const settings = await db.getFirstAsync<{ status: string }>(
            "SELECT status FROM academic_settings WHERE teacherId = ?",
            [teacher.id]
        );
        if (settings?.status === "completed") {
            return {
                success: false,
                message: "Current school year is marked as completed. Please start a new school year in Settings before creating attendance sessions.",
            };
        }

        const sessionTitle = title?.trim() ? title.trim() : null;
        const sessionQuarter = quarter?.trim() ? quarter.trim() : "Q1";
        const activeYear = await getActiveSchoolYear(username);
        const schoolYearId = activeYear?.id ?? null;

        const insertResult = await db.runAsync(
            "INSERT INTO attendance_sessions (date, title, teacherId, classId, quarter, school_year_id) VALUES (?, ?, ?, ?, ?, ?)",
            [date.trim(), sessionTitle, teacher.id, classId, sessionQuarter, schoolYearId]
        );

        const newSessionId = insertResult.lastInsertRowId;

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

        const settings = await db.getFirstAsync<{ status: string }>(
            "SELECT status FROM academic_settings WHERE teacherId = ?",
            [teacher.id]
        );

        // When school year is marked completed, the operational attendance sheet is cleanly reset
        if (settings?.status === "completed") {
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

        const activeYear = await getActiveSchoolYear(username);

        const sessions = classId
            ? activeYear
                ? await db.getAllAsync<AttendanceSession>(
                      `SELECT * FROM attendance_sessions 
                       WHERE teacherId = ? AND classId = ? AND (school_year_id = ? OR school_year_id IS NULL)
                       ORDER BY date DESC, id DESC`,
                      [teacher.id, classId, activeYear.id]
                  )
                : await db.getAllAsync<AttendanceSession>(
                      `SELECT * FROM attendance_sessions 
                       WHERE teacherId = ? AND classId = ? 
                       ORDER BY date DESC, id DESC`,
                      [teacher.id, classId]
                  )
            : activeYear
            ? await db.getAllAsync<AttendanceSession>(
                  `SELECT * FROM attendance_sessions 
                   WHERE teacherId = ? AND (school_year_id = ? OR school_year_id IS NULL)
                   ORDER BY date DESC, id DESC`,
                  [teacher.id, activeYear.id]
              )
            : await db.getAllAsync<AttendanceSession>(
                  "SELECT * FROM attendance_sessions WHERE teacherId = ? ORDER BY date DESC, id DESC",
                  [teacher.id]
              );

        const records = classId
            ? await db.getAllAsync<AttendanceRecord>(
                  `SELECT ar.* FROM attendance_records ar
                   JOIN attendance_sessions s ON ar.sessionId = s.id
                   WHERE s.teacherId = ? AND s.classId = ?`,
                  [teacher.id, classId]
              )
            : await db.getAllAsync<AttendanceRecord>(
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

export async function updateAttendanceSession(
    sessionId: number,
    date: string,
    title?: string,
    quarter?: string
): Promise<{ success: boolean; message: string }> {
    if (!date?.trim()) {
        return { success: false, message: "Date is required." };
    }

    try {
        const db = await getDatabase();
        const sessionTitle = title?.trim() ? title.trim() : null;
        const sessionQuarter = quarter?.trim() ? quarter.trim() : "Q1";

        await db.runAsync(
            "UPDATE attendance_sessions SET date = ?, title = ?, quarter = ? WHERE id = ?",
            [date.trim(), sessionTitle, sessionQuarter, sessionId]
        );

        return { success: true, message: "Attendance session updated successfully." };
    } catch (error) {
        console.error("Error updating attendance session:", error);
        return { success: false, message: "Failed to update attendance session." };
    }
}

export async function deleteAttendanceSession(
    sessionId: number
): Promise<{ success: boolean; message: string }> {
    try {
        const db = await getDatabase();

        await db.withTransactionAsync(async () => {
            await db.runAsync("DELETE FROM attendance_records WHERE sessionId = ?", [sessionId]);
            await db.runAsync("DELETE FROM attendance_sessions WHERE id = ?", [sessionId]);
        });

        return { success: true, message: "Attendance session deleted successfully." };
    } catch (error) {
        console.error("Error deleting attendance session:", error);
        return { success: false, message: "Failed to delete attendance session." };
    }
}

export async function deleteAttendanceRecord(
    sessionId: number,
    studentId: number
): Promise<boolean> {
    try {
        const db = await getDatabase();
        await db.runAsync(
            "DELETE FROM attendance_records WHERE sessionId = ? AND studentId = ?",
            [sessionId, studentId]
        );
        return true;
    } catch (error) {
        console.error("Error deleting attendance record:", error);
        return false;
    }
}

export async function saveAllAttendanceRecords(
    records: { sessionId: number; studentId: number; status: "1" | "0" }[],
    deletedKeys?: { sessionId: number; studentId: number }[]
): Promise<boolean> {
    if (records.length === 0 && (!deletedKeys || deletedKeys.length === 0)) return true;

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

            if (deletedKeys && deletedKeys.length > 0) {
                for (const d of deletedKeys) {
                    await db.runAsync(
                        "DELETE FROM attendance_records WHERE sessionId = ? AND studentId = ?",
                        [d.sessionId, d.studentId]
                    );
                }
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
