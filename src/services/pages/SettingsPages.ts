import { bcrypt } from "../auth/bcryptSetup";
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

export interface UpdateProfileInput {
    username: string;
    email: string;
}

export interface UpdateProfileResult {
    success: boolean;
    message: string;
    newUsername?: string;
    newEmail?: string;
}

export interface UpdatePasswordInput {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export interface UpdatePasswordResult {
    success: boolean;
    message: string;
}

export interface AcademicSettings {
    id: number;
    teacherId: number;
    academicYear: string;
    activeQuarter: string;
    semester: string;
    passingScore: number;
    quarterCount: number; // 3 or 4
    updatedAt?: string;
}

export interface UpdateAcademicSettingsInput {
    academicYear: string;
    activeQuarter: string;
    semester: string;
    passingScore?: number;
    quarterCount?: number; // 3 or 4
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

            // 8.5 Delete academic settings
            await db.runAsync(
                "DELETE FROM academic_settings WHERE teacherId = ?",
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

export async function updateUserProfile(
    currentUsername: string,
    input: UpdateProfileInput
): Promise<UpdateProfileResult> {
    const trimmedUsername = input.username?.trim();
    const trimmedEmail = input.email?.trim().toLowerCase();

    if (!trimmedUsername) {
        return { success: false, message: "Username cannot be empty." };
    }

    if (!trimmedEmail) {
        return { success: false, message: "Email cannot be empty." };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
        return { success: false, message: "Please enter a valid email address." };
    }

    try {
        const db = await getDatabase();

        const user = await db.getFirstAsync<{ id: number; username: string; email: string }>(
            "SELECT id, username, email FROM users WHERE username = ?",
            [currentUsername.trim()]
        );

        if (!user) {
            return { success: false, message: "User account not found." };
        }

        // Check if no changes were made
        if (user.username === trimmedUsername && user.email.toLowerCase() === trimmedEmail) {
            return {
                success: true,
                message: "No changes detected. Profile is up to date.",
                newUsername: user.username,
                newEmail: user.email,
            };
        }

        // Check if new username is already taken by another account
        if (user.username !== trimmedUsername) {
            const existingUsername = await db.getFirstAsync<{ id: number }>(
                "SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?",
                [trimmedUsername, user.id]
            );
            if (existingUsername) {
                return {
                    success: false,
                    message: "This username is already taken. Please choose another.",
                };
            }
        }

        // Check if new email is already taken by another account
        if (user.email.toLowerCase() !== trimmedEmail) {
            const existingEmail = await db.getFirstAsync<{ id: number }>(
                "SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?",
                [trimmedEmail, user.id]
            );
            if (existingEmail) {
                return {
                    success: false,
                    message: "An account with this email address already exists.",
                };
            }
        }

        // Update username and email in the database
        await db.runAsync(
            "UPDATE users SET username = ?, email = ? WHERE id = ?",
            [trimmedUsername, trimmedEmail, user.id]
        );

        return {
            success: true,
            message: "Personal information updated successfully!",
            newUsername: trimmedUsername,
            newEmail: trimmedEmail,
        };
    } catch (error) {
        console.error("Error updating user profile:", error);
        return {
            success: false,
            message: "Failed to update profile. Please try again.",
        };
    }
}

export async function updateUserPassword(
    username: string,
    input: UpdatePasswordInput
): Promise<UpdatePasswordResult> {
    const { currentPassword, newPassword, confirmPassword } = input;

    if (!currentPassword?.trim() || !newPassword || !confirmPassword) {
        return { success: false, message: "Please fill in all password fields." };
    }

    if (newPassword.length < 6) {
        return { success: false, message: "New password must be at least 6 characters." };
    }

    if (newPassword !== confirmPassword) {
        return { success: false, message: "New passwords do not match." };
    }

    if (newPassword === currentPassword) {
        return {
            success: false,
            message: "New password must be different from your current password.",
        };
    }

    try {
        const db = await getDatabase();

        const user = await db.getFirstAsync<{ id: number; password: string }>(
            "SELECT id, password FROM users WHERE username = ?",
            [username.trim()]
        );

        if (!user) {
            return { success: false, message: "User account not found." };
        }

        // Check if current password matches (bcrypt or legacy plaintext)
        const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordMatch && user.password !== currentPassword) {
            return {
                success: false,
                message: "The current password you entered is incorrect.",
            };
        }

        // Hash the new password with bcrypt
        const hashedPassword = await bcrypt.hash(newPassword.toString(), 10);

        await db.runAsync(
            "UPDATE users SET password = ? WHERE id = ?",
            [hashedPassword, user.id]
        );

        return {
            success: true,
            message: "Password updated successfully!",
        };
    } catch (error) {
        console.error("Error updating user password:", error);
        return {
            success: false,
            message: "Failed to update password. Please try again.",
        };
    }
}

export async function getAcademicSettings(
    username: string
): Promise<AcademicSettings | null> {
    try {
        const db = await getDatabase();
        const teacher = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM users WHERE username = ?",
            [username.trim()]
        );
        if (!teacher) return null;

        let settings = await db.getFirstAsync<AcademicSettings>(
            "SELECT * FROM academic_settings WHERE teacherId = ?",
            [teacher.id]
        );

        if (!settings) {
            await db.runAsync(
                `INSERT OR IGNORE INTO academic_settings (teacherId, academicYear, activeQuarter, semester, passingScore, quarterCount)
                 VALUES (?, '2024-2025', 'Q1', '1st Semester', 75.0, 4)`,
                [teacher.id]
            );
            settings = await db.getFirstAsync<AcademicSettings>(
                "SELECT * FROM academic_settings WHERE teacherId = ?",
                [teacher.id]
            );
        }

        return settings
            ? {
                  ...settings,
                  quarterCount: settings.quarterCount === 3 ? 3 : 4,
              }
            : {
                  id: 0,
                  teacherId: teacher.id,
                  academicYear: "2024-2025",
                  activeQuarter: "Q1",
                  semester: "1st Semester",
                  passingScore: 75.0,
                  quarterCount: 4,
              };
    } catch (error) {
        console.error("Error fetching academic settings:", error);
        return null;
    }
}

export async function updateAcademicSettings(
    username: string,
    input: UpdateAcademicSettingsInput
): Promise<{ success: boolean; message: string; settings?: AcademicSettings }> {
    const academicYear = input.academicYear?.trim() || "2024-2025";
    const quarterCount = input.quarterCount === 3 ? 3 : 4;
    let activeQuarter = input.activeQuarter?.trim() || "Q1";
    // If 3 quarters selected, activeQuarter cannot be Q4
    if (quarterCount === 3 && activeQuarter === "Q4") {
        activeQuarter = "Q3";
    }
    const semester = input.semester?.trim() || "1st Semester";
    const passingScore = input.passingScore ?? 75.0;

    if (!academicYear) {
        return { success: false, message: "Academic Year is required." };
    }

    try {
        const db = await getDatabase();
        const teacher = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM users WHERE username = ?",
            [username.trim()]
        );

        if (!teacher) {
            return { success: false, message: "User account not found." };
        }

        await db.runAsync(
            `INSERT INTO academic_settings (teacherId, academicYear, activeQuarter, semester, passingScore, quarterCount, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(teacherId) DO UPDATE SET
                 academicYear = excluded.academicYear,
                 activeQuarter = excluded.activeQuarter,
                 semester = excluded.semester,
                 passingScore = excluded.passingScore,
                 quarterCount = excluded.quarterCount,
                 updatedAt = CURRENT_TIMESTAMP`,
            [teacher.id, academicYear, activeQuarter, semester, passingScore, quarterCount]
        );

        const updated = await db.getFirstAsync<AcademicSettings>(
            "SELECT * FROM academic_settings WHERE teacherId = ?",
            [teacher.id]
        );

        return {
            success: true,
            message: "Academic settings updated successfully!",
            settings: updated ? { ...updated, quarterCount } : undefined,
        };
    } catch (error) {
        console.error("Error updating academic settings:", error);
        return {
            success: false,
            message: "Failed to update academic settings.",
        };
    }
}



