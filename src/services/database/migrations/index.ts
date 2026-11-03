import type { Migration } from "../types";
import { createUsersTable } from "./001_create_users_table";
import { createStudentsTable } from "./002_create_students_table";

export const migrations: Migration[] = [
    createUsersTable,
    createStudentsTable,
];
