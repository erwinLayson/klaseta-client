import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setupTestEnvironment, teardownTestEnvironment } from "../helpers/testDatabase";
import { handleRegister } from "../../src/services/pages/RegisterPages";
import { handleLogin } from "../../src/services/pages/LoginPages";
import { updateUserPassword, updateUserProfile } from "../../src/services/pages/SettingsPages";

describe("Authentication & Account Services (Integration Tests)", () => {
    it("should successfully register a new user and allow login", async () => {
        const testDb = await setupTestEnvironment();
        try {
            const regResult = await handleRegister({
                username: "prof_alice",
                email: "alice@school.edu",
                password: "SecurePassword123!",
                confirmPassword: "SecurePassword123!",
            });

            assert.strictEqual(regResult.success, true);
            assert.strictEqual(regResult.message, "Account created successfully!");

            // Test login
            const loginResult = await handleLogin({
                username: "prof_alice",
                password: "SecurePassword123!",
            });

            assert.strictEqual(loginResult.success, true);
            assert.strictEqual(loginResult.username, "prof_alice");
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should reject registration with invalid fields", async () => {
        const testDb = await setupTestEnvironment();
        try {
            // Short password
            const resShort = await handleRegister({
                username: "user_short",
                email: "short@school.edu",
                password: "123",
                confirmPassword: "123",
            });
            assert.strictEqual(resShort.success, false);
            assert.ok(resShort.message.includes("at least 6 characters"));

            // Mismatched passwords
            const resMismatch = await handleRegister({
                username: "user_mis",
                email: "mis@school.edu",
                password: "Password1!",
                confirmPassword: "Password2!",
            });
            assert.strictEqual(resMismatch.success, false);
            assert.ok(resMismatch.message.includes("do not match"));

            // Invalid email
            const resEmail = await handleRegister({
                username: "user_bad_email",
                email: "not-an-email",
                password: "Password1!",
                confirmPassword: "Password1!",
            });
            assert.strictEqual(resEmail.success, false);
            assert.ok(resEmail.message.includes("valid email"));
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should reject duplicate email during registration", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await handleRegister({
                username: "teacher_one",
                email: "common@school.edu",
                password: "Password123!",
                confirmPassword: "Password123!",
            });

            const duplicate = await handleRegister({
                username: "teacher_two",
                email: "common@school.edu",
                password: "Password123!",
                confirmPassword: "Password123!",
            });

            assert.strictEqual(duplicate.success, false);
            assert.ok(duplicate.message.includes("email already exists"));
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should reject duplicate username during registration", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await handleRegister({
                username: "unique_teacher",
                email: "email1@school.edu",
                password: "Password123!",
                confirmPassword: "Password123!",
            });

            const duplicateUser = await handleRegister({
                username: "unique_teacher",
                email: "email2@school.edu",
                password: "Password123!",
                confirmPassword: "Password123!",
            });

            assert.strictEqual(duplicateUser.success, false, "Should reject duplicate username");
            assert.ok(duplicateUser.message.toLowerCase().includes("username"), "Message should mention username");
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should reject login with wrong password or nonexistent username", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await handleRegister({
                username: "valid_user",
                email: "valid@school.edu",
                password: "CorrectPassword123",
                confirmPassword: "CorrectPassword123",
            });

            // Wrong password
            const wrongPass = await handleLogin({
                username: "valid_user",
                password: "WrongPassword456",
            });
            assert.strictEqual(wrongPass.success, false);
            assert.ok(wrongPass.message.includes("Incorrect password"));

            // Nonexistent user
            const noUser = await handleLogin({
                username: "ghost_user",
                password: "AnyPassword",
            });
            assert.strictEqual(noUser.success, false);
            assert.ok(noUser.message.includes("Account not found"));
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should update password when current password is verified", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await handleRegister({
                username: "pass_user",
                email: "pass@school.edu",
                password: "OldPassword123",
                confirmPassword: "OldPassword123",
            });

            // Fail with wrong current password
            const failRes = await updateUserPassword("pass_user", {
                currentPassword: "BadCurrentPassword",
                newPassword: "NewPassword123",
                confirmPassword: "NewPassword123",
            });
            assert.strictEqual(failRes.success, false);
            assert.ok(failRes.message.includes("current password you entered is incorrect"));

            // Succeed with correct current password
            const successRes = await updateUserPassword("pass_user", {
                currentPassword: "OldPassword123",
                newPassword: "NewPassword123",
                confirmPassword: "NewPassword123",
            });
            assert.strictEqual(successRes.success, true);

            // Verify can login with new password
            const newLogin = await handleLogin({
                username: "pass_user",
                password: "NewPassword123",
            });
            assert.strictEqual(newLogin.success, true);
        } finally {
            teardownTestEnvironment(testDb);
        }
    });
});

