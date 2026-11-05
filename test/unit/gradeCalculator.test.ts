import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateStudentGrade } from "../../src/utils/gradeCalculator";
import type { Assessment, GradingWeight } from "../../src/types/gradebook";

describe("Grade Calculator Utility (Unit Tests)", () => {
    const defaultWeights: GradingWeight[] = [
        { id: 1, teacherId: 1, name: "Attendance", weight: 10 },
        { id: 2, teacherId: 1, name: "Written Works", weight: 30 },
        { id: 3, teacherId: 1, name: "Performance Tasks", weight: 40 },
        { id: 4, teacherId: 1, name: "Quarterly Assessment", weight: 20 },
    ];

    it("should return unrecorded status when no scores exist", () => {
        const result = calculateStudentGrade(101, [], defaultWeights, {});
        assert.strictEqual(result.numericGrade, null);
        assert.strictEqual(result.displayGrade, "—");
        assert.strictEqual(result.letterGrade, "N/A");
        assert.strictEqual(result.status, "unrecorded");
        assert.strictEqual(result.statusLabel, "No Scores");
    });

    it("should correctly calculate weighted average and letter grade for outstanding performance", () => {
        const assessments: Assessment[] = [
            { id: 1, teacherId: 1, weightId: 2, title: "Quiz 1", maxScore: 50, date: "2024-09-01" },
            { id: 2, teacherId: 1, weightId: 3, title: "Project 1", maxScore: 100, date: "2024-09-10" },
            { id: 3, teacherId: 1, weightId: 4, title: "Exam 1", maxScore: 100, date: "2024-09-20" },
        ];

        // Quiz: 45/50 (90%), Project: 95/100 (95%), Exam: 90/100 (90%)
        // Attendance: 10/10 (100%)
        const scoresMap: Record<string, string> = {
            "101_1": "45",
            "101_2": "95",
            "101_3": "90",
        };

        const attendance = { present: 10, total: 10, percentage: 100 };

        const result = calculateStudentGrade(101, assessments, defaultWeights, scoresMap, attendance);

        // Expected:
        // Attendance: 100% * 10% = 10
        // Written: 90% * 30% = 27
        // Performance: 95% * 40% = 38
        // Quarterly: 90% * 20% = 18
        // Total = 10 + 27 + 38 + 18 = 93.0
        assert.strictEqual(result.numericGrade, 93);
        assert.strictEqual(result.displayGrade, "93%");
        assert.strictEqual(result.letterGrade, "A");
        assert.strictEqual(result.status, "passed");
        assert.strictEqual(result.statusLabel, "Outstanding");
    });

    it("should correctly handle failing grades and assign letter grade D", () => {
        const assessments: Assessment[] = [
            { id: 1, teacherId: 1, weightId: 2, title: "Quiz 1", maxScore: 100, date: "2024-09-01" },
            { id: 2, teacherId: 1, weightId: 3, title: "Project 1", maxScore: 100, date: "2024-09-10" },
            { id: 3, teacherId: 1, weightId: 4, title: "Exam 1", maxScore: 100, date: "2024-09-20" },
        ];

        // All 60%
        const scoresMap: Record<string, string> = {
            "102_1": "60",
            "102_2": "60",
            "102_3": "60",
        };

        const attendance = { present: 6, total: 10, percentage: 60 };

        const result = calculateStudentGrade(102, assessments, defaultWeights, scoresMap, attendance);
        assert.strictEqual(result.numericGrade, 60);
        assert.strictEqual(result.letterGrade, "D");
        assert.strictEqual(result.status, "failed");
        assert.strictEqual(result.statusLabel, "Did Not Meet");
    });

    it("should normalize weighted score when active weights do not sum to 100", () => {
        // Only Written Works (30%) and Attendance (10%) have assessments/records.
        // Sum of active weights = 40%
        const assessments: Assessment[] = [
            { id: 1, teacherId: 1, weightId: 2, title: "Quiz 1", maxScore: 100, date: "2024-09-01" },
        ];

        const scoresMap: Record<string, string> = {
            "103_1": "80", // 80% on Written Works
        };

        const attendance = { present: 10, total: 10, percentage: 100 }; // 100% on Attendance

        // Weighted sum = (100 * 10) + (80 * 30) = 1000 + 2400 = 3400
        // Normalized by sum of active weights (40) = 3400 / 40 = 85.0
        const result = calculateStudentGrade(103, assessments, defaultWeights, scoresMap, attendance);
        assert.strictEqual(result.numericGrade, 85);
        assert.strictEqual(result.letterGrade, "B+");
        assert.strictEqual(result.status, "passed");
        assert.strictEqual(result.statusLabel, "Very Satisfactory");
    });

    it("should ignore invalid non-numeric or negative scores safely", () => {
        const assessments: Assessment[] = [
            { id: 1, teacherId: 1, weightId: 2, title: "Quiz 1", maxScore: 50, date: "2024-09-01" },
        ];

        const scoresMap: Record<string, string> = {
            "104_1": "abc", // Invalid
        };

        const result = calculateStudentGrade(104, assessments, defaultWeights, scoresMap);
        assert.strictEqual(result.numericGrade, null);
        assert.strictEqual(result.status, "unrecorded");
    });
});

