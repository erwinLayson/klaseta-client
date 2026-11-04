import { getDatabase } from "../database/connection";

export interface UserProfileInfo {
    id: number;
    username: string;
    email: string;
    studentCount: number;
    classCount: number;
    sessionCount: number;
    assessmentCount: number;
    createdAt?: string;
}

export async function getUserProfile(username: string): Promise<UserProfileInfo | null> {
    try {
        const db = await getDatabase();
        const user = await db.getFirstAsync<{
            id: number;
            username: string;
            email: string;
        }>("SELECT id, username, email FROM users WHERE username = ?", [
            username.trim(),
        ]);

        if (!user) return null;

        const teacherId = user.id;

        const classRes = await db.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) as count FROM classes WHERE teacherId = ?",
            [teacherId]
        );
        const studentRes = await db.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) as count FROM students WHERE teacherId = ?",
            [teacherId]
        );
        const sessionRes = await db.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) as count FROM attendance_sessions WHERE teacherId = ?",
            [teacherId]
        );
        const assessmentRes = await db.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) as count FROM assessments WHERE teacherId = ?",
            [teacherId]
        );

        return {
            id: user.id,
            username: user.username,
            email: user.email,
            classCount: classRes?.count ?? 0,
            studentCount: studentRes?.count ?? 0,
            sessionCount: sessionRes?.count ?? 0,
            assessmentCount: assessmentRes?.count ?? 0,
        };
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}

export async function deleteUserAccount(
    username: string
): Promise<{ success: boolean; message: string }> {
    if (!username?.trim()) {
        return { success: false, message: "Username is required." };
    }

    try {
        const db = await getDatabase();
        await db.execAsync("PRAGMA foreign_keys = ON;");

        const teacher = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM users WHERE username = ?",
            [username.trim()]
        );

        if (!teacher) {
            return { success: false, message: "User account not found." };
        }

        const teacherId = teacher.id;

        await db.withTransactionAsync(async () => {
            // 1. Delete all assessment scores of this teacher's students and assessments
            await db.runAsync(
                `DELETE FROM assessment_scores
                 WHERE studentId IN (SELECT id FROM students WHERE teacherId = ?)
                    OR assessmentId IN (SELECT id FROM assessments WHERE teacherId = ?)`,
                [teacherId, teacherId]
            );

            // 2. Delete all attendance records of this teacher's students and sessions
            await db.runAsync(
                `DELETE FROM attendance_records
                 WHERE studentId IN (SELECT id FROM students WHERE teacherId = ?)
                    OR sessionId IN (SELECT id FROM attendance_sessions WHERE teacherId = ?)`,
                [teacherId, teacherId]
            );

            // 3. Delete all class-student enrollments
            await db.runAsync(
                `DELETE FROM class_students
                 WHERE classId IN (SELECT id FROM classes WHERE teacherId = ?)
                    OR studentId IN (SELECT id FROM students WHERE teacherId = ?)`,
                [teacherId, teacherId]
            );

            // 4. Delete all assessments
            await db.runAsync(
                "DELETE FROM assessments WHERE teacherId = ?",
                [teacherId]
            );

            // 5. Delete all grading weights
            await db.runAsync(
                "DELETE FROM grading_weights WHERE teacherId = ?",
                [teacherId]
            );

            // 6. Delete all attendance sessions
            await db.runAsync(
                "DELETE FROM attendance_sessions WHERE teacherId = ?",
                [teacherId]
            );

            // 7. Delete all students
            await db.runAsync(
                "DELETE FROM students WHERE teacherId = ?",
                [teacherId]
            );

            // 8. Delete all classes
            await db.runAsync(
                "DELETE FROM classes WHERE teacherId = ?",
                [teacherId]
            );

            // 9. Finally, delete the user record itself
            await db.runAsync(
                "DELETE FROM users WHERE id = ?",
                [teacherId]
            );
        });

        return {
            success: true,
            message: "Your account and all associated data have been permanently removed.",
        };
    } catch (error) {
        console.error("Error deleting user account:", error);
        return {
            success: false,
            message: "Failed to delete account. Please try again.",
        };
    }
}

