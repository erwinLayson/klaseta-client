import type { Migration } from "../types";
import { createUsersTable } from "./001_create_users_table";

export const migrations: Migration[] = [
    createUsersTable,
];
