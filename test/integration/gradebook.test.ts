import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setupTestEnvironment, teardownTestEnvironment, seedTestTeacher } from "../helpers/testDatabase";
import { createClass, addStudentToClass } from "../../src/services/pages/MyClassPages";
import {
    getGradingWeights,
    createGradingWeight,
    deleteGradingWeight,
    createAssessment,
    updateAssessment,
    deleteAssessment,
    getGradebookSpreadsheet,
    saveAllAssessmentScores,
} from "../../src/services/pages/GradebookPages";
import { startNewSchoolYear, getActiveSchoolYear } from "../../src/services/pages/SchoolYearService";

describe("Gradebook Management Services (Integration Tests)", () => {
    it("should auto-seed default weights for active school year", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "gb_teacher1", "gb1@test.com");
            const weights = await getGradingWeights("gb_teacher1");

            assert.strictEqual(weights.length, 4);
            const names = weights.map((w) => w.name);
            assert.ok(names.includes("Attendance"));
            assert.ok(names.includes("Written Works"));
            assert.ok(names.includes("Performance Tasks"));
            assert.ok(names.includes("Quarterly Assessment"));
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should validate and create assessments", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "gb_teacher2", "gb2@test.com");
            const classRes = await createClass("gb_teacher2", { name: "Class Gamma" });
            assert.ok(classRes.classId);

            // Empty title validation
            const emptyTitle = await createAssessment("gb_teacher2", {
                title: "  ",
                maxScore: 50,
                date: "2024-09-10",
                classId: classRes.classId,
            });
            assert.strictEqual(emptyTitle.success, false);
            assert.ok(emptyTitle.message.includes("title is required"));

            // Non-positive maxScore validation
            const zeroScore = await createAssessment("gb_teacher2", {
                title: "Quiz 1",
                maxScore: 0,
                date: "2024-09-10",
                classId: classRes.classId,
            });
            assert.strictEqual(zeroScore.success, false);
            assert.ok(zeroScore.message.includes("Max score must be greater than 0"));

            // Valid assessment
            const activeYear = await getActiveSchoolYear("gb_teacher2");
            const validRes = await createAssessment("gb_teacher2", {
                title: "Unit Test 1",
                maxScore: 100,
                date: "2024-09-10",
                quarter: "Q1",
                classId: classRes.classId,
            });
            assert.strictEqual(validRes.success, true);
            assert.ok(validRes.assessmentId);

            // Verify tagged with active school_year_id
            const aRow = await testDb.getFirstAsync<{ id: number; quarter: string; school_year_id: number }>(
                "SELECT id, quarter, school_year_id FROM assessments WHERE id = ?",
                [validRes.assessmentId]
            );
            assert.ok(aRow);
            assert.strictEqual(aRow.quarter, "Q1");
            assert.strictEqual(aRow.school_year_id, activeYear?.id);
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should record scores and calculate grades in gradebook spreadsheet", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "gb_teacher3", "gb3@test.com");
            const classRes = await createClass("gb_teacher3", { name: "Class Delta" });
            assert.ok(classRes.classId);

            await addStudentToClass("gb_teacher3", classRes.classId, { firstname: "Ana", lastname: "Reyes" });
            const student = await testDb.getFirstAsync<{ id: number }>("SELECT id FROM students WHERE lastname = 'Reyes'");
            assert.ok(student);

            const weights = await getGradingWeights("gb_teacher3", classRes.classId);
            const writtenWeight = weights.find((w) => w.name.includes("Written"));
            assert.ok(writtenWeight);

            const assessmentRes = await createAssessment("gb_teacher3", {
                title: "Written Exam 1",
                maxScore: 100,
                date: "2024-09-15",
                weightId: writtenWeight.id,
                classId: classRes.classId,
                quarter: "Q1",
            });
            assert.ok(assessmentRes.assessmentId);

            // Save score
            const saveRes = await saveAllAssessmentScores([
                { assessmentId: assessmentRes.assessmentId, studentId: student.id, score: 95 },
            ]);
            assert.strictEqual(saveRes, true);

            // Fetch spreadsheet
            const sheet = await getGradebookSpreadsheet("gb_teacher3", classRes.classId);
            assert.strictEqual(sheet.students.length, 1);
            assert.strictEqual(sheet.assessments.length, 1);
            assert.strictEqual(sheet.scoresMap[`${student.id}_${assessmentRes.assessmentId}`], "95");
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should isolate gradebook assessments across school years", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "gb_teacher4", "gb4@test.com");

            // Year 1 (2024-2025)
            const classY1 = await createClass("gb_teacher4", { name: "Year 1 Class" });
            assert.ok(classY1.classId);
            await createAssessment("gb_teacher4", {
                title: "Year 1 Quiz",
                maxScore: 50,
                date: "2024-09-12",
                classId: classY1.classId,
            });

            const sheetY1 = await getGradebookSpreadsheet("gb_teacher4", classY1.classId);
            assert.strictEqual(sheetY1.assessments.length, 1);

            // Start Year 2 (2025-2026)
            await startNewSchoolYear("gb_teacher4", {
                schoolYear: "2025-2026",
            });

            // Create new class in Year 2
            const classY2 = await createClass("gb_teacher4", { name: "Year 2 Class" });
            assert.ok(classY2.classId);

            // Year 2 should start with clean assessment list
            const sheetY2 = await getGradebookSpreadsheet("gb_teacher4", classY2.classId);
            assert.strictEqual(sheetY2.assessments.length, 0, "New school year must have clean assessment records");
        } finally {
            teardownTestEnvironment(testDb);
        }
    });
});

