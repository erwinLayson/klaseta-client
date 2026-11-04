import { getDatabase } from "../database/connection";
import type { Student, AddStudentInput } from "../../types/student";

export type StudentResult = {
    success: boolean;
    message: string;
};

export async function addStudent(
    username: string,
    input: AddStudentInput
): Promise<StudentResult> {
    const { firstname, middlename, lastname, suffix } = input;

    if (!firstname.trim() || !lastname.trim()) {
        return { success: false, message: "First name and Last name are required." };
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

        const normalizedMiddlename = middlename?.trim() ? middlename.trim() : null;
        const normalizedSuffix = suffix?.trim() && suffix.trim() !== "None" ? suffix.trim() : null;

        await db.runAsync(
            `INSERT INTO students (firstname, middlename, lastname, suffix, teacherId)
             VALUES (?, ?, ?, ?, ?)`,
            [
                firstname.trim(),
                normalizedMiddlename,
                lastname.trim(),
                normalizedSuffix,
                teacher.id,
            ]
        );

        return { success: true, message: "Student added successfully!" };
    } catch (error) {
        console.error("Error adding student:", error);
        return { success: false, message: "Failed to add student. Please try again." };
    }
}

export async function getStudentsByTeacher(username: string): Promise<Student[]> {
    try {
        const db = await getDatabase();

        const teacher = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM users WHERE username = ?",
            [username.trim()]
        );

        if (!teacher) {
            return [];
        }

        const students = await db.getAllAsync<Student>(
            "SELECT * FROM students WHERE teacherId = ? ORDER BY id DESC",
            [teacher.id]
        );

        return students ?? [];
    } catch (error) {
        console.error("Error fetching students:", error);
        return [];
    }
}

