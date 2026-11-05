import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setupTestEnvironment, teardownTestEnvironment, seedTestTeacher } from "../helpers/testDatabase";
import {
    createClass,
    getClassesByTeacher,
    getClassById,
    updateClass,
    deleteClass,
    addStudentToClass,
    getStudentsByClass,
} from "../../src/services/pages/MyClassPages";
import { startNewSchoolYear, getActiveSchoolYear } from "../../src/services/pages/SchoolYearService";

describe("My Class & Student Assignment Services (Integration Tests)", () => {
    it("should validate and create class tagged with active school_year_id", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "mc_teacher1", "mc1@test.com");

            // Empty name validation
            const emptyRes = await createClass("mc_teacher1", { name: "   " });
            assert.strictEqual(emptyRes.success, false);
            assert.strictEqual(emptyRes.message, "Class name is required.");

            // Valid class creation
            const activeYear = await getActiveSchoolYear("mc_teacher1");
            const createRes = await createClass("mc_teacher1", {
                name: "Science 9",
                section: "Emerald",
                subject: "Physics",
                room: "Room 301",
            });

            assert.strictEqual(createRes.success, true);
            assert.ok(createRes.classId);

            const fetchedClass = await getClassById(createRes.classId);
            assert.ok(fetchedClass);
            assert.strictEqual(fetchedClass.name, "Science 9");
            assert.strictEqual(fetchedClass.section, "Emerald");
            assert.strictEqual(fetchedClass.school_year_id, activeYear?.id);
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should update and delete classes correctly", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "mc_teacher2", "mc2@test.com");
            const createRes = await createClass("mc_teacher2", { name: "Math 8" });
            assert.ok(createRes.classId);

            const updateRes = await updateClass({
                id: createRes.classId,
                name: "Advanced Math 8",
                section: "Sec A",
            });
            assert.strictEqual(updateRes.success, true);

            const updated = await getClassById(createRes.classId);
            assert.strictEqual(updated?.name, "Advanced Math 8");
            assert.strictEqual(updated?.section, "Sec A");

            const delRes = await deleteClass(createRes.classId);
            assert.strictEqual(delRes.success, true);

            const deleted = await getClassById(createRes.classId);
            assert.strictEqual(deleted, null);
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should add students to class and normalize suffixes", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "mc_teacher3", "mc3@test.com");
            const classRes = await createClass("mc_teacher3", { name: "English 10" });
            assert.ok(classRes.classId);

            const studentRes = await addStudentToClass("mc_teacher3", classRes.classId, {
                firstname: "Pedro",
                lastname: "Penduko",
                middlename: "Santos",
                suffix: "Junior",
            });
            assert.strictEqual(studentRes.success, true);

            const students = await getStudentsByClass(classRes.classId);
            assert.strictEqual(students.length, 1);
            assert.strictEqual(students[0].firstname, "Pedro");
            assert.strictEqual(students[0].lastname, "Penduko");
            assert.strictEqual(students[0].suffix, "Jr.");
        } finally {
            teardownTestEnvironment(testDb);
        }
    });

    it("should isolate class records between different school years", async () => {
        const testDb = await setupTestEnvironment();
        try {
            await seedTestTeacher(testDb, "mc_teacher4", "mc4@test.com");

            // Year 1 (2024-2025): Create 2 classes
            await createClass("mc_teacher4", { name: "Class Year 1 A" });
            await createClass("mc_teacher4", { name: "Class Year 1 B" });

            let classesYear1 = await getClassesByTeacher("mc_teacher4");
            assert.strictEqual(classesYear1.length, 2);

            // Transition to Year 2 (2025-2026)
            await startNewSchoolYear("mc_teacher4", {
                schoolYear: "2025-2026",
            });

            // In Year 2, getClassesByTeacher should only return Year 2 classes (currently 0)
            const classesYear2 = await getClassesByTeacher("mc_teacher4");
            assert.strictEqual(classesYear2.length, 0, "New school year should start with clean classroom list");

            // Create a new class in Year 2
            await createClass("mc_teacher4", { name: "Class Year 2 New" });
            const classesYear2After = await getClassesByTeacher("mc_teacher4");
            assert.strictEqual(classesYear2After.length, 1);
            assert.strictEqual(classesYear2After[0].name, "Class Year 2 New");
        } finally {
            teardownTestEnvironment(testDb);
        }
    });
});

