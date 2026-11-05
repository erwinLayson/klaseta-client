import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setupTestEnvironment, teardownTestEnvironment, seedTestTeacher } from "../helpers/testDatabase";
import { createClass, addStudentToClass } from "../../src/services/pages/MyClassPages";
import { createAssessment, getGradingWeights, saveAllAssessmentScores } from "../../src/services/pages/GradebookPages";
import { createAttendanceSession, saveAllAttendanceRecords } from "../../src/services/pages/AttendancePages";
import {
    markSchoolYearAsCompleted,
    getAcademicHistory,
    getAcademicRecordDetails,
    deleteAcademicRecord,
    deleteSchoolYearRecords,
} from "../../src/services/pages/AcademicHistoryPages";
import { startNewSchoolYear } from "../../src/services/pages/SchoolYearService";

describe("Academic History & Snapshot Archive (Integration Tests)", () => {
    it("should archive completed school year into academic_records and academic_student_records", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "ah_teacher1", "ah1@test.com");

            // Setup a class with a student, assessment, and attendance
            const classRes = await createClass("ah_teacher1", { name: "Grade 7 Math", section: "Einstein" });
            assert.ok(classRes.classId);

            await addStudentToClass("ah_teacher1", classRes.classId, { firstname: "Clara", lastname: "Oswald" });
            const student = await testDb.getFirstAsync<{ id: number }>("SELECT id FROM students WHERE lastname = 'Oswald'");
            assert.ok(student);

            const weights = await getGradingWeights("ah_teacher1", classRes.classId);
            const assessmentRes = await createAssessment("ah_teacher1", {
                title: "Midterm Exam",
                maxScore: 100,
                date: "2024-10-15",
                weightId: weights[1].id,
                classId: classRes.classId,
                quarter: "Q1",
            });
            assert.ok(assessmentRes.assessmentId);

            await saveAllAssessmentScores([
                { assessmentId: assessmentRes.assessmentId, studentId: student.id, score: 92 },
            ]);

            const sessionRes = await createAttendanceSession(
                "ah_teacher1",
                "2024-10-15",
                "Exam Day",
                classRes.classId,
                "Q1"
            );
            assert.ok(sessionRes.sessionId);

            await saveAllAttendanceRecords([
                { sessionId: sessionRes.sessionId, studentId: student.id, status: "1" },
            ]);

            // Mark school year as completed
            const markRes = await markSchoolYearAsCompleted("ah_teacher1", "2024-2025");
            assert.strictEqual(markRes.success, true);

            // Fetch academic history
            const history = await getAcademicHistory("ah_teacher1");
            assert.ok(history);
            assert.strictEqual(history.stats.totalYearsArchived, 1);
            assert.strictEqual(history.stats.totalClassesArchived, 1);
            assert.strictEqual(history.stats.totalStudentsRecorded, 1);
            assert.strictEqual(history.records.length, 1);

            const record = history.records[0];
            assert.strictEqual(record.className, "Grade 7 Math");
            assert.strictEqual(record.schoolYear, "2024-2025");
            assert.strictEqual(record.studentCount, 1);
            assert.strictEqual(record.passedCount, 1);
            assert.strictEqual(record.failedCount, 0);

            // Fetch record details
            const details = await getAcademicRecordDetails(record.id);
            assert.ok(details);
            assert.strictEqual(details.students.length, 1);
            const studentRecord = details.students[0];
            assert.strictEqual(studentRecord.studentName, "Clara Oswald");
            assert.strictEqual(studentRecord.remarks, "Passed");
            assert.ok(studentRecord.finalGrade && studentRecord.finalGrade > 0);
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should preserve historical records after activating a new school year", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "ah_teacher2", "ah2@test.com");

            const classRes = await createClass("ah_teacher2", { name: "Old Class 2024" });
            assert.ok(classRes.classId);
            await addStudentToClass("ah_teacher2", classRes.classId, { firstname: "Bob", lastname: "Smith" });

            // Complete 2024-2025
            await markSchoolYearAsCompleted("ah_teacher2", "2024-2025");

            // Start 2025-2026
            await startNewSchoolYear("ah_teacher2", {
                schoolYear: "2025-2026",
            });

            // Verify historical records are still intact and queryable
            const history = await getAcademicHistory("ah_teacher2");
            assert.ok(history);
            const archivedRecord = history.records.find((r) => r.schoolYear === "2024-2025");
            assert.ok(archivedRecord, "Historical record for 2024-2025 must remain accessible");
            assert.strictEqual(archivedRecord.className, "Old Class 2024");
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should permanently delete single academic record with cascades", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "ah_teacher3", "ah3@test.com");

            const classRes = await createClass("ah_teacher3", { name: "Class To Delete" });
            assert.ok(classRes.classId);
            await addStudentToClass("ah_teacher3", classRes.classId, { firstname: "Temp", lastname: "Student" });

            await markSchoolYearAsCompleted("ah_teacher3", "2024-2025");

            const history = await getAcademicHistory("ah_teacher3");
            assert.ok(history && history.records.length > 0);
            const recordId = history.records[0].id;

            // Delete record
            const delRes = await deleteAcademicRecord(recordId);
            assert.strictEqual(delRes.success, true);

            // Verify record and its child student records are gone
            const details = await getAcademicRecordDetails(recordId);
            assert.strictEqual(details, null);

            const childStudents = await testDb.getAllAsync(
                "SELECT * FROM academic_student_records WHERE recordId = ?",
                [recordId]
            );
            assert.strictEqual(childStudents.length, 0);
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should permanently delete all records for a school year", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "ah_teacher4", "ah4@test.com");

            const classRes = await createClass("ah_teacher4", { name: "Class To Delete All" });
            assert.ok(classRes.classId);
            await addStudentToClass("ah_teacher4", classRes.classId, { firstname: "Eve", lastname: "Polastri" });

            await markSchoolYearAsCompleted("ah_teacher4", "2024-2025");

            const delAllRes = await deleteSchoolYearRecords("ah_teacher4", "2024-2025");
            assert.strictEqual(delAllRes.success, true);

            const history = await getAcademicHistory("ah_teacher4");
            assert.ok(history);
            assert.strictEqual(history.records.length, 0);
        } finally {
            teardownTestEnvironment(testDb);
        }
    });
});

