import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setupTestEnvironment, teardownTestEnvironment } from "../helpers/testDatabase";

describe("Database Migrations & Schema Integrity", () => {
    it("should successfully run all 11 migrations on a fresh SQLite database", async () => {
        const testDb = await setupTestEnvironment();
        try {
            const versionRow = await testDb.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
            assert.strictEqual(versionRow?.user_version, 11, "Database should be at version 11");

            const tables = await testDb.getAllAsync<{ name: string }>(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
            );
            const tableNames = tables.map((t) => t.name);

            const expectedTables = [
                "academic_records",
                "academic_settings",
                "academic_student_records",
                "academic_years",
                "assessment_scores",
                "assessments",
                "attendance_records",
                "attendance_sessions",
                "class_students",
                "classes",
                "grading_weights",
                "school_year_audit_logs",
                "students",
                "users",
            ];

            for (const table of expectedTables) {
                assert.ok(tableNames.includes(table), `Table ${table} should exist in schema`);
            }
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should have school_year_id columns on all school-year-dependent tables", async () => {
        const testDb = await setupTestEnvironment();
        try {
            const checkColumn = async (table: string, column: string) => {
                const cols = await testDb.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
                const hasCol = cols.some((c) => c.name === column);
                assert.ok(hasCol, `Table ${table} should have column ${column}`);
            };

            await checkColumn("classes", "school_year_id");
            await checkColumn("class_students", "school_year_id");
            await checkColumn("attendance_sessions", "school_year_id");
            await checkColumn("grading_weights", "school_year_id");
            await checkColumn("assessments", "school_year_id");
            await checkColumn("academic_settings", "current_school_year_id");
            await checkColumn("academic_settings", "quarterCount");
            await checkColumn("academic_settings", "status");
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should enforce UNIQUE constraints and prevent duplicate entries", async () => {
        const testDb = await setupTestEnvironment();
        try {
            // 1. Unique email on users
            await testDb.runAsync("INSERT INTO users (username, email, password) VALUES ('user1', 'test@example.com', 'hash')");
            await assert.rejects(
                async () => {
                    await testDb.runAsync("INSERT INTO users (username, email, password) VALUES ('user2', 'test@example.com', 'hash')");
                },
                /UNIQUE constraint failed/i,
                "Inserting duplicate email should fail"
            );

            // 2. Unique (teacherId, schoolYear) on academic_years
            const user = await testDb.getFirstAsync<{ id: number }>("SELECT id FROM users WHERE username = 'user1'");
            assert.ok(user);
            await testDb.runAsync("INSERT INTO academic_years (teacherId, schoolYear, status) VALUES (?, '2024-2025', 'active')", [user.id]);
            await assert.rejects(
                async () => {
                    await testDb.runAsync("INSERT INTO academic_years (teacherId, schoolYear, status) VALUES (?, '2024-2025', 'active')", [user.id]);
                },
                /UNIQUE constraint failed/i,
                "Inserting duplicate school year for same teacher should fail"
            );
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should enforce transaction atomicity and roll back on error", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await testDb.runAsync("INSERT INTO users (username, email, password) VALUES ('tx_test', 'tx@test.com', 'hash')");
            const initialCount = (await testDb.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM users"))?.count;

            await assert.rejects(async () => {
                await testDb.withTransactionAsync(async () => {
                    await testDb.runAsync("INSERT INTO users (username, email, password) VALUES ('tx_sub', 'tx2@test.com', 'hash')");
                    // Intentionally throw error
                    throw new Error("Simulated transaction failure");
                });
            });

            const finalCount = (await testDb.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM users"))?.count;
            assert.strictEqual(finalCount, initialCount, "Transaction rollback must restore initial row count");
        } finally {
            teardownTestEnvironment(testDb);
        }
    });
});

