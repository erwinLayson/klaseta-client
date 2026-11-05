import { getDatabase } from "../database/connection";
import { calculateStudentGrade } from "../../utils/gradeCalculator";
import type { Assessment, GradingWeight } from "../../types/gradebook";
import type { Student } from "../../types/student";

export interface AcademicYearInfo {
    id: number;
    schoolYear: string;
    semester: string;
    quarterCount: number;
    status: "active" | "completed";
    completedAt?: string | null;
    createdAt?: string;
    classCount: number;
    totalStudents: number;
    overallAverageGrade?: number | null;
    overallPassingRate?: number | null;
}

export interface AcademicRecordItem {
    id: number;
    teacherId: number;
    academicYearId?: number | null;
    schoolYear: string;
    classId?: number | null;
    className: string;
    section?: string | null;
    subject?: string | null;
    studentCount: number;
    passedCount: number;
    failedCount: number;
    averageGrade?: number | null;
    averageAttendance?: number | null;
    status: string; // 'completed'
    notes?: string | null;
    createdAt?: string;
}

export interface AcademicStudentRecordItem {
    id: number;
    recordId: number;
    studentId?: number | null;
    studentName: string;
    lrn?: string | null;
    gender?: string | null;
    finalGrade: number | null;
    letterGrade?: string | null;
    remarks: string; // "Passed" | "Failed"
    attendanceRate: number | null;
    quarterGrades: Record<string, number | null>;
    breakdown: {
        weightName: string;
        weightPercent: number;
        percentage: number;
        totalScore: number;
        totalMaxScore: number;
    }[];
    createdAt?: string;
}

export interface AcademicRecordDetails extends AcademicRecordItem {
    students: AcademicStudentRecordItem[];
}

export interface AcademicHistoryData {
    schoolYears: AcademicYearInfo[];
    records: AcademicRecordItem[];
    stats: {
        totalYearsArchived: number;
        totalClassesArchived: number;
        totalStudentsRecorded: number;
        overallAverageGrade: number | null;
        overallPassingRate: number | null;
    };
    currentActiveYear: string;
}

/**
 * Fetch all academic history records and school years for the teacher
 */
export async function getAcademicHistory(username: string): Promise<AcademicHistoryData | null> {
    try {
        const db = await getDatabase();
        const teacher = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM users WHERE username = ?",
            [username.trim()]
        );

        if (!teacher) return null;
        const teacherId = teacher.id;

        // Current active academic year from settings
        const settings = await db.getFirstAsync<{ academicYear: string; status: string }>(
            "SELECT academicYear, status FROM academic_settings WHERE teacherId = ?",
            [teacherId]
        );
        const currentActiveYear = settings?.academicYear || "2024-2025";

        // 1. Fetch all academic records
        const records = await db.getAllAsync<AcademicRecordItem>(
            `SELECT * FROM academic_records
             WHERE teacherId = ?
             ORDER BY schoolYear DESC, id DESC`,
            [teacherId]
        );

        // 2. Fetch all school years from academic_years
        const rawYears = await db.getAllAsync<{
            id: number;
            schoolYear: string;
            semester: string;
            quarterCount: number;
            status: "active" | "completed";
            completedAt: string | null;
            createdAt: string;
        }>(
            `SELECT * FROM academic_years
             WHERE teacherId = ?
             ORDER BY schoolYear DESC, id DESC`,
            [teacherId]
        );

        // Combine school years with summary stats from their records
        const schoolYears: AcademicYearInfo[] = [];
        const seenYears = new Set<string>();

        for (const y of rawYears) {
            seenYears.add(y.schoolYear);
            const yearRecords = records.filter((r) => r.schoolYear === y.schoolYear);
            const classCount = yearRecords.length;
            const totalStudents = yearRecords.reduce((sum, r) => sum + (r.studentCount || 0), 0);
            const totalPassed = yearRecords.reduce((sum, r) => sum + (r.passedCount || 0), 0);

            const gradesSum = yearRecords
                .filter((r) => r.averageGrade !== null && r.averageGrade !== undefined)
                .reduce((sum, r) => sum + (r.averageGrade || 0), 0);
            const validGradesCount = yearRecords.filter(
                (r) => r.averageGrade !== null && r.averageGrade !== undefined
            ).length;

            const overallAverageGrade =
                validGradesCount > 0 ? Math.round((gradesSum / validGradesCount) * 10) / 10 : null;
            const overallPassingRate =
                totalStudents > 0 ? Math.round((totalPassed / totalStudents) * 100) : null;

            schoolYears.push({
                id: y.id,
                schoolYear: y.schoolYear,
                semester: y.semester,
                quarterCount: y.quarterCount,
                status: y.status,
                completedAt: y.completedAt,
                createdAt: y.createdAt,
                classCount,
                totalStudents,
                overallAverageGrade,
                overallPassingRate,
            });
        }

        // Add any school years found in records that weren't in academic_years
        for (const r of records) {
            if (!seenYears.has(r.schoolYear)) {
                seenYears.add(r.schoolYear);
                const yearRecords = records.filter((rec) => rec.schoolYear === r.schoolYear);
                const classCount = yearRecords.length;
                const totalStudents = yearRecords.reduce((sum, rec) => sum + (rec.studentCount || 0), 0);
                const totalPassed = yearRecords.reduce((sum, rec) => sum + (rec.passedCount || 0), 0);

                schoolYears.push({
                    id: 0,
                    schoolYear: r.schoolYear,
                    semester: "Completed",
                    quarterCount: 4,
                    status: "completed",
                    classCount,
                    totalStudents,
                    overallPassingRate: totalStudents > 0 ? Math.round((totalPassed / totalStudents) * 100) : null,
                });
            }
        }

        // Overall stats across all archived records
        const completedYears = schoolYears.filter((y) => y.status === "completed");
        const totalYearsArchived = completedYears.length;
        const totalClassesArchived = records.length;
        const totalStudentsRecorded = records.reduce((sum, r) => sum + (r.studentCount || 0), 0);
        const totalPassedAll = records.reduce((sum, r) => sum + (r.passedCount || 0), 0);

        const recordsWithGrade = records.filter((r) => r.averageGrade !== null && r.averageGrade !== undefined);
        const overallAverageGrade =
            recordsWithGrade.length > 0
                ? Math.round(
                    (recordsWithGrade.reduce((sum, r) => sum + (r.averageGrade || 0), 0) /
                        recordsWithGrade.length) *
                    10
                ) / 10
                : null;
        const overallPassingRate =
            totalStudentsRecorded > 0 ? Math.round((totalPassedAll / totalStudentsRecorded) * 100) : null;

        return {
            schoolYears,
            records,
            stats: {
                totalYearsArchived,
                totalClassesArchived,
                totalStudentsRecorded,
                overallAverageGrade,
                overallPassingRate,
            },
            currentActiveYear,
        };
    } catch (error) {
        console.error("Error fetching academic history:", error);
        return null;
    }
}

/**
 * Fetch details of a single academic record including all student performance records
 */
export async function getAcademicRecordDetails(recordId: number): Promise<AcademicRecordDetails | null> {
    try {
        const db = await getDatabase();

        const record = await db.getFirstAsync<AcademicRecordItem>(
            "SELECT * FROM academic_records WHERE id = ?",
            [recordId]
        );

        if (!record) return null;

        const rawStudents = await db.getAllAsync<{
            id: number;
            recordId: number;
            studentId: number | null;
            studentName: string;
            lrn: string | null;
            gender: string | null;
            finalGrade: number | null;
            letterGrade: string | null;
            remarks: string;
            attendanceRate: number | null;
            quarterGrades: string | null;
            breakdown: string | null;
            createdAt: string;
        }>(
            "SELECT * FROM academic_student_records WHERE recordId = ? ORDER BY studentName ASC",
            [recordId]
        );

        const students: AcademicStudentRecordItem[] = rawStudents.map((s) => {
            let quarterGrades: Record<string, number | null> = {};
            let breakdown: any[] = [];

            try {
                if (s.quarterGrades) quarterGrades = JSON.parse(s.quarterGrades);
            } catch {
                quarterGrades = {};
            }

            try {
                if (s.breakdown) breakdown = JSON.parse(s.breakdown);
            } catch {
                breakdown = [];
            }

            return {
                id: s.id,
                recordId: s.recordId,
                studentId: s.studentId,
                studentName: s.studentName,
                lrn: s.lrn,
                gender: s.gender,
                finalGrade: s.finalGrade,
                letterGrade: s.letterGrade,
                remarks: s.remarks,
                attendanceRate: s.attendanceRate,
                quarterGrades,
                breakdown,
                createdAt: s.createdAt,
            };
        });

        return {
            ...record,
            students,
        };
    } catch (error) {
        console.error("Error fetching academic record details:", error);
        return null;
    }
}

/**
 * Mark a school year as completed and archive all current class records
 */
export async function markSchoolYearAsCompleted(
    username: string,
    schoolYear: string,
    nextSchoolYear?: string
): Promise<{ success: boolean; message: string }> {
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

        const settings = await db.getFirstAsync<{
            passingScore: number;
            quarterCount: number;
            semester: string;
        }>("SELECT passingScore, quarterCount, semester FROM academic_settings WHERE teacherId = ?", [
            teacherId,
        ]);
        const passingScore = settings?.passingScore || 75.0;
        const quarterCount = settings?.quarterCount || 4;

        // Fetch all classes of this teacher
        const classes = await db.getAllAsync<{
            id: number;
            name: string;
            section: string | null;
            subject: string | null;
        }>("SELECT id, name, section, subject FROM classes WHERE teacherId = ?", [teacherId]);

        await db.withTransactionAsync(async () => {
            // 1. Update or create the academic_years entry
            await db.runAsync(
                `INSERT INTO academic_years (teacherId, schoolYear, semester, quarterCount, status, completedAt)
                 VALUES (?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP)
                 ON CONFLICT(teacherId, schoolYear) DO UPDATE SET
                     status = 'completed',
                     completedAt = CURRENT_TIMESTAMP`,
                [teacherId, schoolYear, settings?.semester || "1st Semester", quarterCount]
            );

            const yearRow = await db.getFirstAsync<{ id: number }>(
                "SELECT id FROM academic_years WHERE teacherId = ? AND schoolYear = ?",
                [teacherId, schoolYear]
            );
            const academicYearId = yearRow?.id ?? null;

            // 2. For each class, snapshot student grades and attendance
            for (const c of classes) {
                // Fetch enrolled students
                const students = await db.getAllAsync<Student>(
                    `SELECT s.* FROM students s
                     JOIN class_students cs ON cs.studentId = s.id
                     WHERE cs.classId = ?
                     ORDER BY s.lastname ASC, s.firstname ASC`,
                    [c.id]
                );

                if (students.length === 0) continue;

                // Fetch weights
                const weights = await db.getAllAsync<GradingWeight>(
                    `SELECT * FROM grading_weights 
                     WHERE teacherId = ? AND (classId = ? OR classId IS NULL)
                     ORDER BY id ASC`,
                    [teacherId, c.id]
                );

                // Fetch all assessments for this class
                const assessments = await db.getAllAsync<Assessment>(
                    "SELECT * FROM assessments WHERE teacherId = ? AND classId = ?",
                    [teacherId, c.id]
                );

                // Fetch scores map
                const scores = await db.getAllAsync<{
                    studentId: number;
                    assessmentId: number;
                    score: number;
                }>(
                    `SELECT studentId, assessmentId, score FROM assessment_scores
                     WHERE assessmentId IN (SELECT id FROM assessments WHERE teacherId = ? AND classId = ?)`,
                    [teacherId, c.id]
                );
                const scoresMap: Record<string, string> = {};
                for (const sc of scores) {
                    scoresMap[`${sc.studentId}_${sc.assessmentId}`] = String(sc.score);
                }

                // Fetch attendance sessions and records
                const sessions = await db.getAllAsync<{ id: number; quarter: string }>(
                    "SELECT id, quarter FROM attendance_sessions WHERE teacherId = ? AND classId = ?",
                    [teacherId, c.id]
                );
                const sessionIds = sessions.map((s) => s.id);

                let attendanceRecords: {
                    sessionId: number;
                    studentId: number;
                    status: string;
                }[] = [];
                if (sessionIds.length > 0) {
                    attendanceRecords = await db.getAllAsync<{
                        sessionId: number;
                        studentId: number;
                        status: string;
                    }>(
                        `SELECT sessionId, studentId, status FROM attendance_records
                         WHERE sessionId IN (${sessionIds.join(",")})`
                    );
                }

                // Process student snapshots
                const studentSnapshots: {
                    studentId: number;
                    studentName: string;
                    lrn: string | null;
                    gender: string | null;
                    finalGrade: number | null;
                    remarks: string;
                    attendanceRate: number | null;
                    quarterGrades: Record<string, number | null>;
                    breakdown: any[];
                }[] = [];

                for (const s of students) {
                    const fullName = `${s.firstname} ${s.lastname}`;

                    // Student attendance
                    const studentAttRecords = attendanceRecords.filter((ar) => ar.studentId === s.id);
                    const presentCount = studentAttRecords.filter(
                        (ar) => ar.status === "1" || ar.status === "present"
                    ).length;
                    const totalAttSessions = sessionIds.length;
                    const attRate =
                        totalAttSessions > 0
                            ? Math.round((presentCount / totalAttSessions) * 1000) / 10
                            : 100;

                    // Overall Grade
                    const calculated = calculateStudentGrade(
                        s.id,
                        assessments,
                        weights,
                        scoresMap,
                        totalAttSessions > 0
                            ? {
                                present: presentCount,
                                total: totalAttSessions,
                                percentage: attRate,
                            }
                            : undefined
                    );

                    const finalGrade = calculated.numericGrade;
                    const remarks =
                        finalGrade !== null && finalGrade >= passingScore ? "Passed" : "Failed";

                    // Quarter Grades (Q1, Q2, Q3, Q4)
                    const quartersToCalc = quarterCount === 3 ? ["Q1", "Q2", "Q3"] : ["Q1", "Q2", "Q3", "Q4"];
                    const quarterGrades: Record<string, number | null> = {};

                    for (const q of quartersToCalc) {
                        const qAssessments = assessments.filter((a) => (a.quarter || "Q1") === q);
                        const qSessions = sessions.filter((sess) => (sess.quarter || "Q1") === q);
                        const qSessionIds = qSessions.map((qs) => qs.id);
                        const qAttRecords = studentAttRecords.filter((ar) => qSessionIds.includes(ar.sessionId));
                        const qPresent = qAttRecords.filter(
                            (ar) => ar.status === "1" || ar.status === "present"
                        ).length;
                        const qAttRate =
                            qSessions.length > 0 ? Math.round((qPresent / qSessions.length) * 1000) / 10 : 100;

                        const qCalc = calculateStudentGrade(
                            s.id,
                            qAssessments,
                            weights,
                            scoresMap,
                            qSessions.length > 0
                                ? { present: qPresent, total: qSessions.length, percentage: qAttRate }
                                : undefined
                        );
                        quarterGrades[q] = qCalc.numericGrade;
                    }

                    studentSnapshots.push({
                        studentId: s.id,
                        studentName: fullName,
                        lrn: s.student_id || null,
                        gender: null,
                        finalGrade,
                        remarks,
                        attendanceRate: attRate,
                        quarterGrades,
                        breakdown: calculated.breakdown || [],
                    });
                }

                // Compute class summary statistics
                const studentCount = studentSnapshots.length;
                const passedCount = studentSnapshots.filter((sn) => sn.remarks === "Passed").length;
                const failedCount = studentSnapshots.filter((sn) => sn.remarks === "Failed").length;

                const gradedSnapshots = studentSnapshots.filter((sn) => sn.finalGrade !== null);
                const averageGrade =
                    gradedSnapshots.length > 0
                        ? Math.round(
                            (gradedSnapshots.reduce((acc, sn) => acc + (sn.finalGrade || 0), 0) /
                                gradedSnapshots.length) *
                            10
                        ) / 10
                        : null;

                const averageAttendance =
                    studentSnapshots.length > 0
                        ? Math.round(
                            (studentSnapshots.reduce((acc, sn) => acc + (sn.attendanceRate || 100), 0) /
                                studentSnapshots.length) *
                            10
                        ) / 10
                        : null;

                // 3. Insert or update class record in academic_records
                const insertRecordRes = await db.runAsync(
                    `INSERT INTO academic_records (
                        teacherId, academicYearId, schoolYear, classId, className, section, subject,
                        studentCount, passedCount, failedCount, averageGrade, averageAttendance, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
                    [
                        teacherId,
                        academicYearId,
                        schoolYear,
                        c.id,
                        c.name,
                        c.section || null,
                        c.subject || null,
                        studentCount,
                        passedCount,
                        failedCount,
                        averageGrade,
                        averageAttendance,
                    ]
                );

                const recordId = insertRecordRes.lastInsertRowId;

                // 4. Insert each student record in academic_student_records
                for (const sn of studentSnapshots) {
                    await db.runAsync(
                        `INSERT INTO academic_student_records (
                            recordId, studentId, studentName, lrn, gender, finalGrade, remarks,
                            attendanceRate, quarterGrades, breakdown
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            recordId,
                            sn.studentId,
                            sn.studentName,
                            sn.lrn,
                            sn.gender,
                            sn.finalGrade,
                            sn.remarks,
                            sn.attendanceRate,
                            JSON.stringify(sn.quarterGrades),
                            JSON.stringify(sn.breakdown),
                        ]
                    );
                }
            }

            // 5. Update academic_settings status to completed (or transition to next school year if requested)
            if (nextSchoolYear && nextSchoolYear.trim() !== schoolYear) {
                await db.runAsync(
                    `UPDATE academic_settings 
                     SET academicYear = ?, status = 'active', activeQuarter = 'Q1', updatedAt = CURRENT_TIMESTAMP
                     WHERE teacherId = ?`,
                    [nextSchoolYear.trim(), teacherId]
                );

                await db.runAsync(
                    `INSERT INTO academic_years (teacherId, schoolYear, status)
                     VALUES (?, ?, 'active')
                     ON CONFLICT(teacherId, schoolYear) DO UPDATE SET status = 'active'`,
                    [teacherId, nextSchoolYear.trim()]
                );
            } else {
                await db.runAsync(
                    `UPDATE academic_settings 
                     SET status = 'completed', updatedAt = CURRENT_TIMESTAMP
                     WHERE teacherId = ?`,
                    [teacherId]
                );
            }
        });

        return {
            success: true,
            message: `School Year ${schoolYear} has been marked as completed and archived to Academic History.`,
        };
    } catch (error) {
        console.error("Error marking school year as completed:", error);
        return { success: false, message: "Failed to complete and archive school year." };
    }
}

/**
 * Permanently delete a single academic record and its student entries
 */
export async function deleteAcademicRecord(recordId: number): Promise<{ success: boolean; message: string }> {
    try {
        const db = await getDatabase();
        await db.runAsync("DELETE FROM academic_records WHERE id = ?", [recordId]);
        return { success: true, message: "Academic record deleted successfully." };
    } catch (error) {
        console.error("Error deleting academic record:", error);
        return { success: false, message: "Failed to delete academic record." };
    }
}

/**
 * Permanently delete all academic records for an entire school year
 */
export async function deleteSchoolYearRecords(
    username: string,
    schoolYear: string
): Promise<{ success: boolean; message: string }> {
    try {
        const db = await getDatabase();
        const teacher = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM users WHERE username = ?",
            [username.trim()]
        );

        if (!teacher) {
            return { success: false, message: "Teacher account not found." };
        }

        await db.withTransactionAsync(async () => {
            // Delete records
            await db.runAsync(
                "DELETE FROM academic_records WHERE teacherId = ? AND schoolYear = ?",
                [teacher.id, schoolYear]
            );

            // Delete or reset academic year entry
            await db.runAsync(
                "DELETE FROM academic_years WHERE teacherId = ? AND schoolYear = ?",
                [teacher.id, schoolYear]
            );
        });

        return { success: true, message: `All academic records for ${schoolYear} have been deleted.` };
    } catch (error) {
        console.error("Error deleting school year records:", error);
        return { success: false, message: "Failed to delete school year records." };
    }
}