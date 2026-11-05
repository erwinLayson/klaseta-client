import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeSuffix, normalizeStudentRow } from "../../src/services/pages/MyClassPages";

describe("Name & Suffix Normalization (Unit Tests)", () => {
    it("should correctly normalize various suffix formats", () => {
        assert.strictEqual(normalizeSuffix("Jr"), "Jr.");
        assert.strictEqual(normalizeSuffix("jr."), "Jr.");
        assert.strictEqual(normalizeSuffix("Junior"), "Jr.");
        assert.strictEqual(normalizeSuffix("Sr"), "Sr.");
        assert.strictEqual(normalizeSuffix("Senior"), "Sr.");
        assert.strictEqual(normalizeSuffix("II"), "II");
        assert.strictEqual(normalizeSuffix("2nd"), "II");
        assert.strictEqual(normalizeSuffix("III"), "III");
        assert.strictEqual(normalizeSuffix("3rd"), "III");
        assert.strictEqual(normalizeSuffix("IV"), "IV");
        assert.strictEqual(normalizeSuffix("4th"), "IV");
        assert.strictEqual(normalizeSuffix("V"), "V");
        assert.strictEqual(normalizeSuffix("None"), null);
        assert.strictEqual(normalizeSuffix("n/a"), null);
        assert.strictEqual(normalizeSuffix("-"), null);
        assert.strictEqual(normalizeSuffix(""), null);
        assert.strictEqual(normalizeSuffix(null), null);
        assert.strictEqual(normalizeSuffix(undefined), null);
    });

    it("should normalize student row from various header formats", () => {
        // Standard snake_case
        const row1 = {
            first_name: "Juan",
            middle_name: "Dela",
            last_name: "Cruz",
            suffix: "Jr",
        };
        const student1 = normalizeStudentRow(row1);
        assert.ok(student1);
        assert.strictEqual(student1?.firstname, "Juan");
        assert.strictEqual(student1?.middlename, "Dela");
        assert.strictEqual(student1?.lastname, "Cruz");
        assert.strictEqual(student1?.suffix, "Jr.");

        // Case variations & space
        const row2 = {
            "First Name": "Maria",
            "M.I.": "S",
            "LastName": "Santos",
        };
        const student2 = normalizeStudentRow(row2);
        assert.ok(student2);
        assert.strictEqual(student2?.firstname, "Maria");
        assert.strictEqual(student2?.lastname, "Santos");

        // Missing required first or last name
        const row3 = {
            "First Name": "OnlyFirst",
        };
        assert.strictEqual(normalizeStudentRow(row3), null);

        const row4 = {
            "Last Name": "OnlyLast",
        };
        assert.strictEqual(normalizeStudentRow(row4), null);
    });
});
