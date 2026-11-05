import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setupTestEnvironment, teardownTestEnvironment, seedTestTeacher } from "../helpers/testDatabase";
import {
    getUserProfile,
    updateUserProfile,
    updateUserPassword,
    getAcademicSettings,
    updateAcademicSettings,
    deleteUserAccount,
} from "../../src/services/pages/SettingsPages";
import { handleLogin } from "../../src/services/pages/LoginPages";
import { createClass, addStudentToClass } from "../../src/services/pages/MyClassPages";

describe("Settings & Profile Management Services (Integration Tests)", () => {
    it("should fetch user profile counts accurately", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "set_teacher1", "set1@test.com");

            const classRes = await createClass("set_teacher1", { name: "Class P" });
            assert.ok(classRes.classId);
            await addStudentToClass("set_teacher1", classRes.classId, { firstname: "Tom", lastname: "Riddle" });

            const profile = await getUserProfile("set_teacher1");
            assert.ok(profile);
            assert.strictEqual(profile.username, "set_teacher1");
            assert.strictEqual(profile.email, "set1@test.com");
            assert.strictEqual(profile.classCount, 1);
            assert.strictEqual(profile.studentCount, 1);
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should update user profile and prevent collisions with existing usernames/emails", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "user_alpha", "alpha@test.com");
            await seedTestTeacher(testDb, "user_beta", "beta@test.com");

            // Attempt to take existing username
            const dupUserRes = await updateUserProfile("user_alpha", {
                username: "user_beta",
                email: "alpha_new@test.com",
            });
            assert.strictEqual(dupUserRes.success, false);
            assert.ok(dupUserRes.message.includes("username is already taken"));

            // Attempt to take existing email
            const dupEmailRes = await updateUserProfile("user_alpha", {
                username: "user_alpha_renamed",
                email: "beta@test.com",
            });
            assert.strictEqual(dupEmailRes.success, false);
            assert.ok(dupEmailRes.message.includes("email address already exists"));

            // Valid profile update
            const validRes = await updateUserProfile("user_alpha", {
                username: "user_alpha_prime",
                email: "alpha_prime@test.com",
            });
            assert.strictEqual(validRes.success, true);
            assert.strictEqual(validRes.newUsername, "user_alpha_prime");

            // Verify update persisted
            const updatedProfile = await getUserProfile("user_alpha_prime");
            assert.ok(updatedProfile);
            assert.strictEqual(updatedProfile.username, "user_alpha_prime");
            assert.strictEqual(updatedProfile.email, "alpha_prime@test.com");
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should update academic settings including 3 or 4 quarter configuration", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "set_teacher2", "set2@test.com");

            // Update to 3 quarters and passing score 80
            const updateRes = await updateAcademicSettings("set_teacher2", {
                academicYear: "2024-2025",
                activeQuarter: "Q2",
                semester: "2nd Semester",
                passingScore: 80,
                quarterCount: 3,
            });
            assert.strictEqual(updateRes.success, true);

            const settings = await getAcademicSettings("set_teacher2");
            assert.ok(settings);
            assert.strictEqual(settings.activeQuarter, "Q2");
            assert.strictEqual(settings.semester, "2nd Semester");
            assert.strictEqual(settings.passingScore, 80);
            assert.strictEqual(settings.quarterCount, 3);
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should permanently delete user account and all cascaded data", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "set_teacher3", "set3@test.com");
            const classRes = await createClass("set_teacher3", { name: "Class To Burn" });
            assert.ok(classRes.classId);
            await addStudentToClass("set_teacher3", classRes.classId, { firstname: "Burn", lastname: "Student" });

            const delRes = await deleteUserAccount("set_teacher3");
            assert.strictEqual(delRes.success, true);

            // Verify teacher deleted
            const profile = await getUserProfile("set_teacher3");
            assert.strictEqual(profile, null);

            // Verify login fails
            const login = await handleLogin({ username: "set_teacher3", password: "Password123!" });
            assert.strictEqual(login.success, false);
        } finally {
            teardownTestEnvironment(testDb);
        }
    });
});

