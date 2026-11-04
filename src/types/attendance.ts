export type AttendanceStatus = "1" | "0" | "present" | "absent";

export interface AttendanceSession {
    id: number;
    date: string;
    title: string | null;
    teacherId: number;
    createdAt: string;
}

export interface AttendanceRecord {
    id: number;
    sessionId: number;
    studentId: number;
    status: string;
}

export interface CreateSessionInput {
    date: string;
    title?: string;
}
