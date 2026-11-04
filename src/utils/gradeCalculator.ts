import type {
    Assessment,
    GradingWeight,
    CategoryGradeBreakdown,
    StudentCalculatedGrade,
} from "../types/gradebook";

export function calculateStudentGrade(
    studentId: number,
    assessments: Assessment[],
    weights: GradingWeight[],
    scoresMap: Record<string, string>,
    attendance?: { present: number; total: number; percentage: number }
): StudentCalculatedGrade {
    // Group assessments by weightId
    const assessmentsByWeight = new Map<number | null, Assessment[]>();
    for (const a of assessments) {
        const list = assessmentsByWeight.get(a.weightId ?? null) || [];
        list.push(a);
        assessmentsByWeight.set(a.weightId ?? null, list);
    }

    const breakdown: CategoryGradeBreakdown[] = [];
    let totalScoredCount = 0;

    // Check if an Attendance category is configured in weights
    const attendanceWeightObj = weights.find((w) =>
        w.name.trim().toLowerCase().includes("attendance")
    );

    // Incorporate Attendance into the grade calculation
    if (attendance) {
        const attWeightPercent = attendanceWeightObj ? attendanceWeightObj.weight : 10;
        const attPercentage = attendance.total > 0 ? attendance.percentage : 100;
        const attContribution = (attPercentage * attWeightPercent) / 100;

        breakdown.push({
            weightId: attendanceWeightObj ? attendanceWeightObj.id : -1,
            weightName: attendanceWeightObj ? attendanceWeightObj.name : "Attendance",
            weightPercent: attWeightPercent,
            totalScore: attendance.present,
            totalMaxScore: Math.max(attendance.total, 1),
            percentage: Math.round(attPercentage * 10) / 10,
            weightedContribution: Math.round(attContribution * 10) / 10,
            assessmentCount: attendance.total,
        });

        if (attendance.total > 0) {
            totalScoredCount++;
        }
    }

    // Process each defined assessment weight category (skip attendance category since it's computed above)
    for (const w of weights) {
        if (attendanceWeightObj && w.id === attendanceWeightObj.id) {
            continue;
        }

        const catAssessments = assessmentsByWeight.get(w.id) || [];
        let catTotalScore = 0;
        let catTotalMax = 0;
        let scoredCount = 0;

        for (const a of catAssessments) {
            const key = `${studentId}_${a.id}`;
            const valStr = scoresMap[key];
            if (valStr !== undefined && valStr.trim() !== "") {
                const score = parseFloat(valStr);
                if (!isNaN(score) && score >= 0) {
                    catTotalScore += score;
                    catTotalMax += a.maxScore;
                    scoredCount++;
                    totalScoredCount++;
                }
            }
        }

        if (catTotalMax > 0 && scoredCount > 0) {
            const percentage = (catTotalScore / catTotalMax) * 100;
            const contribution = (percentage * w.weight) / 100;
            breakdown.push({
                weightId: w.id,
                weightName: w.name,
                weightPercent: w.weight,
                totalScore: catTotalScore,
                totalMaxScore: catTotalMax,
                percentage: Math.round(percentage * 10) / 10,
                weightedContribution: Math.round(contribution * 10) / 10,
                assessmentCount: scoredCount,
            });
        }
    }

    // Process uncategorized assessments (weightId == null) if any have scores
    const uncategorized = assessmentsByWeight.get(null) || [];
    let uncatTotalScore = 0;
    let uncatTotalMax = 0;
    let uncatScoredCount = 0;
    for (const a of uncategorized) {
        const key = `${studentId}_${a.id}`;
        const valStr = scoresMap[key];
        if (valStr !== undefined && valStr.trim() !== "") {
            const score = parseFloat(valStr);
            if (!isNaN(score) && score >= 0) {
                uncatTotalScore += score;
                uncatTotalMax += a.maxScore;
                uncatScoredCount++;
                totalScoredCount++;
            }
        }
    }

    if (uncatTotalMax > 0 && uncatScoredCount > 0) {
        const percentage = (uncatTotalScore / uncatTotalMax) * 100;
        breakdown.push({
            weightId: null,
            weightName: "Uncategorized",
            weightPercent: 0,
            totalScore: uncatTotalScore,
            totalMaxScore: uncatTotalMax,
            percentage: Math.round(percentage * 10) / 10,
            weightedContribution: 0,
            assessmentCount: uncatScoredCount,
        });
    }

    if (totalScoredCount === 0 || breakdown.length === 0) {
        return {
            studentId,
            numericGrade: null,
            displayGrade: "—",
            letterGrade: "N/A",
            status: "unrecorded",
            statusLabel: "No Scores",
            breakdown: [],
            totalScoredAssessments: 0,
            totalAssessments: assessments.length,
            attendance,
        };
    }

    // Calculate final grade
    let finalGradeNum: number;

    const weightedCategories = breakdown.filter((b) => b.weightPercent > 0);
    const sumActiveWeights = weightedCategories.reduce((s, b) => s + b.weightPercent, 0);

    if (weightedCategories.length > 0 && sumActiveWeights > 0) {
        // Weighted average normalized by sum of active weights
        const weightedSum = weightedCategories.reduce(
            (s, b) => s + (b.percentage * b.weightPercent),
            0
        );
        finalGradeNum = Math.round((weightedSum / sumActiveWeights) * 10) / 10;
    } else {
        // Simple overall percentage
        const totalScore = breakdown.reduce((s, b) => s + b.totalScore, 0);
        const totalMax = breakdown.reduce((s, b) => s + b.totalMaxScore, 0);
        finalGradeNum = totalMax > 0 ? Math.round(((totalScore / totalMax) * 100) * 10) / 10 : 0;
    }

    let letterGrade = "F";
    let status: "passed" | "failed" = "failed";
    let statusLabel = "Needs Improvement";

    if (finalGradeNum >= 90) {
        letterGrade = "A";
        status = "passed";
        statusLabel = "Outstanding";
    } else if (finalGradeNum >= 85) {
        letterGrade = "B+";
        status = "passed";
        statusLabel = "Very Satisfactory";
    } else if (finalGradeNum >= 80) {
        letterGrade = "B";
        status = "passed";
        statusLabel = "Satisfactory";
    } else if (finalGradeNum >= 75) {
        letterGrade = "C";
        status = "passed";
        statusLabel = "Passed";
    } else {
        letterGrade = "D";
        status = "failed";
        statusLabel = "Did Not Meet";
    }

    return {
        studentId,
        numericGrade: finalGradeNum,
        displayGrade: `${finalGradeNum}%`,
        letterGrade,
        status,
        statusLabel,
        breakdown,
        totalScoredAssessments: totalScoredCount,
        totalAssessments: assessments.length,
        attendance,
    };
}
