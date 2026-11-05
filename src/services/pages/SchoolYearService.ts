import { getDatabase } from "../database/connection";
import { markSchoolYearAsCompleted } from "./AcademicHistoryPages";

export interface SchoolYearItem {
    id: number;
    teacherId: number;
    schoolYear: string;
    semester: string;
    quarterCount: number;
    status: "active" | "completed" | "pending";
    completedAt?: string | null;
    createdAt?: string;
    classCount?: number;
}

export interface SchoolYearAuditLog {
    id: number;
    teacherId: number;
    schoolYearId: number | null;
    schoolYear: string;
    action: string;
    performedBy: string;
    notes?: string | null;
    timestamp: string;
}

export interface StartNewSchoolYearInput {
    schoolYear: string;
    semester?: string;
    quarterCount?: number;
    archivePreviousIfActive?: boolean;
    copyGradingWeights?: boolean;
}

export interface CreateSchoolYearInput {
    schoolYear: string;
    semester?: string;
    quarterCount?: number;
    status?: "active" | "pending";
}

const DEFAULT_WEIGHTS = [
    { name: "Attendance", weight: 10 },
    { name: "Written Works", weight: 30 },
    { name: "Performance Tasks", weight: 40 },
    { name: "Quarterly Assessment", weight: 20 },
];

/**
 * Get active school year id and info for a teacher
 */
export async function getActiveSchoolYear(
    username: string
): Promise<{ id: number; schoolYear: string; semester: string; quarterCount: number } | null> {
    try {
        const db = await getDatabase();
        const teacher = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM users WHERE username = ?",
            [username.trim()]
        );
        if (!teacher) return null;

        // Check settings first
        const settings = await db.getFirstAsync<{
            current_school_year_id: number | null;
            academicYear: string;
            semester: string;
            quarterCount: number;
        }>("SELECT current_school_year_id, academicYear, semester, quarterCount FROM academic_settings WHERE teacherId = ?", [
            teacher.id,
        ]);

        if (settings?.current_school_year_id) {
            const yearRow = await db.getFirstAsync<SchoolYearItem>(
                "SELECT * FROM academic_years WHERE id = ?",
                [settings.current_school_year_id]
            );
            if (yearRow && yearRow.status === "active") {
                return {
                    id: yearRow.id,
                    schoolYear: yearRow.schoolYear,
                    semester: yearRow.semester,
                    quarterCount: yearRow.quarterCount,
                };
            }
        }

        // Fallback: look for active in academic_years
        const activeYear = await db.getFirstAsync<SchoolYearItem>(
            "SELECT * FROM academic_years WHERE teacherId = ? AND status = 'active' ORDER BY id DESC",
            [teacher.id]
        );

        if (activeYear) {
            return {
                id: activeYear.id,
                schoolYear: activeYear.schoolYear,
                semester: activeYear.semester,
                quarterCount: activeYear.quarterCount,
            };
        }

        return null;
    } catch (error) {
        console.error("Error getting active school year:", error);
        return null;
    }
}

/**
 * Get all school years registered for a teacher
 */
export async function getAllSchoolYears(username: string): Promise<SchoolYearItem[]> {
    try {
        const db = await getDatabase();
        const teacher = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM users WHERE username = ?",
            [username.trim()]
        );
        if (!teacher) return [];

        const years = await db.getAllAsync<SchoolYearItem>(
            `SELECT y.*, 
                (SELECT COUNT(*) FROM classes c WHERE c.school_year_id = y.id) as classCount
             FROM academic_years y
             WHERE y.teacherId = ?
             ORDER BY y.id DESC`,
            [teacher.id]
        );

        return years ?? [];
    } catch (error) {
        console.error("Error fetching school years:", error);
        return [];
    }
}

/**
 * Create a new planned/pending school year ahead of time
 */
export async function createSchoolYear(
    username: string,
    input: CreateSchoolYearInput
): Promise<{ success: boolean; message: string; schoolYearId?: number }> {
    const rawSchoolYear = input.schoolYear?.trim();
    if (!rawSchoolYear) {
        return { success: false, message: "School Year is required (e.g. 2025-2026)." };
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

        const existing = await db.getFirstAsync<SchoolYearItem>(
            "SELECT * FROM academic_years WHERE teacherId = ? AND schoolYear = ?",
            [teacher.id, rawSchoolYear]
        );

        if (existing) {
            return {
                success: false,
                message: `School Year ${rawSchoolYear} already exists with status: ${existing.status}.`,
            };
        }

        const semester = input.semester?.trim() || "1st Semester";
        const quarterCount = input.quarterCount === 3 ? 3 : 4;
        const status = input.status || "pending";

        const res = await db.runAsync(
            `INSERT INTO academic_years (teacherId, schoolYear, semester, quarterCount, status)
             VALUES (?, ?, ?, ?, ?)`,
            [teacher.id, rawSchoolYear, semester, quarterCount, status]
        );

        const newId = res.lastInsertRowId;

        // Log audit
        await db.runAsync(
            `INSERT INTO school_year_audit_logs (teacherId, schoolYearId, schoolYear, action, performedBy, notes)
             VALUES (?, ?, ?, 'CREATED', ?, 'Registered new school year')`,
            [teacher.id, newId, rawSchoolYear, username.trim()]
        );

        return {
            success: true,
            message: `School Year ${rawSchoolYear} created successfully.`,
            schoolYearId: newId,
        };
    } catch (error) {
        console.error("Error creating school year:", error);
        return { success: false, message: "Failed to create school year." };
    }
}

/**
 * Start a new school year:
 * - Validates that the school year is not already completed
 * - Preserves & archives the previous active school year's data if requested
 * - Ensures single active school year
 * - Activates the new school year in academic_years & academic_settings
 * - Initializes clean operational data associated with the new school_year_id
 * - Records audit log
 * - Executes strictly inside a database transaction with full rollback on error
 */
export async function startNewSchoolYear(
    username: string,
    input: StartNewSchoolYearInput
): Promise<{ success: boolean; message: string; schoolYearId?: number }> {
    const rawSchoolYear = input.schoolYear?.trim();
    if (!rawSchoolYear) {
        return { success: false, message: "School Year is required (e.g. 2025-2026)." };
    }

    const semester = input.semester?.trim() || "1st Semester";
    const quarterCount = input.quarterCount === 3 ? 3 : 4;
    const archivePreviousIfActive = input.archivePreviousIfActive ?? true;
    const copyGradingWeights = input.copyGradingWeights ?? true;

    try {
        const db = await getDatabase();
        const teacher = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM users WHERE username = ?",
            [username.trim()]
        );
        if (!teacher) {
            return { success: false, message: "Teacher account not found." };
        }
        const teacherId = teacher.id;

        // 1. Validation: check if the targeted school year already exists and if it was completed
        const existingTargetYear = await db.getFirstAsync<SchoolYearItem>(
            "SELECT * FROM academic_years WHERE teacherId = ? AND schoolYear = ?",
            [teacherId, rawSchoolYear]
        );

        if (existingTargetYear && existingTargetYear.status === "completed") {
            return {
                success: false,
                message: `Cannot start School Year ${rawSchoolYear} because it has already been marked as completed. Completed historical school years cannot be re-opened.`,
            };
        }

        if (existingTargetYear && existingTargetYear.status === "active") {
            return {
                success: false,
                message: `School Year ${rawSchoolYear} is already currently active.`,
            };
        }

        // 2. Fetch current active school year
        const currentActiveYear = await db.getFirstAsync<SchoolYearItem>(
            "SELECT * FROM academic_years WHERE teacherId = ? AND status = 'active'",
            [teacherId]
        );

        // 3. If previous year is active, archive it if requested
        if (currentActiveYear && archivePreviousIfActive && currentActiveYear.schoolYear !== rawSchoolYear) {
            const archiveRes = await markSchoolYearAsCompleted(username, currentActiveYear.schoolYear);
            if (!archiveRes.success) {
                return {
                    success: false,
                    message: `Failed to archive current school year ${currentActiveYear.schoolYear}: ${archiveRes.message}`,
                };
            }
        }

        let newSchoolYearId = 0;

        // 4. Execute transition strictly inside a database transaction
        await db.withTransactionAsync(async () => {
            // A. Deactivate all other school years for this teacher (ensure single active year)
            await db.runAsync(
                "UPDATE academic_years SET status = 'completed' WHERE teacherId = ? AND status = 'active'",
                [teacherId]
            );

            // B. Create or activate the targeted school year
            if (existingTargetYear) {
                await db.runAsync(
                    `UPDATE academic_years 
                     SET status = 'active', semester = ?, quarterCount = ?
                     WHERE id = ?`,
                    [semester, quarterCount, existingTargetYear.id]
                );
                newSchoolYearId = existingTargetYear.id;
            } else {
                const insertRes = await db.runAsync(
                    `INSERT INTO academic_years (teacherId, schoolYear, semester, quarterCount, status)
                     VALUES (?, ?, ?, ?, 'active')`,
                    [teacherId, rawSchoolYear, semester, quarterCount]
                );
                newSchoolYearId = insertRes.lastInsertRowId;
            }

            // C. Update academic_settings to point to the new active school year
            await db.runAsync(
                `INSERT INTO academic_settings (
                    teacherId, academicYear, activeQuarter, semester, quarterCount, status, current_school_year_id, updatedAt
                 ) VALUES (?, ?, 'Q1', ?, ?, 'active', ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(teacherId) DO UPDATE SET
                     academicYear = excluded.academicYear,
                     activeQuarter = 'Q1',
                     semester = excluded.semester,
                     quarterCount = excluded.quarterCount,
                     status = 'active',
                     current_school_year_id = excluded.current_school_year_id,
                     updatedAt = CURRENT_TIMESTAMP`,
                [teacherId, rawSchoolYear, semester, quarterCount, newSchoolYearId]
            );

            // D. Initialize default grading weights for the new school year if requested
            if (copyGradingWeights) {
                for (const w of DEFAULT_WEIGHTS) {
                    await db.runAsync(
                        `INSERT INTO grading_weights (teacherId, name, weight, classId, school_year_id)
                         VALUES (?, ?, ?, NULL, ?)`,
                        [teacherId, w.name, w.weight, newSchoolYearId]
                    );
                }
            }

            // E. Record audit log
            await db.runAsync(
                `INSERT INTO school_year_audit_logs (teacherId, schoolYearId, schoolYear, action, performedBy, notes)
                 VALUES (?, ?, ?, 'ACTIVATED', ?, ?)`,
                [
                    teacherId,
                    newSchoolYearId,
                    rawSchoolYear,
                    username.trim(),
                    `Activated new School Year ${rawSchoolYear} (${semester}, ${quarterCount} Quarters)`,
                ]
            );
        });

        return {
            success: true,
            message: `School Year ${rawSchoolYear} has been successfully activated! Operational records for classes, attendance, and gradebook are now cleanly initialized.`,
            schoolYearId: newSchoolYearId,
        };
    } catch (error) {
        console.error("Error starting new school year:", error);
        return {
            success: false,
            message: "Transaction failed while starting the new school year. All changes were rolled back.",
        };
    }
}

/**
 * Get audit logs for a teacher's school year activations & completions
 */
export async function getSchoolYearAuditLogs(username: string): Promise<SchoolYearAuditLog[]> {
    try {
        const db = await getDatabase();
        const teacher = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM users WHERE username = ?",
            [username.trim()]
        );
        if (!teacher) return [];

        const logs = await db.getAllAsync<SchoolYearAuditLog>(
            "SELECT * FROM school_year_audit_logs WHERE teacherId = ? ORDER BY id DESC",
            [teacher.id]
        );

        return logs ?? [];
    } catch (error) {
        console.error("Error fetching school year audit logs:", error);
        return [];
    }
}

