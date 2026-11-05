import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system/legacy";
import { getDatabase } from "../database/connection";
import type { Student, AddStudentInput } from "../../types/student";
import type { ClassItem, CreateClassInput, UpdateClassInput } from "../../types/class";
import { getActiveSchoolYear } from "./SchoolYearService";

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

export interface XlsxColumnValidation {
    name: string;
    detected: boolean;
    matchedHeader?: string;
    required: boolean;
}

export interface XlsxRowIssue {
    rowNumber: number;
    reason: string;
}

export interface XlsxValidationResult {
    success: boolean;
    fileName: string;
    sheetName: string;
    totalRows: number;
    columns: {
        firstName: XlsxColumnValidation;
        lastName: XlsxColumnValidation;
        middleName: XlsxColumnValidation;
        suffix: XlsxColumnValidation;
    };
    detectedHeaders: string[];
    validStudents: AddStudentInput[];
    invalidRows: XlsxRowIssue[];
    errorMessage?: string;
}

/**
 * Parses and validates an XLSX / CSV spreadsheet file, checking all column headers and row data.
 */
export async function parseAndValidateXlsx(
    fileUri: string,
    fileName: string
): Promise<XlsxValidationResult> {
    try {
        const base64Data = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const workbook = XLSX.read(base64Data, { type: "base64" });
        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
            return {
                success: false,
                fileName,
                sheetName: "",
                totalRows: 0,
                columns: {
                    firstName: { name: "First Name", detected: false, required: true },
                    lastName: { name: "Last Name", detected: false, required: true },
                    middleName: { name: "Middle Name", detected: false, required: false },
                    suffix: { name: "Suffix", detected: false, required: false },
                },
                detectedHeaders: [],
                validStudents: [],
                invalidRows: [],
                errorMessage: "The workbook contains no sheets or data.",
            };
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
            defval: "",
        });

        if (rawRows.length === 0) {
            return {
                success: false,
                fileName,
                sheetName: firstSheetName,
                totalRows: 0,
                columns: {
                    firstName: { name: "First Name", detected: false, required: true },
                    lastName: { name: "Last Name", detected: false, required: true },
                    middleName: { name: "Middle Name", detected: false, required: false },
                    suffix: { name: "Suffix", detected: false, required: false },
                },
                detectedHeaders: [],
                validStudents: [],
                invalidRows: [],
                errorMessage: "The sheet is empty or contains no data rows.",
            };
        }

        // Collect all detected headers from row keys
        const headerSet = new Set<string>();
        for (const r of rawRows) {
            for (const k of Object.keys(r)) {
                if (k.trim()) headerSet.add(k.trim());
            }
        }
        const detectedHeaders = Array.from(headerSet);

        // Check columns
        let matchedFirstHeader: string | undefined;
        let matchedLastHeader: string | undefined;
        let matchedMiddleHeader: string | undefined;
        let matchedSuffixHeader: string | undefined;

        for (const header of detectedHeaders) {
            const cleanKey = header.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (
                cleanKey === "firstname" ||
                cleanKey === "first" ||
                cleanKey === "fname" ||
                cleanKey === "studentfirstname" ||
                cleanKey === "studentfname"
            ) {
                matchedFirstHeader = header;
            } else if (
                cleanKey === "lastname" ||
                cleanKey === "last" ||
                cleanKey === "lname" ||
                cleanKey === "surname" ||
                cleanKey === "studentlastname" ||
                cleanKey === "studentlname"
            ) {
                matchedLastHeader = header;
            } else if (
                cleanKey === "middlename" ||
                cleanKey === "middle" ||
                cleanKey === "mname" ||
                cleanKey === "mi" ||
                cleanKey === "middleinitial" ||
                cleanKey === "studentmiddlename"
            ) {
                matchedMiddleHeader = header;
            } else if (
                cleanKey === "suffix" ||
                cleanKey === "studentsuffix" ||
                cleanKey === "ext" ||
                cleanKey === "extension" ||
                cleanKey === "nameextension"
            ) {
                matchedSuffixHeader = header;
            }
        }

        const columns = {
            firstName: {
                name: "First Name",
                detected: !!matchedFirstHeader,
                matchedHeader: matchedFirstHeader,
                required: true,
            },
            lastName: {
                name: "Last Name",
                detected: !!matchedLastHeader,
                matchedHeader: matchedLastHeader,
                required: true,
            },
            middleName: {
                name: "Middle Name",
                detected: !!matchedMiddleHeader,
                matchedHeader: matchedMiddleHeader,
                required: false,
            },
            suffix: {
                name: "Suffix",
                detected: !!matchedSuffixHeader,
                matchedHeader: matchedSuffixHeader,
                required: false,
            },
        };

        const hasRequiredColumns = columns.firstName.detected && columns.lastName.detected;

        const validStudents: AddStudentInput[] = [];
        const invalidRows: XlsxRowIssue[] = [];

        rawRows.forEach((row, idx) => {
            const rowNumber = idx + 2; // Row 1 is header
            const hasAnyContent = Object.values(row).some(
                (v) => v !== null && v !== undefined && String(v).trim() !== ""
            );
            if (!hasAnyContent) {
                return;
            }

            if (!hasRequiredColumns) {
                invalidRows.push({
                    rowNumber,
                    reason: "Missing required column headers in file",
                });
                return;
            }

            const student = normalizeStudentRow(row);
            if (student) {
                validStudents.push(student);
            } else {
                let fn = "";
                let ln = "";
                if (matchedFirstHeader && row[matchedFirstHeader] !== undefined) {
                    fn = String(row[matchedFirstHeader]).trim();
                }
                if (matchedLastHeader && row[matchedLastHeader] !== undefined) {
                    ln = String(row[matchedLastHeader]).trim();
                }

                if (!fn && !ln) {
                    invalidRows.push({ rowNumber, reason: "Missing both first and last name" });
                } else if (!fn) {
                    invalidRows.push({ rowNumber, reason: "Missing first name" });
                } else if (!ln) {
                    invalidRows.push({ rowNumber, reason: "Missing last name" });
                } else {
                    invalidRows.push({ rowNumber, reason: "Invalid format in row fields" });
                }
            }
        });

        const success = hasRequiredColumns && validStudents.length > 0;
        let errorMessage: string | undefined;

        if (!hasRequiredColumns) {
            const missing: string[] = [];
            if (!columns.firstName.detected) missing.push("First Name");
            if (!columns.lastName.detected) missing.push("Last Name");
            errorMessage = `Missing required column(s): ${missing.join(", ")}.`;
        } else if (validStudents.length === 0) {
            errorMessage = "No valid student records found in this file.";
        }

        return {
            success,
            fileName,
            sheetName: firstSheetName,
            totalRows: rawRows.length,
            columns,
            detectedHeaders,
            validStudents,
            invalidRows,
            errorMessage,
        };
    } catch (err: unknown) {
        console.error("Error parsing and validating XLSX:", err);
        return {
            success: false,
            fileName,
            sheetName: "",
            totalRows: 0,
            columns: {
                firstName: { name: "First Name", detected: false, required: true },
                lastName: { name: "Last Name", detected: false, required: true },
                middleName: { name: "Middle Name", detected: false, required: false },
                suffix: { name: "Suffix", detected: false, required: false },
            },
            detectedHeaders: [],
            validStudents: [],
            invalidRows: [],
            errorMessage: err instanceof Error ? err.message : "Failed to read or parse file.",
        };
    }
}

/**
 * Legacy wrapper: Parses an XLSX file from its URI and returns normalized student records
 */
export async function parseXlsxFile(fileUri: string): Promise<{
    students: AddStudentInput[];
    skippedCount: number;
    totalRows: number;
}> {
    const res = await parseAndValidateXlsx(fileUri, "students.xlsx");
    return {
        students: res.validStudents,
        skippedCount: res.invalidRows.length,
        totalRows: res.totalRows,
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

// ---------------------------------------------------------------------------
// Class Management Services
// ---------------------------------------------------------------------------

export async function getClassesByTeacher(username: string): Promise<ClassItem[]> {
    try {
        const db = await getDatabase();
        const teacher = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM users WHERE username = ?",
            [username.trim()]
        );

        if (!teacher) return [];

        const activeYear = await getActiveSchoolYear(username);
        let classes: ClassItem[] = [];

        if (activeYear) {
            classes = await db.getAllAsync<ClassItem>(
                `SELECT c.*, 
                    (SELECT COUNT(*) FROM class_students cs WHERE cs.classId = c.id) AS studentCount
                 FROM classes c
                 WHERE c.teacherId = ? AND (c.school_year_id = ? OR c.school_year_id IS NULL)
                 ORDER BY c.id DESC`,
                [teacher.id, activeYear.id]
            );
        } else {
            classes = await db.getAllAsync<ClassItem>(
                `SELECT c.*, 
                    (SELECT COUNT(*) FROM class_students cs WHERE cs.classId = c.id) AS studentCount
                 FROM classes c
                 WHERE c.teacherId = ?
                 ORDER BY c.id DESC`,
                [teacher.id]
            );
        }

        return classes ?? [];
    } catch (error) {
        console.error("Error fetching classes:", error);
        return [];
    }
}

export async function getClassById(classId: number): Promise<ClassItem | null> {
    try {
        const db = await getDatabase();
        const row = await db.getFirstAsync<ClassItem>(
            `SELECT c.*, 
                (SELECT COUNT(*) FROM class_students cs WHERE cs.classId = c.id) AS studentCount
             FROM classes c
             WHERE c.id = ?`,
            [classId]
        );
        return row ?? null;
    } catch (error) {
        console.error("Error fetching class by id:", error);
        return null;
    }
}

export async function createClass(
    username: string,
    input: CreateClassInput
): Promise<{ success: boolean; message: string; classId?: number }> {
    if (!input.name.trim()) {
        return { success: false, message: "Class name is required." };
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
        const schoolYearId = input.school_year_id ?? activeYear?.id ?? null;

        const result = await db.runAsync(
            `INSERT INTO classes (teacherId, name, section, subject, room, schedule, color, school_year_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                teacher.id,
                input.name.trim(),
                input.section?.trim() || null,
                input.subject?.trim() || null,
                input.room?.trim() || null,
                input.schedule?.trim() || null,
                input.color?.trim() || "#4F46E5",
                schoolYearId,
            ]
        );

        return {
            success: true,
            message: "Class created successfully!",
            classId: result.lastInsertRowId,
        };
    } catch (error) {
        console.error("Error creating class:", error);
        return { success: false, message: "Failed to create class. Please try again." };
    }
}

export async function updateClass(
    input: UpdateClassInput
): Promise<{ success: boolean; message: string }> {
    if (!input.name.trim()) {
        return { success: false, message: "Class name is required." };
    }

    try {
        const db = await getDatabase();
        await db.runAsync(
            `UPDATE classes
             SET name = ?, section = ?, subject = ?, room = ?, schedule = ?, color = ?
             WHERE id = ?`,
            [
                input.name.trim(),
                input.section?.trim() || null,
                input.subject?.trim() || null,
                input.room?.trim() || null,
                input.schedule?.trim() || null,
                input.color?.trim() || "#4F46E5",
                input.id,
            ]
        );

        return { success: true, message: "Class updated successfully!" };
    } catch (error) {
        console.error("Error updating class:", error);
        return { success: false, message: "Failed to update class." };
    }
}

export async function deleteClass(
    classId: number
): Promise<{ success: boolean; message: string }> {
    try {
        const db = await getDatabase();
        await db.runAsync("DELETE FROM classes WHERE id = ?", [classId]);
        return { success: true, message: "Class deleted successfully." };
    } catch (error) {
        console.error("Error deleting class:", error);
        return { success: false, message: "Failed to delete class." };
    }
}

export async function getStudentsByClass(classId: number): Promise<Student[]> {
    try {
        const db = await getDatabase();
        const students = await db.getAllAsync<Student>(
            `SELECT s.* FROM students s
             JOIN class_students cs ON cs.studentId = s.id
             WHERE cs.classId = ?
             ORDER BY s.lastname ASC, s.firstname ASC`,
            [classId]
        );
        return students ?? [];
    } catch (error) {
        console.error("Error fetching students by class:", error);
        return [];
    }
}

export async function addStudentToClass(
    username: string,
    classId: number,
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

        const activeYear = await getActiveSchoolYear(username);
        const schoolYearId = activeYear?.id ?? null;

        await db.withTransactionAsync(async () => {
            const insertStudentResult = await db.runAsync(
                `INSERT INTO students (firstname, middlename, lastname, suffix, teacherId, classId)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    firstname.trim(),
                    normalizedMiddlename,
                    lastname.trim(),
                    normalizedSuffix,
                    teacher.id,
                    classId,
                ]
            );

            const newStudentId = insertStudentResult.lastInsertRowId;

            await db.runAsync(
                `INSERT OR IGNORE INTO class_students (classId, studentId, school_year_id) VALUES (?, ?, ?)`,
                [classId, newStudentId, schoolYearId]
            );

            // If there are existing attendance sessions for this class, pre-populate record as '1'
            const sessions = await db.getAllAsync<{ id: number }>(
                "SELECT id FROM attendance_sessions WHERE classId = ?",
                [classId]
            );
            for (const s of sessions) {
                await db.runAsync(
                    "INSERT OR IGNORE INTO attendance_records (sessionId, studentId, status) VALUES (?, ?, '1')",
                    [s.id, newStudentId]
                );
            }
        });

        return { success: true, message: "Student added to class successfully!" };
    } catch (error) {
        console.error("Error adding student to class:", error);
        return { success: false, message: "Failed to add student to class. Please try again." };
    }
}

export async function addStudentsBulkToClass(
    username: string,
    classId: number,
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

        const activeYear = await getActiveSchoolYear(username);
        const schoolYearId = activeYear?.id ?? null;

        await db.withTransactionAsync(async () => {
            // Get sessions for this class to link records
            const sessions = await db.getAllAsync<{ id: number }>(
                "SELECT id FROM attendance_sessions WHERE classId = ?",
                [classId]
            );

            for (const student of studentsList) {
                if (!student.firstname?.trim() || !student.lastname?.trim()) {
                    skippedCount++;
                    continue;
                }

                const normalizedMiddlename = student.middlename?.trim()
                    ? student.middlename.trim()
                    : null;
                const normalizedSuffix = normalizeSuffix(student.suffix);

                const res = await db.runAsync(
                    `INSERT INTO students (firstname, middlename, lastname, suffix, teacherId, classId)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        student.firstname.trim(),
                        normalizedMiddlename,
                        student.lastname.trim(),
                        normalizedSuffix,
                        teacher.id,
                        classId,
                    ]
                );

                const newStudentId = res.lastInsertRowId;

                await db.runAsync(
                    `INSERT OR IGNORE INTO class_students (classId, studentId, school_year_id) VALUES (?, ?, ?)`,
                    [classId, newStudentId, schoolYearId]
                );

                for (const s of sessions) {
                    await db.runAsync(
                        "INSERT OR IGNORE INTO attendance_records (sessionId, studentId, status) VALUES (?, ?, '1')",
                        [s.id, newStudentId]
                    );
                }

                insertedCount++;
            }
        });

        return {
            success: insertedCount > 0,
            message:
                insertedCount > 0
                    ? `Successfully imported ${insertedCount} student${insertedCount > 1 ? "s" : ""} to this class!${
                          skippedCount > 0 ? ` (${skippedCount} rows skipped due to missing name)` : ""
                      }`
                    : "No students were imported. Make sure each row includes a first and last name.",
            insertedCount,
            skippedCount,
        };
    } catch (error) {
        console.error("Error bulk adding students to class:", error);
        return {
            success: false,
            message: "Database error during bulk upload. Please try again.",
            insertedCount: 0,
            skippedCount: 0,
        };
    }
}

export async function removeStudentFromClass(
    classId: number,
    studentId: number
): Promise<{ success: boolean; message: string }> {
    try {
        const db = await getDatabase();
        await db.runAsync(
            "DELETE FROM class_students WHERE classId = ? AND studentId = ?",
            [classId, studentId]
        );
        return { success: true, message: "Student removed from class." };
    } catch (error) {
        console.error("Error removing student from class:", error);
        return { success: false, message: "Failed to remove student from class." };
    }
}
