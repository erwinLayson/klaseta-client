import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setupTestEnvironment, teardownTestEnvironment, seedTestTeacher } from "../helpers/testDatabase";
import {
    createSchoolYear,
    startNewSchoolYear,
    getActiveSchoolYear,
    getAllSchoolYears,
    getSchoolYearAuditLogs,
} from "../../src/services/pages/SchoolYearService";
import { markSchoolYearAsCompleted } from "../../src/services/pages/AcademicHistoryPages";

describe("School Year Management Service (Integration Tests)", () => {
    it("should fetch active school year for seeded teacher", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "sy_teacher1", "sy1@test.com");
            const activeYear = await getActiveSchoolYear("sy_teacher1");

            assert.ok(activeYear);
            assert.strictEqual(activeYear.schoolYear, "2024-2025");
            assert.strictEqual(activeYear.semester, "1st Semester");
            assert.strictEqual(activeYear.quarterCount, 4);
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should create a new pending school year and prevent duplicates", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "sy_teacher2", "sy2@test.com");

            const createRes = await createSchoolYear("sy_teacher2", {
                schoolYear: "2025-2026",
                semester: "1st Semester",
                quarterCount: 4,
            });

            assert.strictEqual(createRes.success, true);
            assert.ok(createRes.schoolYearId);

            // Verify duplicate rejection
            const dupRes = await createSchoolYear("sy_teacher2", {
                schoolYear: "2025-2026",
            });
            assert.strictEqual(dupRes.success, false);
            assert.ok(dupRes.message.includes("already exists"));
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should reject starting a school year that is already active", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "sy_teacher3", "sy3@test.com");

            const res = await startNewSchoolYear("sy_teacher3", {
                schoolYear: "2024-2025",
            });

            assert.strictEqual(res.success, false);
            assert.ok(res.message.includes("already currently active"));
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should reject starting a school year that has already been marked as completed", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "sy_teacher4", "sy4@test.com");

            // Mark 2024-2025 as completed
            const completeRes = await markSchoolYearAsCompleted("sy_teacher4", "2024-2025");
            assert.strictEqual(completeRes.success, true);

            // Attempt to restart completed 2024-2025
            const restartRes = await startNewSchoolYear("sy_teacher4", {
                schoolYear: "2024-2025",
            });

            assert.strictEqual(restartRes.success, false);
            assert.ok(restartRes.message.includes("marked as completed"));
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should start a new school year, archive previous active year, and record audit log", async () => {
        const testDb = await setupTestEnvironment();
        try {
            const teacher = await seedTestTeacher(testDb, "sy_teacher5", "sy5@test.com");

            // Insert a class in 2024-2025
            const activeYear = await getActiveSchoolYear("sy_teacher5");
            assert.ok(activeYear);
            await testDb.runAsync(
                "INSERT INTO classes (teacherId, name, school_year_id) VALUES (?, 'Grade 10 Math', ?)",
                [teacher.id, activeYear.id]
            );

            // Start new school year 2025-2026
            const startRes = await startNewSchoolYear("sy_teacher5", {
                schoolYear: "2025-2026",
                semester: "1st Semester",
                quarterCount: 3,
                archivePreviousIfActive: true,
                copyGradingWeights: true,
            });

            assert.strictEqual(startRes.success, true);
            assert.ok(startRes.schoolYearId);

            // Verify active school year is now 2025-2026
            const newActive = await getActiveSchoolYear("sy_teacher5");
            assert.ok(newActive);
            assert.strictEqual(newActive.schoolYear, "2025-2026");
            assert.strictEqual(newActive.quarterCount, 3);
            assert.strictEqual(newActive.id, startRes.schoolYearId);

            // Verify previous year is marked as completed
            const allYears = await getAllSchoolYears("sy_teacher5");
            const oldYear = allYears.find((y) => y.schoolYear === "2024-2025");
            assert.ok(oldYear);
            assert.strictEqual(oldYear.status, "completed");

            // Verify audit logs
            const logs = await getSchoolYearAuditLogs("sy_teacher5");
            assert.ok(logs.length > 0);
            const activatedLog = logs.find((l) => l.action === "ACTIVATED");
            assert.ok(activatedLog);
            assert.strictEqual(activatedLog.schoolYear, "2025-2026");
            assert.strictEqual(activatedLog.performedBy, "sy_teacher5");
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should start a new school year with an initial class in a single transaction", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "sy_teacher6", "sy6@test.com");

            const startRes = await startNewSchoolYear("sy_teacher6", {
                schoolYear: "2025-2026",
                semester: "1st Semester",
                quarterCount: 4,
                initialClass: {
                    name: "Grade 9 - Diamond",
                    section: "Section A",
                    subject: "General Science",
                },
            });

            assert.strictEqual(startRes.success, true);
            assert.ok(startRes.schoolYearId);
            assert.ok(startRes.classId);

            // Verify class exists and is linked to the new school year
            const createdClass = await testDb.getFirstAsync<{ id: number; name: string; section: string; school_year_id: number }>(
                "SELECT * FROM classes WHERE id = ?",
                [startRes.classId]
            );
            assert.ok(createdClass);
            assert.strictEqual(createdClass.name, "Grade 9 - Diamond");
            assert.strictEqual(createdClass.section, "Section A");
            assert.strictEqual(createdClass.school_year_id, startRes.schoolYearId);
        } finally {
            teardownTestEnvironment(testDb);
        }
    });
});

