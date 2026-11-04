export interface Student {
    id: number;
    student_id: string | null;
    firstname: string;
    middlename: string | null;
    lastname: string;
    suffix: string | null;
    email: string | null;
    teacherId: number;
    classId?: number | null;
}

export interface AddStudentInput {
    firstname: string;
    middlename?: string;
    lastname: string;
    suffix?: string;
    classId?: number;
}


