import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setupTestEnvironment, teardownTestEnvironment, seedTestTeacher } from "../helpers/testDatabase";
import { createClass, addStudentToClass } from "../../src/services/pages/MyClassPages";
import {
    createAttendanceSession,
    updateAttendanceSession,
    deleteAttendanceSession,
    getAttendanceSpreadsheet,
    saveAllAttendanceRecords,
    normalizeAttendanceValue,
} from "../../src/services/pages/AttendancePages";
import { startNewSchoolYear, getActiveSchoolYear } from "../../src/services/pages/SchoolYearService";

describe("Attendance Management Services (Integration Tests)", () => {
    it("should normalize attendance statuses correctly", () => {
        assert.strictEqual(normalizeAttendanceValue("1"), "1");
        assert.strictEqual(normalizeAttendanceValue("present"), "1");
        assert.strictEqual(normalizeAttendanceValue("0"), "0");
        assert.strictEqual(normalizeAttendanceValue("absent"), "0");
        assert.strictEqual(normalizeAttendanceValue(null), "1");
        assert.strictEqual(normalizeAttendanceValue(undefined), "1");
    });

    it("should validate and create attendance session tagged with quarter and school_year_id", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "att_teacher1", "att1@test.com");
            const classRes = await createClass("att_teacher1", { name: "Class Alpha" });
            assert.ok(classRes.classId);

            // Validation: Missing date
            const emptyDateRes = await createAttendanceSession("att_teacher1", "  ", "Morning Session", classRes.classId);
            assert.strictEqual(emptyDateRes.success, false);
            assert.ok(emptyDateRes.message.includes("Date is required"));

            // Validation: Missing class
            const noClassRes = await createAttendanceSession("att_teacher1", "2024-09-02", "Morning Session", 0);
            assert.strictEqual(noClassRes.success, false);
            assert.ok(noClassRes.message.includes("valid class must be selected"));

            // Valid creation
            const activeYear = await getActiveSchoolYear("att_teacher1");
            const sessionRes = await createAttendanceSession(
                "att_teacher1",
                "2024-09-02",
                "Day 1 Attendance",
                classRes.classId,
                "Q1"
            );

            assert.strictEqual(sessionRes.success, true);
            assert.ok(sessionRes.sessionId);

            // Verify session in database
            const session = await testDb.getFirstAsync<{
                id: number;
                title: string;
                quarter: string;
                school_year_id: number;
            }>("SELECT id, title, quarter, school_year_id FROM attendance_sessions WHERE id = ?", [sessionRes.sessionId]);

            assert.ok(session);
            assert.strictEqual(session.title, "Day 1 Attendance");
            assert.strictEqual(session.quarter, "Q1");
            assert.strictEqual(session.school_year_id, activeYear?.id);
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should record, update, and persist attendance statuses", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "att_teacher2", "att2@test.com");
            const classRes = await createClass("att_teacher2", { name: "Class Beta" });
            assert.ok(classRes.classId);

            await addStudentToClass("att_teacher2", classRes.classId, { firstname: "John", lastname: "Doe" });
            const student = await testDb.getFirstAsync<{ id: number }>("SELECT id FROM students WHERE lastname = 'Doe'");
            assert.ok(student);

            const sessionRes = await createAttendanceSession(
                "att_teacher2",
                "2024-09-03",
                "Day 2",
                classRes.classId,
                "Q1"
            );
            assert.ok(sessionRes.sessionId);

            // Save attendance record: Mark absent ("0")
            const saveRes = await saveAllAttendanceRecords([
                { sessionId: sessionRes.sessionId, studentId: student.id, status: "0" },
            ]);
            assert.strictEqual(saveRes, true);

            // Verify via spreadsheet
            const sheet = await getAttendanceSpreadsheet("att_teacher2", classRes.classId);
            assert.strictEqual(sheet.sessions.length, 1);
            assert.strictEqual(sheet.students.length, 1);
            assert.strictEqual(sheet.recordsMap[`${student.id}_${sessionRes.sessionId}`], "0");

            // Update to present ("1")
            await saveAllAttendanceRecords([
                { sessionId: sessionRes.sessionId, studentId: student.id, status: "1" },
            ]);
            const updatedSheet = await getAttendanceSpreadsheet("att_teacher2", classRes.classId);
            assert.strictEqual(updatedSheet.recordsMap[`${student.id}_${sessionRes.sessionId}`], "1");
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should isolate attendance sessions by school year", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "att_teacher3", "att3@test.com");

            // Year 1 (2024-2025)
            const classY1 = await createClass("att_teacher3", { name: "Year 1 Class" });
            assert.ok(classY1.classId);
            await createAttendanceSession("att_teacher3", "2024-09-05", "Y1 Session", classY1.classId, "Q1");

            const sheetY1 = await getAttendanceSpreadsheet("att_teacher3", classY1.classId);
            assert.strictEqual(sheetY1.sessions.length, 1);

            // Start Year 2 (2025-2026)
            await startNewSchoolYear("att_teacher3", {
                schoolYear: "2025-2026",
            });

            // Create new class in Year 2
            const classY2 = await createClass("att_teacher3", { name: "Year 2 Class" });
            assert.ok(classY2.classId);

            // Year 2 should have 0 attendance sessions initially
            const sheetY2 = await getAttendanceSpreadsheet("att_teacher3", classY2.classId);
            assert.strictEqual(sheetY2.sessions.length, 0, "New school year must start with clean attendance records");
        } finally {
            teardownTestEnvironment(testDb);
        }
    });
});

