import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system/legacy";
import { getDatabase } from "../database/connection";
import type { Student, AddStudentInput } from "../../types/student";

export type StudentResult = {
    success: boolean;
    message: string;
};

export type BulkUploadResult = {
    success: boolean;
    message: string;
    insertedCount: number;
    skippedCount: number;
};

export function normalizeSuffix(rawSuffix?: string | null): string | null {
    if (!rawSuffix) return null;
    const clean = String(rawSuffix).trim();
    if (!clean || ["none", "n/a", "na", "-", "null"].includes(clean.toLowerCase())) {
        return null;
    }
    const lower = clean.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (lower === "jr" || lower === "junior") return "Jr.";
    if (lower === "sr" || lower === "senior") return "Sr.";
    if (lower === "ii" || lower === "2" || lower === "2nd") return "II";
    if (lower === "iii" || lower === "3" || lower === "3rd") return "III";
    if (lower === "iv" || lower === "4" || lower === "4th") return "IV";
    if (lower === "v" || lower === "5" || lower === "5th") return "V";
    return clean;
}

/**
 * Normalizes any variation of column header (e.g. "firstname", "first name", "FirstName", "First Name", "first_name")
 */
export function normalizeStudentRow(row: Record<string, unknown>): AddStudentInput | null {
    let firstname = "";
    let middlename = "";
    let lastname = "";
    let suffix = "";

    for (const [key, value] of Object.entries(row)) {
        if (value === undefined || value === null) continue;
        const strVal = String(value).trim();
        if (!strVal) continue;

        // Strip spaces, underscores, dashes, and lowercase for matching
        const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");

        // Match first name: firstname | first name | FirstName | firstName | first_name | fname
        if (
            cleanKey === "firstname" ||
            cleanKey === "first" ||
            cleanKey === "fname" ||
            cleanKey === "studentfirstname" ||
            cleanKey === "studentfname"
        ) {
            firstname = strVal;
        }
        // Match last name: lastname | last name | LastName | lastName | last_name | lname | surname
        else if (
            cleanKey === "lastname" ||
            cleanKey === "last" ||
            cleanKey === "lname" ||
            cleanKey === "surname" ||
            cleanKey === "studentlastname" ||
            cleanKey === "studentlname"
        ) {
            lastname = strVal;
        }
        // Match middle name: middlename | middle name | MiddleName | middleName | middle_name | mname | mi
        else if (
            cleanKey === "middlename" ||
            cleanKey === "middle" ||
            cleanKey === "mname" ||
            cleanKey === "mi" ||
            cleanKey === "middleinitial" ||
            cleanKey === "studentmiddlename"
        ) {
            middlename = strVal;
        }
        // Match suffix: suffix | Suffix | ext | extension
        else if (
            cleanKey === "suffix" ||
            cleanKey === "studentsuffix" ||
            cleanKey === "ext" ||
            cleanKey === "extension" ||
            cleanKey === "nameextension"
        ) {
            suffix = strVal;
        }
    }

    if (!firstname || !lastname) {
        return null;
    }

    return {
        firstname,
        middlename,
        lastname,
        suffix: normalizeSuffix(suffix) ?? undefined,
    };
}

/**
 * Parses an XLSX file from its URI and returns normalized student records
 */
export async function parseXlsxFile(fileUri: string): Promise<{
    students: AddStudentInput[];
    skippedCount: number;
    totalRows: number;
}> {
    const base64Data = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    const workbook = XLSX.read(base64Data, { type: "base64" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
        return { students: [], skippedCount: 0, totalRows: 0 };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: "",
    });

    const students: AddStudentInput[] = [];
    let skippedCount = 0;

    for (const row of rawRows) {
        const student = normalizeStudentRow(row);
        if (student) {
            students.push(student);
        } else {
            // Check if row had any non-empty content before counting as skipped
            const hasAnyContent = Object.values(row).some(
                (v) => v !== null && v !== undefined && String(v).trim() !== ""
            );
            if (hasAnyContent) {
                skippedCount++;
            }
        }
    }

    return {
        students,
        skippedCount,
        totalRows: rawRows.length,
    };
}

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
        const normalizedSuffix = normalizeSuffix(suffix);

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

export async function addStudentsBulk(
    username: string,
    studentsList: AddStudentInput[]
): Promise<BulkUploadResult> {
    if (studentsList.length === 0) {
        return {
            success: false,
            message: "No valid student records provided.",
            insertedCount: 0,
            skippedCount: 0,
        };
    }

    try {
        const db = await getDatabase();

        const teacher = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM users WHERE username = ?",
            [username.trim()]
        );

        if (!teacher) {
            return {
                success: false,
                message: "Teacher account not found.",
                insertedCount: 0,
                skippedCount: 0,
            };
        }

        let insertedCount = 0;
        let skippedCount = 0;

        await db.withTransactionAsync(async () => {
            for (const student of studentsList) {
                if (!student.firstname?.trim() || !student.lastname?.trim()) {
                    skippedCount++;
                    continue;
                }

                const normalizedMiddlename = student.middlename?.trim()
                    ? student.middlename.trim()
                    : null;
                const normalizedSuffix = normalizeSuffix(student.suffix);

                await db.runAsync(
                    `INSERT INTO students (firstname, middlename, lastname, suffix, teacherId)
                     VALUES (?, ?, ?, ?, ?)`,
                    [
                        student.firstname.trim(),
                        normalizedMiddlename,
                        student.lastname.trim(),
                        normalizedSuffix,
                        teacher.id,
                    ]
                );

                insertedCount++;
            }
        });

        return {
            success: insertedCount > 0,
            message:
                insertedCount > 0
                    ? `Successfully imported ${insertedCount} student${insertedCount > 1 ? "s" : ""}!${
                          skippedCount > 0 ? ` (${skippedCount} rows skipped due to missing name)` : ""
                      }`
                    : "No students were imported. Make sure each row includes a first and last name.",
            insertedCount,
            skippedCount,
        };
    } catch (error) {
        console.error("Error during bulk student import:", error);
        return {
            success: false,
            message: "Database error during bulk upload. Please try again.",
            insertedCount: 0,
            skippedCount: 0,
        };
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
