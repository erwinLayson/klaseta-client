export interface ClassItem {
    id: number;
    teacherId: number;
    name: string;
    section?: string | null;
    subject?: string | null;
    room?: string | null;
    schedule?: string | null;
    color?: string | null;
    school_year_id?: number | null;
    createdAt?: string;
    studentCount?: number;
}

export interface CreateClassInput {
    name: string;
    section?: string;
    subject?: string;
    room?: string;
    schedule?: string;
    color?: string;
    school_year_id?: number;
}

export interface UpdateClassInput {
    id: number;
    name: string;
    section?: string;
    subject?: string;
    room?: string;
    schedule?: string;
    color?: string;
}

