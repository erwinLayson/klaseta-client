import { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { attendancePagesStyle } from "../styles/index";
import { RootParamList } from "../types/RootParamList";
import type { Student } from "../types/student";
import type { AttendanceSession } from "../types/attendance";
import {
    createAttendanceSession,
    getAttendanceSpreadsheet,
    saveAllAttendanceRecords,
} from "../services/pages/AttendancePages";
import {
    BottomNavBar,
    Button,
    InputGroup,
    DialogMessage,
    type NavTab,
} from "../components/index";
import type { DialogType } from "../components/ui/DialogMessage";

function getTodayDateString(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function formatDateHeader(dateStr: string): string {
    try {
        const parts = dateStr.split("-");
        if (parts.length === 3) {
            const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }
        return dateStr;
    } catch {
        return dateStr;
    }
}

function formatFullDate(dateStr: string): string {
    try {
        const parts = dateStr.split("-");
        if (parts.length === 3) {
            const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            return date.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
            });
        }
        return dateStr;
    } catch {
        return dateStr;
    }
}

export function AttendancePages() {
    const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>();
    const route = useRoute<RouteProp<RootParamList, "attendance">>();
    const { username } = route.params;

    const [students, setStudents] = useState<Student[]>([]);
    const [sessions, setSessions] = useState<AttendanceSession[]>([]);
    const [recordsMap, setRecordsMap] = useState<Record<string, "1" | "0" | "">>({});
    const [savedRecordsMap, setSavedRecordsMap] = useState<Record<string, "1" | "0">>({});
    const [nameQuery, setNameQuery] = useState("");
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [isDateSelectModalOpen, setIsDateSelectModalOpen] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [sessionDate, setSessionDate] = useState(getTodayDateString());
    const [sessionTitle, setSessionTitle] = useState("");

    const [dialog, setDialog] = useState({
        visible: false,
        type: "success" as DialogType,
        title: "",
        message: "",
    });

    const loadSpreadsheetData = useCallback(async () => {
        const data = await getAttendanceSpreadsheet(username);
        setStudents(data.students);
        setSessions(data.sessions);
        setRecordsMap(data.recordsMap);
        setSavedRecordsMap(data.recordsMap);
    }, [username]);

    useEffect(() => {
        let isMounted = true;
        const fetchSpreadsheet = async () => {
            const data = await getAttendanceSpreadsheet(username);
            if (isMounted) {
                setStudents(data.students);
                setSessions(data.sessions);
                setRecordsMap(data.recordsMap);
                setSavedRecordsMap(data.recordsMap);
            }
        };
        fetchSpreadsheet();
        return () => {
            isMounted = false;
        };
    }, [username]);

    const handleTabPress = (tab: NavTab) => {
        if (tab !== "attendance") {
            navigation.navigate(tab, { username });
        }
    };

    // Calculate unsaved changes count
    const unsavedCount = useMemo(() => {
        let count = 0;
        for (const [key, val] of Object.entries(recordsMap)) {
            const effectiveVal = val === "" ? (savedRecordsMap[key] || "1") : val;
            if (savedRecordsMap[key] !== effectiveVal) {
                count++;
            }
        }
        return count;
    }, [recordsMap, savedRecordsMap]);

    const hasUnsavedChanges = unsavedCount > 0;

    // Filter students by name query
    const filteredStudents = useMemo(() => {
        if (!nameQuery.trim()) {
            return students;
        }
        const q = nameQuery.trim().toLowerCase();
        return students.filter((s) => {
            const fullName = `${s.firstname} ${s.middlename || ""} ${s.lastname} ${s.suffix || ""}`.toLowerCase();
            return fullName.includes(q);
        });
    }, [students, nameQuery]);

    // Unique dates from all attendance sessions (newest first)
    const uniqueSessionDates = useMemo(() => {
        const dates = Array.from(new Set(sessions.map((s) => s.date)));
        dates.sort((a, b) => b.localeCompare(a));
        return dates;
    }, [sessions]);

    // Filter attendance sessions by specific selected date
    const filteredSessions = useMemo(() => {
        if (!selectedDate) {
            return sessions;
        }
        return sessions.filter((s) => s.date === selectedDate);
    }, [sessions, selectedDate]);

    const handleOpenCreateModal = () => {
        setSessionDate(getTodayDateString());
        setSessionTitle("");
        setIsCreateModalOpen(true);
    };

    const handleCreateSession = async () => {
        if (isCreating) return;

        if (!sessionDate.trim()) {
            setDialog({
                visible: true,
                type: "error",
                title: "Missing Date",
                message: "Please specify a session date.",
            });
            return;
        }

        setIsCreating(true);
        try {
            const result = await createAttendanceSession(
                username,
                sessionDate.trim(),
                sessionTitle.trim() || undefined
            );

            if (result.success) {
                setIsCreateModalOpen(false);
                await loadSpreadsheetData();
                setDialog({
                    visible: true,
                    type: "success",
                    title: "Session Created",
                    message: `Daily attendance session for ${sessionDate} has been created.`,
                });
            } else {
                setDialog({
                    visible: true,
                    type: "error",
                    title: "Error",
                    message: result.message,
                });
            }
        } finally {
            setIsCreating(false);
        }
    };

    // Update attendance status locally in memory when typing 1 or 0 (does NOT save directly)
    const handleStatusInputChange = (
        sessionId: number,
        studentId: number,
        inputValue: string
    ) => {
        const key = `${studentId}_${sessionId}`;

        // Allow clearing the field with backspace
        if (inputValue === "") {
            setRecordsMap((prev) => ({ ...prev, [key]: "" }));
            return;
        }

        // Filter out non 0/1 characters and pick the latest character typed
        const validChars = inputValue.replace(/[^01]/g, "");
        if (validChars.length > 0) {
            const latest = validChars.slice(-1) as "1" | "0";
            setRecordsMap((prev) => ({ ...prev, [key]: latest }));
        }
    };

    // If blurred while empty, restore to saved value or default to "1"
    const handleStatusBlur = (sessionId: number, studentId: number) => {
        const key = `${studentId}_${sessionId}`;
        setRecordsMap((prev) => {
            if (!prev[key]) {
                const fallback = savedRecordsMap[key] || "1";
                return { ...prev, [key]: fallback };
            }
            return prev;
        });
    };

    // Manual Save All button action inside table header
    const handleSaveAll = async () => {
        if (isSaving || !hasUnsavedChanges) return;

        setIsSaving(true);
        try {
            const recordsToSave: {
                sessionId: number;
                studentId: number;
                status: "1" | "0";
            }[] = [];

            for (const [key, status] of Object.entries(recordsMap)) {
                const [studentIdStr, sessionIdStr] = key.split("_");
                const studentId = Number(studentIdStr);
                const sessionId = Number(sessionIdStr);

                if (!isNaN(studentId) && !isNaN(sessionId)) {
                    const finalStatus: "1" | "0" = status === "0" ? "0" : "1";
                    recordsToSave.push({ sessionId, studentId, status: finalStatus });
                }
            }

            const success = await saveAllAttendanceRecords(recordsToSave);

            if (success) {
                const normalizedMap: Record<string, "1" | "0"> = {};
                for (const [k, v] of Object.entries(recordsMap)) {
                    normalizedMap[k] = v === "0" ? "0" : "1";
                }
                setRecordsMap(normalizedMap);
                setSavedRecordsMap(normalizedMap);
                setDialog({
                    visible: true,
                    type: "success",
                    title: "Attendance Saved",
                    message: "All attendance changes have been saved successfully.",
                });
            } else {
                setDialog({
                    visible: true,
                    type: "error",
                    title: "Save Failed",
                    message: "Could not save attendance changes. Please try again.",
                });
            }
        } finally {
            setIsSaving(false);
        }
    };

    // Overall attendance stats
    const stats = useMemo(() => {
        let presentCount = 0;
        let absentCount = 0;

        const allStatuses = Object.values(recordsMap);
        for (const status of allStatuses) {
            if (status === "1") presentCount++;
            else if (status === "0") absentCount++;
        }

        const totalEntries = presentCount + absentCount;
        const rate = totalEntries > 0 ? Math.round((presentCount / totalEntries) * 100) : 100;

        return {
            totalSessions: sessions.length,
            presentCount,
            absentCount,
            attendanceRate: `${rate}%`,
        };
    }, [recordsMap, sessions]);

    return (
        <View style={attendancePagesStyle.container}>
            <View style={attendancePagesStyle.backgroundAccent} pointerEvents="none" />
            <View style={attendancePagesStyle.backgroundAccentBottom} pointerEvents="none" />

            <ScrollView
                contentContainerStyle={attendancePagesStyle.scrollView}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={attendancePagesStyle.header}>
                    <View style={attendancePagesStyle.headerTopRow}>
                        <View style={attendancePagesStyle.headerTitleRow}>
                            <Ionicons name="clipboard-outline" size={26} color="#4F46E5" />
                            <Text style={attendancePagesStyle.greeting}>Attendance</Text>
                        </View>

                        <Pressable
                            onPress={handleOpenCreateModal}
                            style={({ pressed }) => [
                                attendancePagesStyle.createButton,
                                pressed && attendancePagesStyle.createButtonPressed,
                            ]}
                        >
                            <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                            <Text style={attendancePagesStyle.createButtonText}>
                                New Session
                            </Text>
                        </Pressable>
                    </View>
                    <Text style={attendancePagesStyle.subtitle}>
                        Daily student attendance spreadsheet
                    </Text>
                </View>

                {/* Stats Summary */}
                <View style={attendancePagesStyle.statsRow}>
                    <View style={attendancePagesStyle.statCard}>
                        <Text style={attendancePagesStyle.statValue}>
                            {stats.totalSessions}
                        </Text>
                        <Text style={attendancePagesStyle.statLabel}>Sessions</Text>
                    </View>
                    <View style={attendancePagesStyle.statCard}>
                        <Text style={[attendancePagesStyle.statValue, { color: "#16A34A" }]}>
                            {stats.presentCount}
                        </Text>
                        <Text style={attendancePagesStyle.statLabel}>Present (1)</Text>
                    </View>
                    <View style={attendancePagesStyle.statCard}>
                        <Text style={[attendancePagesStyle.statValue, { color: "#DC2626" }]}>
                            {stats.absentCount}
                        </Text>
                        <Text style={attendancePagesStyle.statLabel}>Absent (0)</Text>
                    </View>
                    <View style={attendancePagesStyle.statCard}>
                        <Text style={[attendancePagesStyle.statValue, { color: "#4F46E5" }]}>
                            {stats.attendanceRate}
                        </Text>
                        <Text style={attendancePagesStyle.statLabel}>Rate</Text>
                    </View>
                </View>

                {/* Spreadsheet Section */}
                <View style={attendancePagesStyle.section}>
                    {/* Attendance Table Header Bar with Save All & Unsaved Indicator */}
                    <View style={attendancePagesStyle.sectionHeaderRow}>
                        <View style={attendancePagesStyle.sectionHeaderLeft}>
                            <Text style={attendancePagesStyle.sectionTitle}>
                                Attendance History
                            </Text>
                            <View style={attendancePagesStyle.sessionCountBadge}>
                                <Text style={attendancePagesStyle.sessionCountBadgeText}>
                                    {filteredStudents.length} of {students.length} students
                                </Text>
                            </View>
                            <View style={attendancePagesStyle.sessionCountBadge}>
                                <Text style={attendancePagesStyle.sessionCountBadgeText}>
                                    {filteredSessions.length} of {sessions.length} sessions
                                </Text>
                            </View>
                            {hasUnsavedChanges && (
                                <View style={attendancePagesStyle.unsavedBadge}>
                                    <Ionicons name="alert-circle" size={12} color="#D97706" />
                                    <Text style={attendancePagesStyle.unsavedBadgeText}>
                                        {unsavedCount} unsaved
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Save All Button moved into Table Header */}
                        <Pressable
                            onPress={handleSaveAll}
                            disabled={isSaving || !hasUnsavedChanges}
                            style={({ pressed }) => [
                                attendancePagesStyle.saveAllButton,
                                !hasUnsavedChanges && attendancePagesStyle.saveAllButtonDisabled,
                                pressed && hasUnsavedChanges && attendancePagesStyle.saveAllButtonPressed,
                            ]}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Ionicons
                                    name="save-outline"
                                    size={15}
                                    color={hasUnsavedChanges ? "#FFFFFF" : "#94A3B8"}
                                />
                            )}
                            <Text
                                style={[
                                    attendancePagesStyle.saveAllButtonText,
                                    !hasUnsavedChanges && attendancePagesStyle.saveAllButtonTextDisabled,
                                ]}
                            >
                                {isSaving ? "Saving..." : "Save All"}
                            </Text>
                        </Pressable>
                    </View>

                    {/* Two Separate Search Filters: By Name and By Date */}
                    <View style={attendancePagesStyle.filtersWrapper}>
                        {/* 1. Filter by Student Name */}
                        <View style={attendancePagesStyle.filterInputWrapper}>
                            <Ionicons name="search-outline" size={18} color="#4F46E5" />
                            <TextInput
                                style={attendancePagesStyle.filterInput}
                                placeholder="Filter students by name (e.g. Juan, Dela Cruz)..."
                                placeholderTextColor="#94A3B8"
                                value={nameQuery}
                                onChangeText={setNameQuery}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {nameQuery.length > 0 && (
                                <Pressable
                                    onPress={() => setNameQuery("")}
                                    style={attendancePagesStyle.filterClearButton}
                                    hitSlop={8}
                                >
                                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                                </Pressable>
                            )}
                        </View>

                        {/* 2. Filter Attendance by Specific Date (Selection) */}
                        <Pressable
                            onPress={() => setIsDateSelectModalOpen(true)}
                            style={({ pressed }) => [
                                attendancePagesStyle.filterSelectWrapper,
                                selectedDate !== "" && attendancePagesStyle.filterSelectWrapperActive,
                                pressed && attendancePagesStyle.filterSelectWrapperPressed,
                            ]}
                        >
                            <View style={attendancePagesStyle.filterSelectLeft}>
                                <Ionicons
                                    name={selectedDate ? "calendar" : "calendar-outline"}
                                    size={18}
                                    color={selectedDate ? "#059669" : "#64748B"}
                                />
                                <View style={{ flex: 1 }}>
                                    {selectedDate ? (
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                            <Text style={attendancePagesStyle.filterSelectLabel}>Date:</Text>
                                            <Text
                                                style={attendancePagesStyle.filterSelectValue}
                                                numberOfLines={1}
                                            >
                                                {formatFullDate(selectedDate)}
                                            </Text>
                                        </View>
                                    ) : (
                                        <Text style={attendancePagesStyle.filterSelectPlaceholder}>
                                            Select specific date (All dates shown)...
                                        </Text>
                                    )}
                                </View>
                            </View>

                            <View style={attendancePagesStyle.filterSelectRight}>
                                {selectedDate !== "" ? (
                                    <Pressable
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            setSelectedDate("");
                                        }}
                                        hitSlop={8}
                                        style={attendancePagesStyle.filterClearButton}
                                    >
                                        <Ionicons name="close-circle" size={18} color="#94A3B8" />
                                    </Pressable>
                                ) : null}
                                <Ionicons name="chevron-down" size={16} color="#64748B" />
                            </View>
                        </Pressable>
                    </View>

                    {/* Status Legend (1 for Present, 0 for Absent) */}
                    <View style={attendancePagesStyle.legendRow}>
                        <View style={attendancePagesStyle.legendItems}>
                            <View style={attendancePagesStyle.legendItem}>
                                <View
                                    style={[
                                        attendancePagesStyle.legendBadge,
                                        attendancePagesStyle.statusInputPresent,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            attendancePagesStyle.legendBadgeText,
                                            { color: "#15803D" },
                                        ]}
                                    >
                                        1
                                    </Text>
                                </View>
                                <Text style={attendancePagesStyle.legendText}>Present</Text>
                            </View>

                            <View style={attendancePagesStyle.legendItem}>
                                <View
                                    style={[
                                        attendancePagesStyle.legendBadge,
                                        attendancePagesStyle.statusInputAbsent,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            attendancePagesStyle.legendBadgeText,
                                            { color: "#B91C1C" },
                                        ]}
                                    >
                                        0
                                    </Text>
                                </View>
                                <Text style={attendancePagesStyle.legendText}>Absent</Text>
                            </View>
                        </View>
                        <Text style={attendancePagesStyle.legendHint}>
                            Type 1 for Present, 0 for Absent
                        </Text>
                    </View>

                    {/* Spreadsheet Table View */}
                    {students.length === 0 ? (
                        <View style={attendancePagesStyle.emptyCard}>
                            <Ionicons
                                name="people-outline"
                                size={44}
                                color="#94A3B8"
                                style={attendancePagesStyle.emptyIcon}
                            />
                            <Text style={attendancePagesStyle.emptyText}>No students in your class</Text>
                            <Text style={attendancePagesStyle.emptySubtext}>
                                Add students in the My Class tab before creating an attendance session.
                            </Text>
                        </View>
                    ) : sessions.length === 0 ? (
                        <View style={attendancePagesStyle.emptyCard}>
                            <Ionicons
                                name="calendar-outline"
                                size={44}
                                color="#94A3B8"
                                style={attendancePagesStyle.emptyIcon}
                            />
                            <Text style={attendancePagesStyle.emptyText}>No attendance sessions yet</Text>
                            <Text style={attendancePagesStyle.emptySubtext}>
                                Create a daily attendance session to start tracking your students&apos; presence.
                            </Text>
                            <Pressable
                                onPress={handleOpenCreateModal}
                                style={({ pressed }) => [
                                    attendancePagesStyle.createButton,
                                    pressed && attendancePagesStyle.createButtonPressed,
                                ]}
                            >
                                <Ionicons name="add" size={18} color="#FFFFFF" />
                                <Text style={attendancePagesStyle.createButtonText}>
                                    Create First Session
                                </Text>
                            </Pressable>
                        </View>
                    ) : filteredStudents.length === 0 ? (
                        <View style={attendancePagesStyle.emptyCard}>
                            <Ionicons
                                name="person-outline"
                                size={36}
                                color="#94A3B8"
                                style={attendancePagesStyle.emptyIcon}
                            />
                            <Text style={attendancePagesStyle.emptyText}>
                                No students found matching &quot;{nameQuery}&quot;
                            </Text>
                            <Text style={attendancePagesStyle.emptySubtext}>
                                Try searching with a different name or spelling.
                            </Text>
                            <Pressable
                                onPress={() => setNameQuery("")}
                                style={attendancePagesStyle.clearFilterButton}
                            >
                                <Text style={attendancePagesStyle.clearFilterButtonText}>
                                    Clear Name Filter
                                </Text>
                            </Pressable>
                        </View>
                    ) : filteredSessions.length === 0 ? (
                        <View style={attendancePagesStyle.emptyCard}>
                            <Ionicons
                                name="calendar-outline"
                                size={36}
                                color="#94A3B8"
                                style={attendancePagesStyle.emptyIcon}
                            />
                            <Text style={attendancePagesStyle.emptyText}>
                                No sessions found for &quot;{formatFullDate(selectedDate)}&quot;
                            </Text>
                            <Text style={attendancePagesStyle.emptySubtext}>
                                There are no attendance sessions recorded for this specific date.
                            </Text>
                            <Pressable
                                onPress={() => setSelectedDate("")}
                                style={attendancePagesStyle.clearFilterButton}
                            >
                                <Text style={attendancePagesStyle.clearFilterButtonText}>
                                    Show All Dates
                                </Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={attendancePagesStyle.spreadsheetCard}>
                            <View style={attendancePagesStyle.spreadsheetWrapper}>
                                {/* First Column: Fixed Student Names */}
                                <View style={attendancePagesStyle.studentFixedColumn}>
                                    {/* Header Cell */}
                                    <View style={attendancePagesStyle.studentHeaderCell}>
                                        <Text style={attendancePagesStyle.studentHeaderCellText}>
                                            Student Name
                                        </Text>
                                    </View>

                                    {/* Student Rows */}
                                    {filteredStudents.map((student, idx) => (
                                        <View
                                            key={student.id}
                                            style={[
                                                attendancePagesStyle.studentRowCell,
                                                idx % 2 === 0
                                                    ? attendancePagesStyle.rowEven
                                                    : attendancePagesStyle.rowOdd,
                                            ]}
                                        >
                                            <Text
                                                style={attendancePagesStyle.studentRowText}
                                                numberOfLines={1}
                                            >
                                                {student.firstname} {student.lastname}
                                            </Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Horizontally Scrollable Date Columns */}
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={true}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    <View>
                                        {/* Date Columns Header Row */}
                                        <View style={{ flexDirection: "row" }}>
                                            {filteredSessions.map((session) => (
                                                <View
                                                    key={session.id}
                                                    style={attendancePagesStyle.dateHeaderCell}
                                                >
                                                    <Text style={attendancePagesStyle.dateHeaderText}>
                                                        {formatDateHeader(session.date)}
                                                    </Text>
                                                    {session.title ? (
                                                        <Text
                                                            style={attendancePagesStyle.dateHeaderSubtext}
                                                            numberOfLines={1}
                                                        >
                                                            {session.title}
                                                        </Text>
                                                    ) : null}
                                                </View>
                                            ))}
                                        </View>

                                        {/* Attendance Status Cells per Student Row */}
                                        {filteredStudents.map((student, rowIdx) => (
                                            <View
                                                key={student.id}
                                                style={[
                                                    { flexDirection: "row" },
                                                    rowIdx % 2 === 0
                                                        ? attendancePagesStyle.rowEven
                                                        : attendancePagesStyle.rowOdd,
                                                ]}
                                            >
                                                {filteredSessions.map((session) => {
                                                    const key = `${student.id}_${session.id}`;
                                                    const status = recordsMap[key] !== undefined ? recordsMap[key] : "1";
                                                    const isPresent = status === "1";
                                                    const isAbsent = status === "0";

                                                    return (
                                                        <View
                                                            key={session.id}
                                                            style={attendancePagesStyle.statusCell}
                                                        >
                                                            <TextInput
                                                                style={[
                                                                    attendancePagesStyle.statusInput,
                                                                    isPresent
                                                                        ? attendancePagesStyle.statusInputPresent
                                                                        : isAbsent
                                                                        ? attendancePagesStyle.statusInputAbsent
                                                                        : attendancePagesStyle.statusInputEmpty,
                                                                ]}
                                                                value={status}
                                                                onChangeText={(val) =>
                                                                    handleStatusInputChange(
                                                                        session.id,
                                                                        student.id,
                                                                        val
                                                                    )
                                                                }
                                                                onBlur={() =>
                                                                    handleStatusBlur(
                                                                        session.id,
                                                                        student.id
                                                                    )
                                                                }
                                                                keyboardType="number-pad"
                                                                selectTextOnFocus={true}
                                                                contextMenuHidden={true}
                                                                autoCorrect={false}
                                                                autoCapitalize="none"
                                                                textAlign="center"
                                                            />
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Select Specific Date Modal */}
            <Modal
                visible={isDateSelectModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsDateSelectModalOpen(false)}
            >
                <Pressable
                    style={attendancePagesStyle.modalOverlay}
                    onPress={() => setIsDateSelectModalOpen(false)}
                >
                    <Pressable
                        style={attendancePagesStyle.modalContent}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={attendancePagesStyle.modalHeader}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <Ionicons name="calendar" size={20} color="#059669" />
                                <Text style={attendancePagesStyle.modalTitle}>Select Date</Text>
                            </View>
                            <Pressable
                                onPress={() => setIsDateSelectModalOpen(false)}
                                hitSlop={8}
                            >
                                <Ionicons name="close" size={22} color="#64748B" />
                            </Pressable>
                        </View>

                        <Text style={attendancePagesStyle.datePickerSubtitle}>
                            Choose a specific attendance date to view:
                        </Text>

                        <ScrollView
                            style={{ maxHeight: 320 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Option: All Dates */}
                            <Pressable
                                onPress={() => {
                                    setSelectedDate("");
                                    setIsDateSelectModalOpen(false);
                                }}
                                style={({ pressed }) => [
                                    attendancePagesStyle.dateOptionItem,
                                    selectedDate === "" && attendancePagesStyle.dateOptionItemSelected,
                                    pressed && attendancePagesStyle.dateOptionItemPressed,
                                ]}
                            >
                                <View style={attendancePagesStyle.dateOptionLeft}>
                                    <View
                                        style={[
                                            attendancePagesStyle.dateOptionIconBox,
                                            selectedDate === "" && { backgroundColor: "#D1FAE5" },
                                        ]}
                                    >
                                        <Ionicons
                                            name="calendar-outline"
                                            size={18}
                                            color={selectedDate === "" ? "#059669" : "#64748B"}
                                        />
                                    </View>
                                    <View>
                                        <Text
                                            style={[
                                                attendancePagesStyle.dateOptionTitle,
                                                selectedDate === "" && { color: "#059669", fontWeight: "700" },
                                            ]}
                                        >
                                            All Dates
                                        </Text>
                                        <Text style={attendancePagesStyle.dateOptionSub}>
                                            Display all {sessions.length} sessions
                                        </Text>
                                    </View>
                                </View>
                                {selectedDate === "" && (
                                    <Ionicons name="checkmark-circle" size={20} color="#059669" />
                                )}
                            </Pressable>

                            {/* Specific dates list */}
                            {uniqueSessionDates.map((dateStr) => {
                                const isSelected = selectedDate === dateStr;
                                const sessionCount = sessions.filter((s) => s.date === dateStr).length;

                                return (
                                    <Pressable
                                        key={dateStr}
                                        onPress={() => {
                                            setSelectedDate(dateStr);
                                            setIsDateSelectModalOpen(false);
                                        }}
                                        style={({ pressed }) => [
                                            attendancePagesStyle.dateOptionItem,
                                            isSelected && attendancePagesStyle.dateOptionItemSelected,
                                            pressed && attendancePagesStyle.dateOptionItemPressed,
                                        ]}
                                    >
                                        <View style={attendancePagesStyle.dateOptionLeft}>
                                            <View
                                                style={[
                                                    attendancePagesStyle.dateOptionIconBox,
                                                    isSelected && { backgroundColor: "#D1FAE5" },
                                                ]}
                                            >
                                                <Ionicons
                                                    name="calendar"
                                                    size={18}
                                                    color={isSelected ? "#059669" : "#64748B"}
                                                />
                                            </View>
                                            <View>
                                                <Text
                                                    style={[
                                                        attendancePagesStyle.dateOptionTitle,
                                                        isSelected && { color: "#059669", fontWeight: "700" },
                                                    ]}
                                                >
                                                    {formatFullDate(dateStr)}
                                                </Text>
                                                <Text style={attendancePagesStyle.dateOptionSub}>
                                                    {dateStr} • {sessionCount} session{sessionCount > 1 ? "s" : ""}
                                                </Text>
                                            </View>
                                        </View>
                                        {isSelected && (
                                            <Ionicons name="checkmark-circle" size={20} color="#059669" />
                                        )}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

                        <Pressable
                            onPress={() => setIsDateSelectModalOpen(false)}
                            style={attendancePagesStyle.cancelButton}
                        >
                            <Text style={attendancePagesStyle.cancelButtonText}>Cancel</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Create Attendance Session Modal */}
            <Modal
                visible={isCreateModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!isCreating) setIsCreateModalOpen(false);
                }}
            >
                <KeyboardAvoidingView
                    style={attendancePagesStyle.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <View style={attendancePagesStyle.modalContent}>
                        <View style={attendancePagesStyle.modalHeader}>
                            <Text style={attendancePagesStyle.modalTitle}>
                                New Attendance Session
                            </Text>
                            <Pressable
                                onPress={() => {
                                    if (!isCreating) setIsCreateModalOpen(false);
                                }}
                                hitSlop={8}
                            >
                                <Ionicons name="close" size={22} color="#64748B" />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Quick Date Chips */}
                            <View style={attendancePagesStyle.dateQuickChipsRow}>
                                <Pressable
                                    onPress={() => setSessionDate(getTodayDateString())}
                                    style={attendancePagesStyle.dateQuickChip}
                                >
                                    <Text style={attendancePagesStyle.dateQuickChipText}>Today</Text>
                                </Pressable>
                            </View>

                            <InputGroup
                                label="Date (YYYY-MM-DD)"
                                placeholder="e.g. 2026-11-04"
                                value={sessionDate}
                                onChangeText={setSessionDate}
                            />

                            <InputGroup
                                label="Session Label / Title (Optional)"
                                placeholder="e.g. Morning Class, Regular"
                                value={sessionTitle}
                                onChangeText={setSessionTitle}
                            />

                            <Button
                                label={isCreating ? "Creating..." : "Create Session"}
                                onPress={handleCreateSession}
                            />

                            <Pressable
                                onPress={() => {
                                    if (!isCreating) setIsCreateModalOpen(false);
                                }}
                                style={attendancePagesStyle.cancelButton}
                            >
                                <Text style={attendancePagesStyle.cancelButtonText}>Cancel</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <DialogMessage
                visible={dialog.visible}
                type={dialog.type}
                title={dialog.title}
                message={dialog.message}
                onClose={() => setDialog((prev) => ({ ...prev, visible: false }))}
            />

            <BottomNavBar activeTab="attendance" onTabPress={handleTabPress} />
        </View>
    );
}
