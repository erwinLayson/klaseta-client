import { getDatabase } from "../database/connection";
import type { ClassItem } from "../../types/class";
import { getAcademicSettings, type AcademicSettings } from "./SettingsPages";

export interface DashboardStats {
    totalClasses: number;
    totalStudents: number;
    totalAssessments: number;
    totalSessions: number;
    attendanceRate: number | null; // percentage e.g. 96.5, or null if no records
    todaySessionsCount: number;
}

export interface RecentActivityItem {
    id: string;
    type: "attendance" | "assessment" | "class";
    title: string;
    subtitle: string;
    date: string;
    rawDate?: string;
    quarter?: string;
    classId?: number;
    className?: string;
    badgeText: string;
    badgeColor: string;
}

export interface DashboardData {
    teacher: {
        id: number;
        username: string;
        email: string;
    };
    academicSettings: AcademicSettings | null;
    stats: DashboardStats;
    classes: ClassItem[];
    recentActivities: RecentActivityItem[];
    formattedToday: string;
    todayDate: string;
}

function getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getFormattedToday(): string {
    const now = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ];
    return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}

function formatDisplayDate(dateStr: string): string {
    if (!dateStr) return "";
    const today = getTodayDateString();
    if (dateStr === today) return "Today";

    const parts = dateStr.split("-");
    if (parts.length === 3) {
        const months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ];
        const mIdx = parseInt(parts[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
            return `${months[mIdx]} ${parseInt(parts[2], 10)}, ${parts[0]}`;
        }
    }
    return dateStr;
}

export async function getDashboardData(username: string): Promise<DashboardData | null> {
    try {
        const db = await getDatabase();

        const user = await db.getFirstAsync<{
            id: number;
            username: string;
            email: string;
        }>("SELECT id, username, email FROM users WHERE username = ?", [
            username.trim(),
        ]);

        if (!user) return null;
        const teacherId = user.id;

        // 1. Academic Settings
        const academicSettings = await getAcademicSettings(username);

        // 2. Classes with student counts
        const classes = await db.getAllAsync<ClassItem>(
            `SELECT c.*, 
                (SELECT COUNT(*) FROM class_students cs WHERE cs.classId = c.id) AS studentCount
             FROM classes c
             WHERE c.teacherId = ?
             ORDER BY c.id DESC`,
            [teacherId]
        );

        // 3. Counts: Students, Assessments, Sessions
        const studentRes = await db.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) as count FROM students WHERE teacherId = ?",
            [teacherId]
        );

        const assessmentRes = await db.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) as count FROM assessments WHERE teacherId = ?",
            [teacherId]
        );

        const sessionRes = await db.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) as count FROM attendance_sessions WHERE teacherId = ?",
            [teacherId]
        );

        // 4. Overall Attendance Rate
        const attendanceRes = await db.getFirstAsync<{
            totalRecords: number;
            presentCount: number;
        }>(
            `SELECT 
                COUNT(*) as totalRecords,
                SUM(CASE WHEN ar.status = '1' OR ar.status = 'present' THEN 1 ELSE 0 END) as presentCount
             FROM attendance_records ar
             JOIN attendance_sessions s ON ar.sessionId = s.id
             WHERE s.teacherId = ?`,
            [teacherId]
        );

        let attendanceRate: number | null = null;
        if (attendanceRes && attendanceRes.totalRecords > 0) {
            attendanceRate =
                Math.round(
                    ((attendanceRes.presentCount || 0) / attendanceRes.totalRecords) * 1000
                ) / 10;
        }

        // 5. Today's sessions count
        const todayDate = getTodayDateString();
        const todaySessionsRes = await db.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) as count FROM attendance_sessions WHERE teacherId = ? AND date = ?",
            [teacherId, todayDate]
        );

        // 6. Recent Activities
        const recentAttendance = await db.getAllAsync<{
            id: number;
            date: string;
            title: string | null;
            quarter: string | null;
            createdAt: string | null;
            classId: number | null;
            className: string | null;
        }>(
            `SELECT s.id, s.date, s.title, s.quarter, s.createdAt, s.classId, c.name as className
             FROM attendance_sessions s
             LEFT JOIN classes c ON s.classId = c.id
             WHERE s.teacherId = ?
             ORDER BY s.date DESC, s.id DESC
             LIMIT 4`,
            [teacherId]
        );

        const recentAssessments = await db.getAllAsync<{
            id: number;
            title: string;
            maxScore: number;
            date: string;
            quarter: string | null;
            createdAt: string | null;
            classId: number | null;
            className: string | null;
        }>(
            `SELECT a.id, a.title, a.maxScore, a.date, a.quarter, a.createdAt, a.classId, c.name as className
             FROM assessments a
             LEFT JOIN classes c ON a.classId = c.id
             WHERE a.teacherId = ?
             ORDER BY a.date DESC, a.id DESC
             LIMIT 4`,
            [teacherId]
        );

        const recentClasses = await db.getAllAsync<{
            id: number;
            name: string;
            section: string | null;
            color: string | null;
            createdAt: string | null;
            studentCount: number;
        }>(
            `SELECT c.id, c.name, c.section, c.color, c.createdAt,
                    (SELECT COUNT(*) FROM class_students cs WHERE cs.classId = c.id) as studentCount
             FROM classes c
             WHERE c.teacherId = ?
             ORDER BY c.id DESC
             LIMIT 3`,
            [teacherId]
        );

        const activities: RecentActivityItem[] = [];

        for (const item of recentAttendance) {
            activities.push({
                id: `att-${item.id}`,
                type: "attendance",
                title: item.title || (item.className ? `${item.className} Attendance` : "Daily Attendance"),
                subtitle: `${item.className ? item.className + " • " : ""}${formatDisplayDate(item.date)}`,
                date: item.date,
                rawDate: item.date,
                quarter: item.quarter || "Q1",
                classId: item.classId ?? undefined,
                className: item.className ?? undefined,
                badgeText: item.quarter || "Attendance",
                badgeColor: "#059669",
            });
        }

        for (const item of recentAssessments) {
            activities.push({
                id: `asm-${item.id}`,
                type: "assessment",
                title: item.title,
                subtitle: `${item.className ? item.className + " • " : ""}Max Score: ${item.maxScore}`,
                date: item.date,
                rawDate: item.date,
                quarter: item.quarter || "Q1",
                classId: item.classId ?? undefined,
                className: item.className ?? undefined,
                badgeText: item.quarter || "Assessment",
                badgeColor: "#4F46E5",
            });
        }

        for (const item of recentClasses) {
            const classDate = item.createdAt ? item.createdAt.slice(0, 10) : "";
            activities.push({
                id: `cls-${item.id}`,
                type: "class",
                title: `Created Class: ${item.name}`,
                subtitle: `${item.section ? item.section + " • " : ""}${item.studentCount} student(s) enrolled`,
                date: classDate,
                rawDate: classDate,
                classId: item.id,
                className: item.name,
                badgeText: "Class",
                badgeColor: item.color || "#2563EB",
            });
        }

        // Sort activities newest first
        activities.sort((a, b) => {
            if (a.rawDate && b.rawDate) {
                const cmp = b.rawDate.localeCompare(a.rawDate);
                if (cmp !== 0) return cmp;
            }
            return b.id.localeCompare(a.id);
        });

        const stats: DashboardStats = {
            totalClasses: classes.length,
            totalStudents: studentRes?.count ?? 0,
            totalAssessments: assessmentRes?.count ?? 0,
            totalSessions: sessionRes?.count ?? 0,
            attendanceRate,
            todaySessionsCount: todaySessionsRes?.count ?? 0,
        };

        return {
            teacher: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
            academicSettings,
            stats,
            classes: classes ?? [],
            recentActivities: activities.slice(0, 8),
            formattedToday: getFormattedToday(),
            todayDate,
        };
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return null;
    }
}

