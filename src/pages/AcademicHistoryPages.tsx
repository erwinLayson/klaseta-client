import React, { useCallback, useState, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TextInput,
    Modal,
    ActivityIndicator,
    RefreshControl,
    Platform,
    KeyboardAvoidingView,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { academicHistoryPagesStyle } from "../styles/index";
import { RootParamList } from "../types/RootParamList";
import { BottomNavBar, DialogMessage, type NavTab, type DialogType } from "../components/index";
import {
    getAcademicHistory,
    getAcademicRecordDetails,
    deleteAcademicRecord,
    deleteSchoolYearRecords,
    type AcademicHistoryData,
    type AcademicRecordItem,
    type AcademicRecordDetails,
} from "../services/pages/AcademicHistoryPages";

export function AcademicHistoryPages() {
    const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>();
    const route = useRoute<RouteProp<RootParamList, "academichistory">>();
    const { username, schoolYear: routeSchoolYear } = route.params;

    const [data, setData] = useState<AcademicHistoryData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Filters
    const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>(routeSchoolYear || "ALL");
    const [isYearPickerModalOpen, setIsYearPickerModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Details modal
    const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
    const [recordDetails, setRecordDetails] = useState<AcademicRecordDetails | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [studentSearchQuery, setStudentSearchQuery] = useState("");

    // Deletion confirmation modal
    const [deletingRecord, setDeletingRecord] = useState<AcademicRecordItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Entire school year deletion confirmation modal
    const [deletingSchoolYear, setDeletingSchoolYear] = useState<string | null>(null);
    const [isDeletingYear, setIsDeletingYear] = useState(false);

    // Dialog notification
    const [dialog, setDialog] = useState({
        visible: false,
        type: "success" as DialogType,
        title: "",
        message: "",
    });

    const loadHistory = useCallback(async () => {
        try {
            const res = await getAcademicHistory(username);
            setData(res);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [username]);

    useFocusEffect(
        useCallback(() => {
            loadHistory();
        }, [loadHistory])
    );

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadHistory();
    };

    const handleTabPress = (tab: NavTab) => {
        if (tab !== "academichistory") {
            navigation.navigate(tab, { username });
        }
    };

    // Open Student Details Modal
    const handleOpenDetails = async (record: AcademicRecordItem) => {
        setSelectedRecordId(record.id);
        setIsLoadingDetails(true);
        setStudentSearchQuery("");
        try {
            const details = await getAcademicRecordDetails(record.id);
            setRecordDetails(details);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    // Confirm Delete Academic Record
    const handleConfirmDelete = async () => {
        if (!deletingRecord || isDeleting) return;

        setIsDeleting(true);
        try {
            const deletedSY = deletingRecord.schoolYear;
            const remainingForYear = (data?.records || []).filter(
                (r) => r.schoolYear === deletedSY && r.id !== deletingRecord.id
            ).length;
            const result = await deleteAcademicRecord(deletingRecord.id);
            if (result.success) {
                setDeletingRecord(null);
                if (selectedRecordId === deletingRecord.id) {
                    setSelectedRecordId(null);
                    setRecordDetails(null);
                }
                if (remainingForYear === 0 || selectedSchoolYear === deletedSY) {
                    setSelectedSchoolYear("ALL");
                }
                await loadHistory();
                setDialog({
                    visible: true,
                    type: "success",
                    title: remainingForYear === 0 ? "School Year Removed" : "Record Deleted",
                    message: remainingForYear === 0
                        ? `The academic record was removed. Since no records remain for S.Y. ${deletedSY}, it has been removed from your year filter.`
                        : "The academic record and its student archives have been removed.",
                });
            } else {
                setDialog({
                    visible: true,
                    type: "error",
                    title: "Delete Failed",
                    message: result.message,
                });
            }
        } finally {
            setIsDeleting(false);
        }
    };

    // Confirm Delete Entire School Year Records
    const handleConfirmDeleteYear = async () => {
        if (!deletingSchoolYear || isDeletingYear) return;

        setIsDeletingYear(true);
        try {
            const syToDelete = deletingSchoolYear;
            const result = await deleteSchoolYearRecords(username, syToDelete);
            if (result.success) {
                setDeletingSchoolYear(null);
                if (selectedSchoolYear === syToDelete) {
                    setSelectedSchoolYear("ALL");
                }
                if (recordDetails?.schoolYear === syToDelete) {
                    setSelectedRecordId(null);
                    setRecordDetails(null);
                }
                await loadHistory();
                setDialog({
                    visible: true,
                    type: "success",
                    title: "School Year Deleted",
                    message: `All archived records for S.Y. ${syToDelete} have been permanently deleted and removed from the filter.`,
                });
            } else {
                setDialog({
                    visible: true,
                    type: "error",
                    title: "Delete Failed",
                    message: result.message,
                });
            }
        } finally {
            setIsDeletingYear(false);
        }
    };

    // Available school years for filter picker modal (only years with archived records)
    const availableSchoolYears = useMemo(() => {
        const map = new Map<
            string,
            {
                schoolYear: string;
                status?: "active" | "completed";
                classCount: number;
                totalStudents: number;
            }
        >();

        // Populate from records
        for (const r of data?.records || []) {
            if (r.schoolYear) {
                const existing = map.get(r.schoolYear);
                if (existing) {
                    existing.classCount += 1;
                    existing.totalStudents += r.studentCount || 0;
                } else {
                    map.set(r.schoolYear, {
                        schoolYear: r.schoolYear,
                        status: "completed",
                        classCount: 1,
                        totalStudents: r.studentCount || 0,
                    });
                }
            }
        }

        // Cross-reference metadata from data.schoolYears if present
        for (const sy of data?.schoolYears || []) {
            if (sy.classCount > 0) {
                const existing = map.get(sy.schoolYear);
                if (existing) {
                    existing.status = sy.status;
                } else {
                    map.set(sy.schoolYear, {
                        schoolYear: sy.schoolYear,
                        status: sy.status,
                        classCount: sy.classCount,
                        totalStudents: sy.totalStudents,
                    });
                }
            }
        }

        // Sort descending by school year
        return Array.from(map.values()).sort((a, b) =>
            b.schoolYear.localeCompare(a.schoolYear, undefined, { numeric: true })
        );
    }, [data]);

    // Filtered records
    const filteredRecords = (data?.records || []).filter((r) => {
        if (selectedSchoolYear !== "ALL" && r.schoolYear !== selectedSchoolYear) {
            return false;
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const nameMatch = r.className.toLowerCase().includes(q);
            const secMatch = (r.section || "").toLowerCase().includes(q);
            const subMatch = (r.subject || "").toLowerCase().includes(q);
            const syMatch = r.schoolYear.toLowerCase().includes(q);
            return nameMatch || secMatch || subMatch || syMatch;
        }
        return true;
    });

    // Filtered students in details modal
    const filteredStudents = (recordDetails?.students || []).filter((s) => {
        if (!studentSearchQuery.trim()) return true;
        const q = studentSearchQuery.toLowerCase().trim();
        return (
            s.studentName.toLowerCase().includes(q) ||
            (s.lrn || "").toLowerCase().includes(q)
        );
    });

    return (
        <View style={academicHistoryPagesStyle.container}>
            <View style={academicHistoryPagesStyle.backgroundAccent} pointerEvents="none" />
            <View style={academicHistoryPagesStyle.backgroundAccentBottom} pointerEvents="none" />

            {isLoading && !data ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#64748B", marginTop: 12 }}>
                        Loading academic history...
                    </Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={academicHistoryPagesStyle.scrollView}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            colors={["#4F46E5"]}
                            tintColor="#4F46E5"
                        />
                    }
                >
                    {/* Header */}
                    <View style={academicHistoryPagesStyle.header}>
                        <Text style={academicHistoryPagesStyle.headerPre}>Archives & Performance</Text>
                        <Text style={academicHistoryPagesStyle.headerTitle}>Academic History</Text>
                        <Text style={academicHistoryPagesStyle.headerSubtitle}>
                            Browse completed school years, view students&apos; past grades, and manage permanent academic records.
                        </Text>
                    </View>

                    {/* Stats 2x2 Grid */}
                    <View style={academicHistoryPagesStyle.statsGrid}>
                        <View style={academicHistoryPagesStyle.statCard}>
                            <View style={[academicHistoryPagesStyle.statIconBox, { backgroundColor: "#EEF2FF" }]}>
                                <Ionicons name="albums-outline" size={18} color="#4F46E5" />
                            </View>
                            <Text style={academicHistoryPagesStyle.statValue}>
                                {data?.stats.totalYearsArchived ?? 0}
                            </Text>
                            <Text style={academicHistoryPagesStyle.statLabel}>School Years Completed</Text>
                        </View>

                        <View style={academicHistoryPagesStyle.statCard}>
                            <View style={[academicHistoryPagesStyle.statIconBox, { backgroundColor: "#ECFDF5" }]}>
                                <Ionicons name="school-outline" size={18} color="#059669" />
                            </View>
                            <Text style={academicHistoryPagesStyle.statValue}>
                                {data?.stats.totalClassesArchived ?? 0}
                            </Text>
                            <Text style={academicHistoryPagesStyle.statLabel}>Archived Classes</Text>
                        </View>

                        <View style={academicHistoryPagesStyle.statCard}>
                            <View style={[academicHistoryPagesStyle.statIconBox, { backgroundColor: "#EFF6FF" }]}>
                                <Ionicons name="people-outline" size={18} color="#2563EB" />
                            </View>
                            <Text style={academicHistoryPagesStyle.statValue}>
                                {data?.stats.totalStudentsRecorded ?? 0}
                            </Text>
                            <Text style={academicHistoryPagesStyle.statLabel}>Archived Students</Text>
                        </View>

                        <View style={academicHistoryPagesStyle.statCard}>
                            <View style={[academicHistoryPagesStyle.statIconBox, { backgroundColor: "#F5F3FF" }]}>
                                <Ionicons name="trophy-outline" size={18} color="#7C3AED" />
                            </View>
                            <Text style={academicHistoryPagesStyle.statValue}>
                                {data?.stats.overallAverageGrade !== null
                                    ? `${data?.stats.overallAverageGrade}%`
                                    : "—"}
                            </Text>
                            <Text style={academicHistoryPagesStyle.statLabel}>Historical Avg Grade</Text>
                        </View>
                    </View>

                    {/* School Year Filter Button */}
                    <Pressable
                        onPress={() => setIsYearPickerModalOpen(true)}
                        style={({ pressed }) => [
                            academicHistoryPagesStyle.yearPickerButton,
                            selectedSchoolYear !== "ALL" && academicHistoryPagesStyle.yearPickerButtonActive,
                            pressed && academicHistoryPagesStyle.yearPickerButtonPressed,
                        ]}
                    >
                        <View style={academicHistoryPagesStyle.yearPickerLeft}>
                            <Ionicons
                                name={selectedSchoolYear !== "ALL" ? "calendar" : "calendar-outline"}
                                size={18}
                                color={selectedSchoolYear !== "ALL" ? "#4F46E5" : "#64748B"}
                            />
                            <Text
                                style={[
                                    academicHistoryPagesStyle.yearPickerText,
                                    selectedSchoolYear !== "ALL" && academicHistoryPagesStyle.yearPickerTextActive,
                                ]}
                                numberOfLines={1}
                            >
                                {selectedSchoolYear !== "ALL"
                                    ? `School Year: S.Y. ${selectedSchoolYear}`
                                    : "School Year: All School Years"}
                            </Text>
                        </View>
                        {selectedSchoolYear !== "ALL" ? (
                            <Pressable
                                onPress={(e) => {
                                    e.stopPropagation();
                                    setSelectedSchoolYear("ALL");
                                }}
                                style={academicHistoryPagesStyle.yearPickerClearBtn}
                                hitSlop={8}
                                accessibilityLabel="Clear school year filter"
                            >
                                <Ionicons name="close-circle" size={18} color="#4F46E5" />
                            </Pressable>
                        ) : (
                            <Ionicons name="chevron-down" size={16} color="#64748B" />
                        )}
                    </Pressable>

                    {/* Active Filter Indicator Badge */}
                    {selectedSchoolYear !== "ALL" && (
                        <View style={academicHistoryPagesStyle.activeFilterBadge}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1, marginRight: 8 }}>
                                <Ionicons name="funnel" size={13} color="#4F46E5" />
                                <Text style={academicHistoryPagesStyle.activeFilterBadgeText} numberOfLines={1}>
                                    Showing {filteredRecords.length} record{filteredRecords.length === 1 ? "" : "s"} for S.Y. {selectedSchoolYear}
                                </Text>
                            </View>
                            <View style={academicHistoryPagesStyle.activeFilterActions}>
                                <Pressable onPress={() => setSelectedSchoolYear("ALL")} hitSlop={8}>
                                    <Text style={academicHistoryPagesStyle.showAllBtnText}>
                                        Show All
                                    </Text>
                                </Pressable>
                                <View style={academicHistoryPagesStyle.filterDivider} />
                                <Pressable
                                    onPress={() => setDeletingSchoolYear(selectedSchoolYear)}
                                    hitSlop={8}
                                    style={academicHistoryPagesStyle.deleteYearFilterBtn}
                                >
                                    <Ionicons name="trash-outline" size={13} color="#DC2626" />
                                    <Text style={academicHistoryPagesStyle.deleteYearFilterBtnText}>
                                        Delete Year
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    )}
                    {/* Search Bar if records exist */}
                    {(data?.records.length || 0) > 0 && (
                        <View style={academicHistoryPagesStyle.searchContainer}>
                            <Ionicons name="search-outline" size={18} color="#94A3B8" />
                            <TextInput
                                style={academicHistoryPagesStyle.searchInput}
                                placeholder="Search by class name, section, or subject..."
                                placeholderTextColor="#94A3B8"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <Pressable onPress={() => setSearchQuery("")} hitSlop={6}>
                                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                                </Pressable>
                            )}
                        </View>
                    )}

                    {/* Class Records List */}
                    {filteredRecords.length > 0 ? (
                        <View style={academicHistoryPagesStyle.recordsList}>
                            {filteredRecords.map((r) => {
                                const avgGrade = r.averageGrade;
                                const isPassing = avgGrade !== null && avgGrade !== undefined && avgGrade >= 75;

                                return (
                                    <View key={r.id} style={academicHistoryPagesStyle.recordCard}>
                                        <View style={academicHistoryPagesStyle.recordCardTop}>
                                            <View style={{ flex: 1, marginRight: 8 }}>
                                                <Text style={academicHistoryPagesStyle.recordCardTitle}>
                                                    {r.className}
                                                </Text>
                                                <Text style={academicHistoryPagesStyle.recordCardSub}>
                                                    {r.section ? `Sec: ${r.section} • ` : ""}
                                                    {r.subject ? `${r.subject}` : "General"}
                                                </Text>
                                            </View>
                                            <View style={academicHistoryPagesStyle.yearBadge}>
                                                <Text style={academicHistoryPagesStyle.yearBadgeText}>
                                                    A.Y. {r.schoolYear}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Metrics Row */}
                                        <View style={academicHistoryPagesStyle.metricsGrid}>
                                            <View style={academicHistoryPagesStyle.metricCol}>
                                                <Text
                                                    style={[
                                                        academicHistoryPagesStyle.metricValue,
                                                        avgGrade !== null
                                                            ? { color: isPassing ? "#059669" : "#DC2626" }
                                                            : {},
                                                    ]}
                                                >
                                                    {avgGrade !== null && avgGrade !== undefined ? `${avgGrade}%` : "—"}
                                                </Text>
                                                <Text style={academicHistoryPagesStyle.metricLabel}>Avg Grade</Text>
                                            </View>

                                            <View style={academicHistoryPagesStyle.metricCol}>
                                                <Text style={academicHistoryPagesStyle.metricValue}>
                                                    {r.studentCount > 0
                                                        ? `${Math.round((r.passedCount / r.studentCount) * 100)}%`
                                                        : "—"}
                                                </Text>
                                                <Text style={academicHistoryPagesStyle.metricLabel}>
                                                    Passed ({r.passedCount}/{r.studentCount})
                                                </Text>
                                            </View>

                                            <View style={academicHistoryPagesStyle.metricCol}>
                                                <Text style={academicHistoryPagesStyle.metricValue}>
                                                    {r.averageAttendance !== null && r.averageAttendance !== undefined
                                                        ? `${r.averageAttendance}%`
                                                        : "—"}
                                                </Text>
                                                <Text style={academicHistoryPagesStyle.metricLabel}>Attendance</Text>
                                            </View>
                                        </View>

                                        {/* Actions: View Student Performance & Delete */}
                                        <View style={academicHistoryPagesStyle.cardActionsRow}>
                                            <Pressable
                                                style={academicHistoryPagesStyle.viewDetailsButton}
                                                onPress={() => handleOpenDetails(r)}
                                            >
                                                <Ionicons name="document-text-outline" size={16} color="#4F46E5" />
                                                <Text style={academicHistoryPagesStyle.viewDetailsButtonText}>
                                                    View Student Performance
                                                </Text>
                                            </Pressable>

                                            <Pressable
                                                style={academicHistoryPagesStyle.deleteIconButton}
                                                onPress={() => setDeletingRecord(r)}
                                                accessibilityLabel="Delete academic record"
                                            >
                                                <Ionicons name="trash-outline" size={18} color="#DC2626" />
                                            </Pressable>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <View style={academicHistoryPagesStyle.emptyCard}>
                            <View style={academicHistoryPagesStyle.emptyIconCircle}>
                                <Ionicons name="time-outline" size={32} color="#4F46E5" />
                            </View>
                            <Text style={academicHistoryPagesStyle.emptyTitle}>
                                No Academic Records Archived Yet
                            </Text>
                            <Text style={academicHistoryPagesStyle.emptySubtitle}>
                                When you mark an active school year as completed in Academic Settings, all student grades, performance breakdowns, and attendance records will be permanently archived and available here.
                            </Text>
                            <Pressable
                                style={academicHistoryPagesStyle.emptyActionBtn}
                                onPress={() => navigation.navigate("settings", { username })}
                            >
                                <Ionicons name="settings-outline" size={16} color="#FFFFFF" />
                                <Text style={academicHistoryPagesStyle.emptyActionBtnText}>
                                    Go to Academic Settings
                                </Text>
                            </Pressable>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Student Performance Details Modal */}
            <Modal
                visible={selectedRecordId !== null}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    setSelectedRecordId(null);
                    setRecordDetails(null);
                }}
            >
                <KeyboardAvoidingView
                    style={academicHistoryPagesStyle.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <View style={academicHistoryPagesStyle.modalContent}>
                        {/* Modal Header */}
                        <View style={academicHistoryPagesStyle.modalHeader}>
                            <View style={{ flex: 1, marginRight: 10 }}>
                                <Text style={academicHistoryPagesStyle.modalTitle}>
                                    {recordDetails?.className || "Class Archive"}
                                </Text>
                                <Text style={academicHistoryPagesStyle.modalSubtitle}>
                                    A.Y. {recordDetails?.schoolYear} • {recordDetails?.students.length ?? 0} Students
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => {
                                    setSelectedRecordId(null);
                                    setRecordDetails(null);
                                }}
                                hitSlop={8}
                            >
                                <Ionicons name="close" size={24} color="#64748B" />
                            </Pressable>
                        </View>

                        {isLoadingDetails ? (
                            <View style={{ paddingVertical: 40, alignItems: "center" }}>
                                <ActivityIndicator size="small" color="#4F46E5" />
                                <Text style={{ fontSize: 13, color: "#64748B", marginTop: 8 }}>
                                    Loading student records...
                                </Text>
                            </View>
                        ) : (
                            <ScrollView
                                style={academicHistoryPagesStyle.modalScrollView}
                                contentContainerStyle={academicHistoryPagesStyle.modalScrollContent}
                                showsVerticalScrollIndicator={true}
                                nestedScrollEnabled={true}
                            >
                                {/* Class Summary Banner */}
                                {recordDetails && (
                                    <View
                                        style={{
                                            backgroundColor: "#EEF2FF",
                                            borderRadius: 14,
                                            padding: 12,
                                            marginBottom: 14,
                                            flexDirection: "row",
                                            justifyContent: "space-around",
                                        }}
                                    >
                                        <View style={{ alignItems: "center" }}>
                                            <Text style={{ fontSize: 16, fontWeight: "800", color: "#4F46E5" }}>
                                                {recordDetails.averageGrade !== null ? `${recordDetails.averageGrade}%` : "—"}
                                            </Text>
                                            <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748B", marginTop: 1 }}>
                                                Class Average
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: "center" }}>
                                            <Text style={{ fontSize: 16, fontWeight: "800", color: "#059669" }}>
                                                {recordDetails.passedCount} of {recordDetails.studentCount}
                                            </Text>
                                            <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748B", marginTop: 1 }}>
                                                Passed Students
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: "center" }}>
                                            <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A" }}>
                                                {recordDetails.averageAttendance !== null
                                                    ? `${recordDetails.averageAttendance}%`
                                                    : "—"}
                                            </Text>
                                            <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748B", marginTop: 1 }}>
                                                Attendance
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Search Student Input */}
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        backgroundColor: "#F8FAFC",
                                        borderWidth: 1,
                                        borderColor: "#E2E8F0",
                                        borderRadius: 12,
                                        paddingHorizontal: 10,
                                        paddingVertical: 8,
                                        marginBottom: 12,
                                        gap: 8,
                                    }}
                                >
                                    <Ionicons name="search-outline" size={16} color="#94A3B8" />
                                    <TextInput
                                        style={{ flex: 1, fontSize: 13, color: "#0F172A", padding: 0 }}
                                        placeholder="Filter by student name or LRN..."
                                        placeholderTextColor="#94A3B8"
                                        value={studentSearchQuery}
                                        onChangeText={setStudentSearchQuery}
                                    />
                                    {studentSearchQuery.length > 0 && (
                                        <Pressable onPress={() => setStudentSearchQuery("")} hitSlop={6}>
                                            <Ionicons name="close-circle" size={14} color="#94A3B8" />
                                        </Pressable>
                                    )}
                                </View>

                                {/* Student Performance Cards */}
                                {filteredStudents.map((s) => {
                                    const isPassed = s.remarks === "Passed";

                                    return (
                                        <View key={s.id} style={academicHistoryPagesStyle.studentCard}>
                                            <View style={academicHistoryPagesStyle.studentCardTop}>
                                                <View style={{ flex: 1, marginRight: 8 }}>
                                                    <Text style={academicHistoryPagesStyle.studentName}>
                                                        {s.studentName}
                                                    </Text>
                                                    <Text style={academicHistoryPagesStyle.studentMeta}>
                                                        {s.lrn ? `LRN: ${s.lrn}` : "No LRN"}
                                                        {s.gender ? ` • ${s.gender}` : ""}
                                                    </Text>
                                                </View>

                                                <View
                                                    style={
                                                        isPassed
                                                            ? academicHistoryPagesStyle.gradeBadgeHigh
                                                            : academicHistoryPagesStyle.gradeBadgeFailed
                                                    }
                                                >
                                                    <Text
                                                        style={[
                                                            academicHistoryPagesStyle.gradeBadgeText,
                                                            { color: isPassed ? "#059669" : "#DC2626" },
                                                        ]}
                                                    >
                                                        {s.finalGrade !== null ? `${s.finalGrade}%` : "—"}
                                                    </Text>
                                                    <Text
                                                        style={[
                                                            academicHistoryPagesStyle.remarksText,
                                                            { color: isPassed ? "#047857" : "#B91C1C" },
                                                        ]}
                                                    >
                                                        {s.remarks}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Attendance & Quarter breakdown */}
                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                                                <View style={academicHistoryPagesStyle.attendanceBadge}>
                                                    <Ionicons name="checkmark-circle-outline" size={12} color="#059669" />
                                                    <Text style={academicHistoryPagesStyle.attendanceBadgeText}>
                                                        {s.attendanceRate !== null ? `${s.attendanceRate}% Attendance` : "100% Attendance"}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Quarter Grades Pills */}
                                            {s.quarterGrades && Object.keys(s.quarterGrades).length > 0 && (
                                                <View style={academicHistoryPagesStyle.quarterPillsRow}>
                                                    {Object.entries(s.quarterGrades).map(([qKey, qScore]) => (
                                                        <View key={qKey} style={academicHistoryPagesStyle.quarterPill}>
                                                            <Text style={academicHistoryPagesStyle.quarterPillText}>
                                                                {qKey}: {qScore !== null ? `${qScore}%` : "—"}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}

                                            {/* Weights Breakdown Chips */}
                                            {s.breakdown && s.breakdown.length > 0 && (
                                                <View style={{ flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                                                    {s.breakdown.map((b, bIdx) => (
                                                        <View
                                                            key={bIdx}
                                                            style={{
                                                                backgroundColor: "#FFFFFF",
                                                                paddingHorizontal: 7,
                                                                paddingVertical: 3,
                                                                borderRadius: 6,
                                                                borderWidth: 1,
                                                                borderColor: "#E2E8F0",
                                                            }}
                                                        >
                                                            <Text style={{ fontSize: 10, color: "#64748B", fontWeight: "600" }}>
                                                                {b.weightName}: {b.percentage}%
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}

                                <Pressable
                                    style={academicHistoryPagesStyle.cancelButton}
                                    onPress={() => {
                                        setSelectedRecordId(null);
                                        setRecordDetails(null);
                                    }}
                                >
                                    <Text style={academicHistoryPagesStyle.cancelButtonText}>Close Records</Text>
                                </Pressable>
                            </ScrollView>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Delete Record Confirmation Modal */}
            <Modal
                visible={deletingRecord !== null}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!isDeleting) setDeletingRecord(null);
                }}
            >
                <View style={academicHistoryPagesStyle.modalOverlay}>
                    <View style={academicHistoryPagesStyle.modalContent}>
                        <View style={academicHistoryPagesStyle.warningIconCircle}>
                            <Ionicons name="trash-outline" size={28} color="#DC2626" />
                        </View>
                        <Text style={[academicHistoryPagesStyle.modalTitle, { textAlign: "center" }]}>
                            Delete Academic Record
                        </Text>
                        <Text style={academicHistoryPagesStyle.deleteWarningText}>
                            Are you sure you want to delete this academic record? This action is permanent, and the record cannot be recovered once deleted.
                        </Text>
                        {deletingRecord && (
                            <View
                                style={{
                                    backgroundColor: "#F8FAFC",
                                    padding: 12,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: "#E2E8F0",
                                    marginBottom: 8,
                                }}
                            >
                                <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A", textAlign: "center" }}>
                                    {deletingRecord.className}
                                </Text>
                                <Text style={{ fontSize: 12, color: "#64748B", textAlign: "center", marginTop: 2 }}>
                                    School Year: {deletingRecord.schoolYear} • {deletingRecord.studentCount} Students
                                </Text>
                            </View>
                        )}

                        {deletingRecord && (data?.records || []).filter((r) => r.schoolYear === deletingRecord.schoolYear).length <= 1 && (
                            <View style={academicHistoryPagesStyle.singleRecordYearNotice}>
                                <Ionicons name="information-circle" size={16} color="#B91C1C" />
                                <Text style={academicHistoryPagesStyle.singleRecordYearNoticeText}>
                                    This is the only record for S.Y. {deletingRecord.schoolYear}. Deleting it will also remove S.Y. {deletingRecord.schoolYear} from your school year filter.
                                </Text>
                            </View>
                        )}

                        <Pressable
                            disabled={isDeleting}
                            onPress={handleConfirmDelete}
                            style={academicHistoryPagesStyle.dangerButton}
                        >
                            {isDeleting ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={academicHistoryPagesStyle.dangerButtonText}>
                                    Yes, Delete Record
                                </Text>
                            )}
                        </Pressable>

                        {deletingRecord && (data?.records || []).filter((r) => r.schoolYear === deletingRecord.schoolYear).length > 1 && (
                            <Pressable
                                disabled={isDeleting}
                                onPress={() => {
                                    const sy = deletingRecord.schoolYear;
                                    setDeletingRecord(null);
                                    setDeletingSchoolYear(sy);
                                }}
                                style={academicHistoryPagesStyle.secondaryDangerButton}
                            >
                                <Text style={academicHistoryPagesStyle.secondaryDangerButtonText}>
                                    Delete Entire S.Y. {deletingRecord.schoolYear} Archive
                                </Text>
                            </Pressable>
                        )}

                        <Pressable
                            disabled={isDeleting}
                            onPress={() => setDeletingRecord(null)}
                            style={academicHistoryPagesStyle.cancelButton}
                        >
                            <Text style={academicHistoryPagesStyle.cancelButtonText}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Delete Entire School Year Confirmation Modal */}
            <Modal
                visible={deletingSchoolYear !== null}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!isDeletingYear) setDeletingSchoolYear(null);
                }}
            >
                <View style={academicHistoryPagesStyle.modalOverlay}>
                    <View style={academicHistoryPagesStyle.modalContent}>
                        <View style={academicHistoryPagesStyle.warningIconCircle}>
                            <Ionicons name="trash-outline" size={28} color="#DC2626" />
                        </View>
                        <Text style={[academicHistoryPagesStyle.modalTitle, { textAlign: "center" }]}>
                            Delete School Year Archive
                        </Text>
                        <Text style={academicHistoryPagesStyle.deleteWarningText}>
                            Are you sure you want to delete all academic records for School Year {deletingSchoolYear}? All archived classes, grades, and student performance data for this year will be permanently deleted and removed from the year filter.
                        </Text>
                        {deletingSchoolYear && (
                            <View
                                style={{
                                    backgroundColor: "#FEF2F2",
                                    padding: 12,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: "#FECACA",
                                    marginBottom: 12,
                                }}
                            >
                                <Text style={{ fontSize: 14, fontWeight: "700", color: "#991B1B", textAlign: "center" }}>
                                    School Year: S.Y. {deletingSchoolYear}
                                </Text>
                                <Text style={{ fontSize: 12, color: "#B91C1C", textAlign: "center", marginTop: 2 }}>
                                    {(data?.records || []).filter((r) => r.schoolYear === deletingSchoolYear).length} class record(s) will be permanently deleted
                                </Text>
                            </View>
                        )}

                        <Pressable
                            disabled={isDeletingYear}
                            onPress={handleConfirmDeleteYear}
                            style={academicHistoryPagesStyle.dangerButton}
                        >
                            {isDeletingYear ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={academicHistoryPagesStyle.dangerButtonText}>
                                    Yes, Delete Entire School Year
                                </Text>
                            )}
                        </Pressable>

                        <Pressable
                            disabled={isDeletingYear}
                            onPress={() => setDeletingSchoolYear(null)}
                            style={academicHistoryPagesStyle.cancelButton}
                        >
                            <Text style={academicHistoryPagesStyle.cancelButtonText}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* School Year Picker Modal */}
            <Modal
                visible={isYearPickerModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsYearPickerModalOpen(false)}
            >
                <View style={academicHistoryPagesStyle.modalOverlay}>
                    <View style={academicHistoryPagesStyle.yearPickerModalContent}>
                        {/* Header */}
                        <View style={academicHistoryPagesStyle.modalHeader}>
                            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
                                <View style={academicHistoryPagesStyle.yearPickerHeaderIcon}>
                                    <Ionicons name="calendar" size={20} color="#4F46E5" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={academicHistoryPagesStyle.modalTitle}>Select School Year</Text>
                                    <Text style={academicHistoryPagesStyle.modalSubtitle}>
                                        Filter academic archives by school year
                                    </Text>
                                </View>
                            </View>
                            <Pressable
                                onPress={() => setIsYearPickerModalOpen(false)}
                                hitSlop={8}
                                accessibilityLabel="Close year picker"
                            >
                                <Ionicons name="close" size={24} color="#64748B" />
                            </Pressable>
                        </View>

                        <ScrollView
                            style={academicHistoryPagesStyle.modalScrollView}
                            contentContainerStyle={{ paddingBottom: 12 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* "All School Years" Option */}
                            <Pressable
                                onPress={() => {
                                    setSelectedSchoolYear("ALL");
                                    setIsYearPickerModalOpen(false);
                                }}
                                style={({ pressed }) => [
                                    academicHistoryPagesStyle.yearOptionItem,
                                    selectedSchoolYear === "ALL" && academicHistoryPagesStyle.yearOptionItemActive,
                                    pressed && academicHistoryPagesStyle.yearOptionItemPressed,
                                ]}
                            >
                                <View style={academicHistoryPagesStyle.yearOptionLeft}>
                                    <View
                                        style={[
                                            academicHistoryPagesStyle.yearOptionIconBox,
                                            selectedSchoolYear === "ALL" && academicHistoryPagesStyle.yearOptionIconBoxActive,
                                        ]}
                                    >
                                        <Ionicons
                                            name="albums-outline"
                                            size={18}
                                            color={selectedSchoolYear === "ALL" ? "#4F46E5" : "#64748B"}
                                        />
                                    </View>
                                    <View style={academicHistoryPagesStyle.yearOptionTextCol}>
                                        <Text
                                            style={[
                                                academicHistoryPagesStyle.yearOptionTitle,
                                                selectedSchoolYear === "ALL" && academicHistoryPagesStyle.yearOptionTitleActive,
                                            ]}
                                        >
                                            All School Years
                                        </Text>
                                        <Text style={academicHistoryPagesStyle.yearOptionSubtitle}>
                                            Show all {data?.records.length || 0} archived class records
                                        </Text>
                                    </View>
                                </View>
                                {selectedSchoolYear === "ALL" && (
                                    <Ionicons name="checkmark-circle" size={22} color="#4F46E5" />
                                )}
                            </Pressable>

                            {/* Available School Years */}
                            {availableSchoolYears.map((sy) => {
                                const isSelected = selectedSchoolYear === sy.schoolYear;
                                const isActiveYear = sy.status === "active";

                                return (
                                    <Pressable
                                        key={sy.schoolYear}
                                        onPress={() => {
                                            setSelectedSchoolYear(sy.schoolYear);
                                            setIsYearPickerModalOpen(false);
                                        }}
                                        style={({ pressed }) => [
                                            academicHistoryPagesStyle.yearOptionItem,
                                            isSelected && academicHistoryPagesStyle.yearOptionItemActive,
                                            pressed && academicHistoryPagesStyle.yearOptionItemPressed,
                                        ]}
                                    >
                                        <View style={academicHistoryPagesStyle.yearOptionLeft}>
                                            <View
                                                style={[
                                                    academicHistoryPagesStyle.yearOptionIconBox,
                                                    isSelected && academicHistoryPagesStyle.yearOptionIconBoxActive,
                                                ]}
                                            >
                                                <Ionicons
                                                    name="school-outline"
                                                    size={18}
                                                    color={isSelected ? "#4F46E5" : "#64748B"}
                                                />
                                            </View>
                                            <View style={academicHistoryPagesStyle.yearOptionTextCol}>
                                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                                    <Text
                                                        style={[
                                                            academicHistoryPagesStyle.yearOptionTitle,
                                                            isSelected && academicHistoryPagesStyle.yearOptionTitleActive,
                                                        ]}
                                                    >
                                                        S.Y. {sy.schoolYear}
                                                    </Text>
                                                    {isActiveYear ? (
                                                        <View style={academicHistoryPagesStyle.statusBadgeActive}>
                                                            <Text style={academicHistoryPagesStyle.statusBadgeActiveText}>
                                                                Active
                                                            </Text>
                                                        </View>
                                                    ) : (
                                                        <View style={academicHistoryPagesStyle.statusBadgeCompleted}>
                                                            <Text style={academicHistoryPagesStyle.statusBadgeCompletedText}>
                                                                Completed
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={academicHistoryPagesStyle.yearOptionSubtitle}>
                                                    {sy.classCount} class{sy.classCount === 1 ? "" : "es"}
                                                    {sy.totalStudents > 0 ? ` • ${sy.totalStudents} students` : ""}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                            {isSelected && (
                                                <Ionicons name="checkmark-circle" size={22} color="#4F46E5" />
                                            )}
                                            <Pressable
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    setIsYearPickerModalOpen(false);
                                                    setDeletingSchoolYear(sy.schoolYear);
                                                }}
                                                hitSlop={8}
                                                style={academicHistoryPagesStyle.yearItemDeleteBtn}
                                                accessibilityLabel={`Delete all records for S.Y. ${sy.schoolYear}`}
                                            >
                                                <Ionicons name="trash-outline" size={17} color="#DC2626" />
                                            </Pressable>
                                        </View>
                                    </Pressable>
                                );
                            })}

                            {availableSchoolYears.length === 0 && (
                                <View style={{ paddingVertical: 20, alignItems: "center" }}>
                                    <Text style={{ fontSize: 13, color: "#64748B", textAlign: "center" }}>
                                        No archived school years found yet.
                                    </Text>
                                </View>
                            )}
                        </ScrollView>

                        <Pressable
                            style={academicHistoryPagesStyle.cancelButton}
                            onPress={() => setIsYearPickerModalOpen(false)}
                        >
                            <Text style={academicHistoryPagesStyle.cancelButtonText}>Close</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Notification Dialog */}
            <DialogMessage
                visible={dialog.visible}
                type={dialog.type}
                title={dialog.title}
                message={dialog.message}
                onClose={() => setDialog((prev) => ({ ...prev, visible: false }))}
            />

            {/* Bottom Nav Bar */}
            <BottomNavBar activeTab="academichistory" onTabPress={handleTabPress} />
        </View>
    );
}

