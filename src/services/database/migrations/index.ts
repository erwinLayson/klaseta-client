import type { Migration } from "../types";
import { createUsersTable } from "./001_create_users_table";
import { createStudentsTable } from "./002_create_students_table";
import { alterStudentsTableNullable } from "./003_alter_students_table_nullable";

export const migrations: Migration[] = [
    createUsersTable,
    createStudentsTable,
    alterStudentsTableNullable,
];
