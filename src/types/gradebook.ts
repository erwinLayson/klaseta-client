export interface GradingWeight {
    id: number;
    teacherId: number;
    classId?: number | null;
    school_year_id?: number | null;
    name: string;
    weight: number; // Percentage e.g. 30, 40, 50
    createdAt?: string;
}

export interface Assessment {
    id: number;
    teacherId: number;
    classId?: number | null;
    school_year_id?: number | null;
    weightId?: number | null;
    weightName?: string;
    weightPercent?: number;
    title: string;
    maxScore: number;
    date: string; // YYYY-MM-DD
    quarter?: string | null; // e.g. "Q1", "Q2", "Q3", "Q4"
    createdAt?: string;
}

export interface AssessmentScore {
    id: number;
    assessmentId: number;
    studentId: number;
    score: number;
}

export interface CreateAssessmentInput {
    title: string;
    maxScore: number;
    date: string;
    weightId?: number | null;
    classId?: number;
    quarter?: string;
    school_year_id?: number;
}

export interface UpdateAssessmentInput {
    id: number;
    title: string;
    maxScore: number;
    date: string;
    weightId?: number | null;
    classId?: number;
    quarter?: string;
}

export interface CreateGradingWeightInput {
    name: string;
    weight: number;
    classId?: number;
    school_year_id?: number;
}

export interface GradebookSpreadsheetData {
    students: import("./student").Student[];
    weights: GradingWeight[];
    assessments: Assessment[];
    scoresMap: Record<string, string>; // key: `${studentId}_${assessmentId}` -> score string
    attendanceMap: Record<number, { present: number; total: number; percentage: number }>;
}

export interface CategoryGradeBreakdown {
    weightId: number | null;
    weightName: string;
    weightPercent: number;
    totalScore: number;
    totalMaxScore: number;
    percentage: number;
    weightedContribution: number;
    assessmentCount: number;
}

export interface StudentCalculatedGrade {
    studentId: number;
    numericGrade: number | null;
    displayGrade: string;
    letterGrade: string;
    status: "passed" | "failed" | "unrecorded";
    statusLabel: string;
    breakdown: CategoryGradeBreakdown[];
    totalScoredAssessments: number;
    totalAssessments: number;
    attendance?: {
        present: number;
        total: number;
        percentage: number;
    };
}


