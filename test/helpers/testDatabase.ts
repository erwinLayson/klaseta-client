import { DatabaseSync } from "node:sqlite";
import { runMigrations } from "../../src/services/database/migrationRunner";
import { setDatabaseInstance, resetDatabaseInstance } from "../../src/services/database/connection";
import { bcrypt } from "../../src/services/auth/bcryptSetup";

export interface TestDbWrapper {
    execAsync: (sql: string) => Promise<void>;
    getFirstAsync: <T>(sql: string, params?: any[]) => Promise<T | null>;
    getAllAsync: <T>(sql: string, params?: any[]) => Promise<T[]>;
    runAsync: (sql: string, params?: any[]) => Promise<{ lastInsertRowId: number; changes: number }>;
    withTransactionAsync: <T>(task: () => Promise<T>) => Promise<T>;
    close: () => void;
    raw: DatabaseSync;
}

let savepointCounter = 0;

export function createIsolatedDatabase(): TestDbWrapper {
    const rawDb = new DatabaseSync(":memory:");
    rawDb.exec("PRAGMA foreign_keys = ON;");

    const wrapper: TestDbWrapper = {
        execAsync: async (sql: string) => {
            rawDb.exec(sql);
        },
        getFirstAsync: async <T>(sql: string, params: any[] = []): Promise<T | null> => {
            const stmt = rawDb.prepare(sql);
            const row = stmt.get(...params);
            if (row === undefined) return null;
            return row as T;
        },
        getAllAsync: async <T>(sql: string, params: any[] = []): Promise<T[]> => {
            const stmt = rawDb.prepare(sql);
            const rows = stmt.all(...params);
            return (rows ?? []) as T[];
        },
        runAsync: async (sql: string, params: any[] = []): Promise<{ lastInsertRowId: number; changes: number }> => {
            const stmt = rawDb.prepare(sql);
            const res = stmt.run(...params);
            return {
                lastInsertRowId: Number(res.lastInsertRowid),
                changes: res.changes,
            };
        },
        withTransactionAsync: async <T>(task: () => Promise<T>): Promise<T> => {
            savepointCounter++;
            const spName = `sp_test_${savepointCounter}`;
            rawDb.exec(`SAVEPOINT ${spName};`);
            try {
                const result = await task();
                rawDb.exec(`RELEASE SAVEPOINT ${spName};`);
                return result;
            } catch (err) {
                rawDb.exec(`ROLLBACK TO SAVEPOINT ${spName};`);
                throw err;
            }
        },
        close: () => {
            try {
                rawDb.close();
            } catch {
                // ignore
            }
        },
        raw: rawDb,
    };

    return wrapper;
}

export async function setupTestEnvironment(): Promise<TestDbWrapper> {
    const testDb = createIsolatedDatabase();
    setDatabaseInstance(testDb as any);
    await runMigrations(testDb as any);
    return testDb;
}

export function teardownTestEnvironment(testDb: TestDbWrapper) {
    resetDatabaseInstance();
    testDb.close();
}

export async function seedTestTeacher(
    testDb: TestDbWrapper,
    username: string = "test_teacher",
    email: string = "teacher@test.local",
    password: string = "Password123!"
): Promise<{ id: number; username: string; email: string }> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await testDb.runAsync(
        "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
        [username, email, hashedPassword]
    );

    const teacherId = result.lastInsertRowId;

    // Seed academic settings and academic_years entry
    await testDb.runAsync(
        `INSERT INTO academic_settings (teacherId, academicYear, activeQuarter, semester, passingScore, quarterCount, status)
         VALUES (?, '2024-2025', 'Q1', '1st Semester', 75.0, 4, 'active')`,
        [teacherId]
    );

    const yearRes = await testDb.runAsync(
        `INSERT INTO academic_years (teacherId, schoolYear, semester, quarterCount, status)
         VALUES (?, '2024-2025', '1st Semester', 4, 'active')`,
        [teacherId]
    );

    await testDb.runAsync(
        "UPDATE academic_settings SET current_school_year_id = ? WHERE teacherId = ?",
        [yearRes.lastInsertRowId, teacherId]
    );

    return { id: teacherId, username, email };
}

