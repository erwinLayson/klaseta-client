import React, { useCallback, useState } from "react";
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
    const [searchQuery, setSearchQuery] = useState("");

    // Details modal
    const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
    const [recordDetails, setRecordDetails] = useState<AcademicRecordDetails | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [studentSearchQuery, setStudentSearchQuery] = useState("");

    // Deletion confirmation modal
    const [deletingRecord, setDeletingRecord] = useState<AcademicRecordItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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
            const result = await deleteAcademicRecord(deletingRecord.id);
            if (result.success) {
                setDeletingRecord(null);
                if (selectedRecordId === deletingRecord.id) {
                    setSelectedRecordId(null);
                    setRecordDetails(null);
                }
                await loadHistory();
                setDialog({
                    visible: true,
                    type: "success",
                    title: "Record Deleted",
                    message: "The academic record and its student archives have been removed.",
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
            return nameMatch || secMatch || subMatch;
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

                    {/* School Year Filter Tabs */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={academicHistoryPagesStyle.filterRow}
                    >
                        <Pressable
                            style={[
                                academicHistoryPagesStyle.yearPill,
                                selectedSchoolYear === "ALL" && academicHistoryPagesStyle.yearPillActive,
                            ]}
                            onPress={() => setSelectedSchoolYear("ALL")}
                        >
                            <Text
                                style={[
                                    academicHistoryPagesStyle.yearPillText,
                                    selectedSchoolYear === "ALL" && academicHistoryPagesStyle.yearPillTextActive,
                                ]}
                            >
                                All School Years
                            </Text>
                        </Pressable>

                        {(data?.schoolYears || []).map((y) => {
                            const isSelected = selectedSchoolYear === y.schoolYear;
                            const isCompleted = y.status === "completed";

                            return (
                                <Pressable
                                    key={y.schoolYear}
                                    style={[
                                        academicHistoryPagesStyle.yearPill,
                                        isSelected && academicHistoryPagesStyle.yearPillActive,
                                    ]}
                                    onPress={() => setSelectedSchoolYear(y.schoolYear)}
                                >
                                    <Text
                                        style={[
                                            academicHistoryPagesStyle.yearPillText,
                                            isSelected && academicHistoryPagesStyle.yearPillTextActive,
                                        ]}
                                    >
                                        A.Y. {y.schoolYear}
                                    </Text>
                                    <View
                                        style={
                                            isCompleted
                                                ? academicHistoryPagesStyle.statusBadgeCompleted
                                                : academicHistoryPagesStyle.statusBadgeActive
                                        }
                                    >
                                        <Text
                                            style={
                                                isCompleted
                                                ? academicHistoryPagesStyle.statusBadgeCompletedText
                                                : academicHistoryPagesStyle.statusBadgeActiveText
                                            }
                                        >
                                            {isCompleted ? "Completed" : "Active"}
                                        </Text>
                                    </View>
                                </Pressable>
                            );
                        })}
                    </ScrollView>

                    {/* Search Bar if multiple records exist */}
                    {(data?.records.length || 0) > 0 && (
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                backgroundColor: "#FFFFFF",
                                borderWidth: 1,
                                borderColor: "#E2E8F0",
                                borderRadius: 14,
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                marginBottom: 16,
                                gap: 8,
                            }}
                        >
                            <Ionicons name="search-outline" size={18} color="#94A3B8" />
                            <TextInput
                                style={{ flex: 1, fontSize: 14, color: "#0F172A", padding: 0 }}
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

