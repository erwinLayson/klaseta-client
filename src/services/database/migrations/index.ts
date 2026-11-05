import type { Migration } from "../types";
import { createUsersTable } from "./001_create_users_table";
import { createStudentsTable } from "./002_create_students_table";
import { alterStudentsTableNullable } from "./003_alter_students_table_nullable";
import { createAttendanceTables } from "./004_create_attendance_tables";
import { createGradebookTables } from "./005_create_gradebook_tables";
import { createClassesTable } from "./006_create_classes_table";
import { addAttendanceClassGuard } from "./007_add_attendance_class_guard";
import { addAcademicSettingsAndQuarterTracking } from "./008_add_academic_settings_and_quarter_tracking";
import { addQuarterCountToAcademicSettings } from "./009_add_quarter_count_to_academic_settings";
import { createAcademicHistoryAndRecords } from "./010_create_academic_history_and_records";
import { addSchoolYearIsolationAndAuditLogs } from "./011_add_school_year_isolation_and_audit_logs";

export const migrations: Migration[] = [
    createUsersTable,
    createStudentsTable,
    alterStudentsTableNullable,
    createAttendanceTables,
    createGradebookTables,
    createClassesTable,
    addAttendanceClassGuard,
    addAcademicSettingsAndQuarterTracking,
    addQuarterCountToAcademicSettings,
    createAcademicHistoryAndRecords,
    addSchoolYearIsolationAndAuditLogs,
];
