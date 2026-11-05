import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setupTestEnvironment, teardownTestEnvironment, seedTestTeacher } from "../helpers/testDatabase";
import { createClass, addStudentToClass } from "../../src/services/pages/MyClassPages";
import { createAssessment } from "../../src/services/pages/GradebookPages";
import { createAttendanceSession } from "../../src/services/pages/AttendancePages";
import { getDashboardData } from "../../src/services/pages/DashboardPages";
import { startNewSchoolYear } from "../../src/services/pages/SchoolYearService";

describe("Dashboard Services (Integration Tests)", () => {
    it("should compute accurate stats and recent activities scoped to active school year", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "dash_teacher1", "dash1@test.com");

            // Initial state: empty stats
            const initialData = await getDashboardData("dash_teacher1");
            assert.ok(initialData);
            assert.strictEqual(initialData.stats.totalClasses, 0);
            assert.strictEqual(initialData.stats.totalStudents, 0);
            assert.strictEqual(initialData.stats.totalAssessments, 0);
            assert.strictEqual(initialData.stats.totalSessions, 0);
            assert.strictEqual(initialData.stats.attendanceRate, null);

            // Add class, student, session, assessment
            const classRes = await createClass("dash_teacher1", { name: "Grade 9 Biology" });
            assert.ok(classRes.classId);

            await addStudentToClass("dash_teacher1", classRes.classId, { firstname: "Luke", lastname: "Skywalker" });

            await createAttendanceSession("dash_teacher1", "2024-09-01", "Orientation", classRes.classId, "Q1");
            await createAssessment("dash_teacher1", {
                title: "Quiz 1",
                maxScore: 20,
                date: "2024-09-02",
                classId: classRes.classId,
                quarter: "Q1",
            });

            // Verify updated stats
            const updatedData = await getDashboardData("dash_teacher1");
            assert.ok(updatedData);
            assert.strictEqual(updatedData.stats.totalClasses, 1);
            assert.strictEqual(updatedData.stats.totalStudents, 1);
            assert.strictEqual(updatedData.stats.totalAssessments, 1);
            assert.strictEqual(updatedData.stats.totalSessions, 1);
            assert.ok(updatedData.recentActivities.length > 0);
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should isolate dashboard metrics when starting a new school year", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "dash_teacher2", "dash2@test.com");

            const classRes = await createClass("dash_teacher2", { name: "Year 1 Math" });
            assert.ok(classRes.classId);
            await addStudentToClass("dash_teacher2", classRes.classId, { firstname: "Leia", lastname: "Organa" });

            const dataY1 = await getDashboardData("dash_teacher2");
            assert.strictEqual(dataY1?.stats.totalClasses, 1);

            // Transition to new school year
            await startNewSchoolYear("dash_teacher2", {
                schoolYear: "2025-2026",
            });

            // Dashboard for new school year should show 0 classes and 0 students
            const dataY2 = await getDashboardData("dash_teacher2");
            assert.ok(dataY2);
            assert.strictEqual(dataY2.stats.totalClasses, 0);
            assert.strictEqual(dataY2.stats.totalStudents, 0);
            assert.strictEqual(dataY2.academicSettings?.academicYear, "2025-2026");
        } finally {
            teardownTestEnvironment(testDb);
        }
    });
});

