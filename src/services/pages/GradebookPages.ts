import { getDatabase } from "../database/connection";
import type { Student } from "../../types/student";
import type {
    GradingWeight,
    Assessment,
    CreateAssessmentInput,
    UpdateAssessmentInput,
    GradebookSpreadsheetData,
} from "../../types/gradebook";
import { getActiveSchoolYear } from "./SchoolYearService";

const DEFAULT_WEIGHTS = [
    { name: "Attendance", weight: 10 },
    { name: "Written Works", weight: 30 },
    { name: "Performance Tasks", weight: 40 },
    { name: "Quarterly Assessment", weight: 20 },
];

export async function getGradingWeights(
    username: string,
    classId?: number | null
): Promise<GradingWeight[]> {
    try {
        const db = await getDatabase();
        const teacher = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM users WHERE username = ?",
            [username.trim()]
        );

        if (!teacher) return [];

        const activeYear = await getActiveSchoolYear(username);
        const schoolYearId = activeYear?.id ?? null;

        let weights = classId
            ? await db.getAllAsync<GradingWeight>(
                  `SELECT * FROM grading_weights 
                   WHERE teacherId = ? AND (classId = ? OR classId IS NULL) 
                     AND (school_year_id = ? OR school_year_id IS NULL)
                   ORDER BY id ASC`,
                  [teacher.id, classId, schoolYearId]
              )
            : await db.getAllAsync<GradingWeight>(
                  `SELECT * FROM grading_weights 
                   WHERE teacherId = ? AND (school_year_id = ? OR school_year_id IS NULL) 
                   ORDER BY id ASC`,
                  [teacher.id, schoolYearId]
              );

        // Auto-seed default weights if none exist yet for this teacher and school year
        if (!weights || weights.length === 0) {
            await db.withTransactionAsync(async () => {
                for (const w of DEFAULT_WEIGHTS) {
                    await db.runAsync(
                        "INSERT INTO grading_weights (teacherId, name, weight, classId, school_year_id) VALUES (?, ?, ?, ?, ?)",
                        [teacher.id, w.name, w.weight, classId ?? null, schoolYearId]
                    );
                }
            });

            weights = classId
                ? await db.getAllAsync<GradingWeight>(
                      `SELECT * FROM grading_weights 
                       WHERE teacherId = ? AND (classId = ? OR classId IS NULL) 
                         AND (school_year_id = ? OR school_year_id IS NULL)
                       ORDER BY id ASC`,
                      [teacher.id, classId, schoolYearId]
                  )
                : await db.getAllAsync<GradingWeight>(
                      `SELECT * FROM grading_weights 
                       WHERE teacherId = ? AND (school_year_id = ? OR school_year_id IS NULL) 
                       ORDER BY id ASC`,
                      [teacher.id, schoolYearId]
                  );
        }

        return weights ?? [];
    } catch (error) {
        console.error("Error fetching grading weights:", error);
        return [];
    }
}

export async function createGradingWeight(
    username: string,
    name: string,
    weight: number,
    classId?: number | null
): Promise<{ success: boolean; message: string; weightId?: number }> {
    if (!name.trim()) {
        return { success: false, message: "Weight category name is required." };
    }
    if (isNaN(weight) || weight <= 0) {
        return { success: false, message: "Weight percentage must be greater than 0." };
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

        const activeYear = await getActiveSchoolYear(username);
        const schoolYearId = activeYear?.id ?? null;

        const result = await db.runAsync(
            "INSERT INTO grading_weights (teacherId, name, weight, classId, school_year_id) VALUES (?, ?, ?, ?, ?)",
            [teacher.id, name.trim(), weight, classId ?? null, schoolYearId]
        );

        return {
            success: true,
            message: "Grading weight created successfully!",
            weightId: result.lastInsertRowId,
        };
    } catch (error) {
        console.error("Error creating grading weight:", error);
        return { success: false, message: "Failed to create grading weight." };
    }
}

export async function deleteGradingWeight(
    weightId: number
): Promise<{ success: boolean; message: string }> {
    try {
        const db = await getDatabase();
        await db.runAsync("DELETE FROM grading_weights WHERE id = ?", [weightId]);
        return { success: true, message: "Grading weight deleted successfully." };
    } catch (error) {
        console.error("Error deleting grading weight:", error);
        return { success: false, message: "Failed to delete grading weight." };
    }
}

export async function createAssessment(
    username: string,
    input: CreateAssessmentInput
): Promise<{ success: boolean; message: string; assessmentId?: number }> {
    if (!input.title.trim()) {
        return { success: false, message: "Assessment title is required." };
    }
    if (isNaN(input.maxScore) || input.maxScore <= 0) {
        return { success: false, message: "Max score must be greater than 0." };
    }
    if (!input.date.trim()) {
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

        const quarter = input.quarter?.trim() || "Q1";
        const activeYear = await getActiveSchoolYear(username);
        const schoolYearId = input.school_year_id ?? activeYear?.id ?? null;

        const result = await db.runAsync(
            `INSERT INTO assessments (teacherId, weightId, title, maxScore, date, classId, quarter, school_year_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                teacher.id,
                input.weightId ?? null,
                input.title.trim(),
                input.maxScore,
                input.date.trim(),
                input.classId ?? null,
                quarter,
                schoolYearId,
            ]
        );

        return {
            success: true,
            message: "Assessment created successfully!",
            assessmentId: result.lastInsertRowId,
        };
    } catch (error) {
        console.error("Error creating assessment:", error);
        return { success: false, message: "Failed to create assessment." };
    }
}

export async function updateAssessment(
    input: UpdateAssessmentInput
): Promise<{ success: boolean; message: string }> {
    if (!input.title.trim()) {
        return { success: false, message: "Assessment title is required." };
    }
    if (isNaN(input.maxScore) || input.maxScore <= 0) {
        return { success: false, message: "Max score must be greater than 0." };
    }
    if (!input.date.trim()) {
        return { success: false, message: "Date is required." };
    }

    try {
        const db = await getDatabase();
        const quarter = input.quarter?.trim() || "Q1";
        await db.runAsync(
            `UPDATE assessments
             SET title = ?, maxScore = ?, date = ?, weightId = ?, quarter = ?
             WHERE id = ?`,
            [
                input.title.trim(),
                input.maxScore,
                input.date.trim(),
                input.weightId ?? null,
                quarter,
                input.id,
            ]
        );

        return { success: true, message: "Assessment updated successfully!" };
    } catch (error) {
        console.error("Error updating assessment:", error);
        return { success: false, message: "Failed to update assessment." };
    }
}

export async function deleteAssessment(
    assessmentId: number
): Promise<{ success: boolean; message: string }> {
    try {
        const db = await getDatabase();
        await db.runAsync("DELETE FROM assessments WHERE id = ?", [assessmentId]);
        return { success: true, message: "Assessment deleted successfully!" };
    } catch (error) {
        console.error("Error deleting assessment:", error);
        return { success: false, message: "Failed to delete assessment." };
    }
}

export async function getGradebookSpreadsheet(
    username: string,
    classId?: number | null
): Promise<GradebookSpreadsheetData> {
    try {
        const db = await getDatabase();
        const teacher = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM users WHERE username = ?",
            [username.trim()]
        );

        if (!teacher) {
            return { students: [], weights: [], assessments: [], scoresMap: {}, attendanceMap: {} };
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

        const weights = await getGradingWeights(username, classId);
        const activeYear = await getActiveSchoolYear(username);
        const schoolYearId = activeYear?.id ?? null;

        const assessmentsRaw = classId
            ? await db.getAllAsync<{
                  id: number;
                  teacherId: number;
                  weightId: number | null;
                  weightName: string | null;
                  weightPercent: number | null;
                  title: string;
                  maxScore: number;
                  date: string;
                  createdAt: string;
              }>(
                  `SELECT a.*, w.name as weightName, w.weight as weightPercent
                   FROM assessments a
                   LEFT JOIN grading_weights w ON a.weightId = w.id
                   WHERE a.teacherId = ? AND (a.classId = ? OR a.classId IS NULL)
                     AND (a.school_year_id = ? OR a.school_year_id IS NULL)
                   ORDER BY a.date DESC, a.id DESC`,
                  [teacher.id, classId, schoolYearId]
              )
            : await db.getAllAsync<{
                  id: number;
                  teacherId: number;
                  weightId: number | null;
                  weightName: string | null;
                  weightPercent: number | null;
                  title: string;
                  maxScore: number;
                  date: string;
                  createdAt: string;
              }>(
                  `SELECT a.*, w.name as weightName, w.weight as weightPercent
                   FROM assessments a
                   LEFT JOIN grading_weights w ON a.weightId = w.id
                   WHERE a.teacherId = ?
                     AND (a.school_year_id = ? OR a.school_year_id IS NULL)
                   ORDER BY a.date DESC, a.id DESC`,
                  [teacher.id, schoolYearId]
              );

        const assessments: Assessment[] = (assessmentsRaw ?? []).map((row) => ({
            id: row.id,
            teacherId: row.teacherId,
            weightId: row.weightId,
            weightName: row.weightName ?? undefined,
            weightPercent: row.weightPercent ?? undefined,
            title: row.title,
            maxScore: row.maxScore,
            date: row.date,
            quarter: (row as { quarter?: string | null }).quarter ?? "Q1",
            createdAt: row.createdAt,
        }));

        const scores = await db.getAllAsync<{
            assessmentId: number;
            studentId: number;
            score: number;
        }>(
            `SELECT s.assessmentId, s.studentId, s.score
             FROM assessment_scores s
             JOIN assessments a ON s.assessmentId = a.id
             WHERE a.teacherId = ?`,
            [teacher.id]
        );

        const scoresMap: Record<string, string> = {};
        for (const s of scores) {
            scoresMap[`${s.studentId}_${s.assessmentId}`] = String(s.score);
        }

        // Fetch total attendance sessions for teacher & class (strictly guarded to classId & school_year_id)
        const totalSessionsResult = classId
            ? await db.getFirstAsync<{ count: number }>(
                  "SELECT COUNT(*) as count FROM attendance_sessions WHERE teacherId = ? AND classId = ? AND (school_year_id = ? OR school_year_id IS NULL)",
                  [teacher.id, classId, schoolYearId]
              )
            : await db.getFirstAsync<{ count: number }>(
                  "SELECT COUNT(*) as count FROM attendance_sessions WHERE teacherId = ? AND (school_year_id = ? OR school_year_id IS NULL)",
                  [teacher.id, schoolYearId]
              );
        const totalAttendanceSessions = totalSessionsResult?.count ?? 0;

        // Fetch present count per student (strictly guarded to classId & school_year_id)
        const attendanceRows = classId
            ? await db.getAllAsync<{
                  studentId: number;
                  presentCount: number;
              }>(
                  `SELECT ar.studentId, COUNT(*) as presentCount
                   FROM attendance_records ar
                   JOIN attendance_sessions s ON ar.sessionId = s.id
                   WHERE s.teacherId = ? AND s.classId = ? 
                     AND (s.school_year_id = ? OR s.school_year_id IS NULL)
                     AND (ar.status = '1' OR ar.status = 'present')
                   GROUP BY ar.studentId`,
                  [teacher.id, classId, schoolYearId]
              )
            : await db.getAllAsync<{
                  studentId: number;
                  presentCount: number;
              }>(
                  `SELECT ar.studentId, COUNT(*) as presentCount
                   FROM attendance_records ar
                   JOIN attendance_sessions s ON ar.sessionId = s.id
                   WHERE s.teacherId = ? 
                     AND (s.school_year_id = ? OR s.school_year_id IS NULL)
                     AND (ar.status = '1' OR ar.status = 'present')
                   GROUP BY ar.studentId`,
                  [teacher.id, schoolYearId]
              );

        const attendanceMap: Record<number, { present: number; total: number; percentage: number }> = {};
        for (const s of students) {
            const row = (attendanceRows || []).find((r) => r.studentId === s.id);
            const present = row?.presentCount ?? 0;
            const percentage = totalAttendanceSessions > 0
                ? Math.round((present / totalAttendanceSessions) * 1000) / 10
                : 100;
            attendanceMap[s.id] = {
                present,
                total: totalAttendanceSessions,
                percentage,
            };
        }

        return {
            students: students ?? [],
            weights: weights ?? [],
            assessments,
            scoresMap,
            attendanceMap,
        };
    } catch (error) {
        console.error("Error fetching gradebook spreadsheet:", error);
        return { students: [], weights: [], assessments: [], scoresMap: {}, attendanceMap: {} };
    }
}

export async function saveAllAssessmentScores(
    records: { assessmentId: number; studentId: number; score: number }[]
): Promise<boolean> {
    if (records.length === 0) return true;

    try {
        const db = await getDatabase();

        await db.withTransactionAsync(async () => {
            for (const r of records) {
                await db.runAsync(
                    `INSERT INTO assessment_scores (assessmentId, studentId, score, updatedAt)
                     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                     ON CONFLICT(assessmentId, studentId) DO UPDATE SET
                         score = excluded.score,
                         updatedAt = CURRENT_TIMESTAMP`,
                    [r.assessmentId, r.studentId, r.score]
                );
            }
        });

        return true;
    } catch (error) {
        console.error("Error saving assessment scores:", error);
        return false;
    }
}

