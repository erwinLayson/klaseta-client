import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setupTestEnvironment, teardownTestEnvironment, seedTestTeacher } from "../helpers/testDatabase";
import { handleLogin } from "../../src/services/pages/LoginPages";
import { createClass, addStudentToClass, getClassesByTeacher, getStudentsByClass } from "../../src/services/pages/MyClassPages";
import {
    createAttendanceSession,
    saveAllAttendanceRecords,
    getAttendanceSpreadsheet,
} from "../../src/services/pages/AttendancePages";
import {
    getGradingWeights,
    createAssessment,
    saveAllAssessmentScores,
    getGradebookSpreadsheet,
} from "../../src/services/pages/GradebookPages";
import {
    markSchoolYearAsCompleted,
    getAcademicHistory,
    getAcademicRecordDetails,
} from "../../src/services/pages/AcademicHistoryPages";
import {
    startNewSchoolYear,
    getActiveSchoolYear,
    getAllSchoolYears,
    getSchoolYearAuditLogs,
} from "../../src/services/pages/SchoolYearService";

describe("Complete End-to-End Academic Lifecycle Workflow (E2E)", () => {
    it("should execute the complete 15-step academic year transition & preservation workflow", async () => {
        const testDb = await setupTestEnvironment();
        try {
            const username = "e2e_prof";
            const email = "e2e@school.edu";
            const password = "Password123!";

            // Precondition: Seed teacher account
            await seedTestTeacher(testDb, username, email, password);

            // Verify teacher can login
            const login = await handleLogin({ username, password });
            assert.strictEqual(login.success, true);

            // Step 1: Active school year begins at 2024-2025
            const sy1 = await getActiveSchoolYear(username);
            assert.ok(sy1);
            assert.strictEqual(sy1!.schoolYear, "2024-2025");

            // Step 2: Create classrooms in 2024-2025
            const class1 = await createClass(username, { name: "Grade 10 - Section Newton", subject: "Science" });
            const class2 = await createClass(username, { name: "Grade 10 - Section Galileo", subject: "Math" });
            assert.ok(class1.classId);
            assert.ok(class2.classId);

            // Step 3 & 4: Enroll students and assign them to respective classes
            await addStudentToClass(username, class1.classId!, { firstname: "Ada", lastname: "Lovelace" });
            await addStudentToClass(username, class1.classId!, { firstname: "Charles", lastname: "Babbage" });
            await addStudentToClass(username, class2.classId!, { firstname: "Alan", lastname: "Turing" });

            const studentsClass1 = await getStudentsByClass(class1.classId!);
            const studentsClass2 = await getStudentsByClass(class2.classId!);
            assert.strictEqual(studentsClass1.length, 2);
            assert.strictEqual(studentsClass2.length, 1);

            const ada = studentsClass1.find((s) => s.lastname === "Lovelace");
            const charles = studentsClass1.find((s) => s.lastname === "Babbage");
            assert.ok(ada);
            assert.ok(charles);

            // Step 5: Record student attendance in Class 1
            const session1 = await createAttendanceSession(username, "2024-10-01", "Day 1", class1.classId!, "Q1");
            const session2 = await createAttendanceSession(username, "2024-10-02", "Day 2", class1.classId!, "Q1");
            assert.ok(session1.sessionId);
            assert.ok(session2.sessionId);

            // Ada: present both days (100%), Charles: present 1 day (50%)
            await saveAllAttendanceRecords([
                { sessionId: session1.sessionId!, studentId: ada!.id, status: "1" },
                { sessionId: session2.sessionId!, studentId: ada!.id, status: "1" },
                { sessionId: session1.sessionId!, studentId: charles!.id, status: "1" },
                { sessionId: session2.sessionId!, studentId: charles!.id, status: "0" },
            ]);

            const attSheet = await getAttendanceSpreadsheet(username, class1.classId!);
            assert.strictEqual(attSheet.sessions.length, 2);
            assert.strictEqual(attSheet.recordsMap[`${charles!.id}_${session2.sessionId}`], "0");

            // Step 6: Grading weights (auto-seeded)
            const weights = await getGradingWeights(username, class1.classId!);
            const writtenWeight = weights.find((w) => w.name.includes("Written"));
            const perfWeight = weights.find((w) => w.name.includes("Performance"));
            assert.ok(writtenWeight);
            assert.ok(perfWeight);

            // Step 7: Add activities and assessments
            const quiz1 = await createAssessment(username, {
                title: "Quiz 1",
                maxScore: 50,
                date: "2024-10-05",
                weightId: writtenWeight!.id,
                classId: class1.classId!,
                quarter: "Q1",
            });
            const task1 = await createAssessment(username, {
                title: "Laboratory Experiment",
                maxScore: 100,
                date: "2024-10-12",
                weightId: perfWeight!.id,
                classId: class1.classId!,
                quarter: "Q1",
            });
            assert.ok(quiz1.assessmentId);
            assert.ok(task1.assessmentId);

            // Step 8: Enter student grades
            // Ada: Quiz 50/50 (100%), Lab 95/100 (95%)
            // Charles: Quiz 30/50 (60%), Lab 65/100 (65%)
            await saveAllAssessmentScores([
                { assessmentId: quiz1.assessmentId!, studentId: ada!.id, score: 50 },
                { assessmentId: task1.assessmentId!, studentId: ada!.id, score: 95 },
                { assessmentId: quiz1.assessmentId!, studentId: charles!.id, score: 30 },
                { assessmentId: task1.assessmentId!, studentId: charles!.id, score: 65 },
            ]);

            // Step 9: Verify gradebook spreadsheet and calculations
            const gbSheet = await getGradebookSpreadsheet(username, class1.classId!);
            assert.strictEqual(gbSheet.students.length, 2);
            assert.strictEqual(gbSheet.assessments.length, 2);
            assert.strictEqual(gbSheet.scoresMap[`${ada!.id}_${quiz1.assessmentId}`], "50");

            // Step 10: Complete the school year 2024-2025
            const completeRes = await markSchoolYearAsCompleted(username, "2024-2025");
            assert.strictEqual(completeRes.success, true);

            // Step 11: Verify previous academic records are preserved in Academic History
            const historyAfterComplete = await getAcademicHistory(username);
            assert.ok(historyAfterComplete);
            assert.strictEqual(historyAfterComplete!.stats.totalYearsArchived, 1);
            assert.strictEqual(historyAfterComplete!.records.length, 2); // 2 classes archived

            const archivedNewton = historyAfterComplete!.records.find((r) => r.className === "Grade 10 - Section Newton");
            assert.ok(archivedNewton);
            assert.strictEqual(archivedNewton!.studentCount, 2);

            const recordDetails = await getAcademicRecordDetails(archivedNewton!.id);
            assert.ok(recordDetails);
            assert.strictEqual(recordDetails!.students.length, 2);

            const adaRecord = recordDetails!.students.find((s) => s.studentName.includes("Ada"));
            assert.ok(adaRecord);
            assert.strictEqual(adaRecord!.remarks, "Passed");

            // Step 12 & 13: Create and Start a new school year 2025-2026
            const startNewRes = await startNewSchoolYear(username, {
                schoolYear: "2025-2026",
                semester: "1st Semester",
                quarterCount: 4,
            });
            assert.strictEqual(startNewRes.success, true);

            // Step 14: Verify My Class, Attendance, and Gradebook contain clean new school year operational data
            const activeSY = await getActiveSchoolYear(username);
            assert.ok(activeSY);
            assert.strictEqual(activeSY!.schoolYear, "2025-2026");

            // Classes for new year should be 0
            const classesNewYear = await getClassesByTeacher(username);
            assert.strictEqual(classesNewYear.length, 0, "My Class must have 0 classes in newly activated school year");

            // Create a brand new class in 2025-2026
            const newClassRes = await createClass(username, { name: "Grade 11 - Section Tesla" });
            assert.ok(newClassRes.classId);

            const classesAfterAdd = await getClassesByTeacher(username);
            assert.strictEqual(classesAfterAdd.length, 1);
            assert.strictEqual(classesAfterAdd[0].name, "Grade 11 - Section Tesla");

            // Attendance and Gradebook for new class should be completely clean
            const newAttSheet = await getAttendanceSpreadsheet(username, newClassRes.classId!);
            assert.strictEqual(newAttSheet.sessions.length, 0);

            const newGbSheet = await getGradebookSpreadsheet(username, newClassRes.classId!);
            assert.strictEqual(newGbSheet.assessments.length, 0);

            // Step 15: Verify historical 2024-2025 records remain fully intact and accessible through Academic History
            const finalHistory = await getAcademicHistory(username);
            assert.ok(finalHistory);
            assert.strictEqual(finalHistory!.records.length, 2);
            assert.ok(finalHistory!.records.some((r) => r.schoolYear === "2024-2025"));

            // Verify audit logs record the activation
            const auditLogs = await getSchoolYearAuditLogs(username);
            assert.ok(auditLogs.length > 0);
            assert.ok(auditLogs.some((l) => l.schoolYear === "2025-2026" && l.action === "ACTIVATED"));
        } finally {
            teardownTestEnvironment(testDb);
        }
    });
});
