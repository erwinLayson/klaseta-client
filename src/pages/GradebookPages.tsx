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
import { gradebookPagesStyle } from "../styles/index";
import { RootParamList } from "../types/RootParamList";
import type { Student } from "../types/student";
import type { ClassItem } from "../types/class";
import type {
    GradingWeight,
    Assessment,
    StudentCalculatedGrade,
} from "../types/gradebook";
import { calculateStudentGrade } from "../utils/gradeCalculator";
import { getClassesByTeacher } from "../services/pages/MyClassPages";
import {
    getGradebookSpreadsheet,
    createAssessment,
    updateAssessment,
    deleteAssessment,
    createGradingWeight,
    deleteGradingWeight,
    saveAllAssessmentScores,
} from "../services/pages/GradebookPages";
import {
    BottomNavBar,
    Button,
    InputGroup,
    SelectGroup,
    DialogMessage,
    CalendarPickerModal,
    type NavTab,
    type SelectOption,
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

export function GradebookPages() {
    const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>();
    const route = useRoute<RouteProp<RootParamList, "gradebook">>();
    const { username, classId: routeClassId } = route.params;

    // Class selection state
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
    const [classSearchQuery, setClassSearchQuery] = useState("");
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);

    const [students, setStudents] = useState<Student[]>([]);
    const [weights, setWeights] = useState<GradingWeight[]>([]);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [scoresMap, setScoresMap] = useState<Record<string, string>>({});
    const [savedScoresMap, setSavedScoresMap] = useState<Record<string, string>>({});
    const [attendanceMap, setAttendanceMap] = useState<Record<number, { present: number; total: number; percentage: number }>>({});

    // Filters
    const [nameQuery, setNameQuery] = useState("");
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [isDateSelectModalOpen, setIsDateSelectModalOpen] = useState(false);

    // Saving state
    const [isSaving, setIsSaving] = useState(false);

    // Create / Edit Assessment Modal
    const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
    const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
    const [assessmentTitle, setAssessmentTitle] = useState("");
    const [assessmentMaxScore, setAssessmentMaxScore] = useState("50");
    const [assessmentDate, setAssessmentDate] = useState(getTodayDateString());
    const [assessmentWeightId, setAssessmentWeightId] = useState<string>("NONE");
    const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);

    // Delete Assessment Modal
    const [deletingAssessment, setDeletingAssessment] = useState<Assessment | null>(null);
    const [isDeletingAssessment, setIsDeletingAssessment] = useState(false);

    // Grading Weights Modal
    const [isWeightsModalOpen, setIsWeightsModalOpen] = useState(false);
    const [isKebabOpen, setIsKebabOpen] = useState(false);
    const [newWeightName, setNewWeightName] = useState("");
    const [newWeightPercent, setNewWeightPercent] = useState("");
    const [isSubmittingWeight, setIsSubmittingWeight] = useState(false);

    // Hovered header cell id (for web / focus)
    const [hoveredAssessmentId, setHoveredAssessmentId] = useState<number | null>(null);

    // Selected student for grade calculation breakdown modal
    const [selectedBreakdownStudent, setSelectedBreakdownStudent] = useState<Student | null>(null);

    // Collapsed / Expanded student rows
    const [expandedStudentIds, setExpandedStudentIds] = useState<Record<number, boolean>>({});

    const toggleStudentExpanded = (studentId: number) => {
        setExpandedStudentIds((prev) => ({
            ...prev,
            [studentId]: !prev[studentId],
        }));
    };

    const isAllExpanded = useMemo(() => {
        if (students.length === 0) return false;
        return students.every((s) => expandedStudentIds[s.id]);
    }, [students, expandedStudentIds]);

    const handleToggleExpandAll = () => {
        if (isAllExpanded) {
            setExpandedStudentIds({});
        } else {
            const next: Record<number, boolean> = {};
            for (const s of students) {
                next[s.id] = true;
            }
            setExpandedStudentIds(next);
        }
    };

    // Dialog messages
    const [dialog, setDialog] = useState({
        visible: false,
        type: "success" as DialogType,
        title: "",
        message: "",
    });

    const activeClass = useMemo(() => {
        return classes.find((c) => c.id === selectedClassId) || null;
    }, [classes, selectedClassId]);

    // Filter classes for the cards view
    const filteredClasses = useMemo(() => {
        if (!classSearchQuery.trim()) return classes;
        const q = classSearchQuery.trim().toLowerCase();
        return classes.filter((c) => {
            const name = c.name.toLowerCase();
            const sec = (c.section || "").toLowerCase();
            const sub = (c.subject || "").toLowerCase();
            return name.includes(q) || sec.includes(q) || sub.includes(q);
        });
    }, [classes, classSearchQuery]);

    // Load classes
    useEffect(() => {
        let isMounted = true;
        const initClasses = async () => {
            setIsLoadingClasses(true);
            try {
                const list = await getClassesByTeacher(username);
                if (!isMounted) return;
                setClasses(list);

                if (routeClassId) {
                    setSelectedClassId(routeClassId);
                }
            } finally {
                if (isMounted) setIsLoadingClasses(false);
            }
        };
        initClasses();
        return () => {
            isMounted = false;
        };
    }, [username, routeClassId]);

    const loadSpreadsheetData = useCallback(async (cId?: number | null) => {
        const targetClassId = cId !== undefined ? cId : selectedClassId;
        const data = await getGradebookSpreadsheet(username, targetClassId);
        setStudents(data.students);
        setWeights(data.weights);
        setAssessments(data.assessments);
        setScoresMap(data.scoresMap);
        setSavedScoresMap(data.scoresMap);
        setAttendanceMap(data.attendanceMap || {});
    }, [username, selectedClassId]);

    useEffect(() => {
        let isMounted = true;
        if (selectedClassId === null) {
            return;
        }
        const fetchSpreadsheet = async () => {
            const data = await getGradebookSpreadsheet(username, selectedClassId);
            if (isMounted) {
                setStudents(data.students);
                setWeights(data.weights);
                setAssessments(data.assessments);
                setScoresMap(data.scoresMap);
                setSavedScoresMap(data.scoresMap);
                setAttendanceMap(data.attendanceMap || {});
            }
        };
        fetchSpreadsheet();
        return () => {
            isMounted = false;
        };
    }, [username, selectedClassId]);

    const handleTabPress = (tab: NavTab) => {
        if (tab !== "gradebook") {
            navigation.navigate(tab, { username });
        }
    };

    // Unsaved changes count
    const unsavedCount = useMemo(() => {
        let count = 0;
        for (const [key, val] of Object.entries(scoresMap)) {
            if (val !== (savedScoresMap[key] || "")) {
                count++;
            }
        }
        return count;
    }, [scoresMap, savedScoresMap]);

    const hasUnsavedChanges = unsavedCount > 0;

    // Filter students by name
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

    // Unique dates from all assessments (newest first)
    const uniqueAssessmentDates = useMemo(() => {
        const dates = Array.from(new Set(assessments.map((a) => a.date)));
        dates.sort((a, b) => b.localeCompare(a));
        return dates;
    }, [assessments]);

    // Filter assessments by specific selected date
    const filteredAssessments = useMemo(() => {
        if (!selectedDate) {
            return assessments;
        }
        return assessments.filter((a) => a.date === selectedDate);
    }, [assessments, selectedDate]);

    // Total weights percentage
    const totalWeightPercent = useMemo(() => {
        return weights.reduce((sum, w) => sum + w.weight, 0);
    }, [weights]);

    // Calculate final grades for each student based on their scores, weights & attendance
    const studentGradesMap = useMemo<Record<number, StudentCalculatedGrade>>(() => {
        const map: Record<number, StudentCalculatedGrade> = {};
        for (const student of students) {
            map[student.id] = calculateStudentGrade(
                student.id,
                assessments,
                weights,
                scoresMap,
                attendanceMap[student.id]
            );
        }
        return map;
    }, [students, assessments, weights, scoresMap, attendanceMap]);

    // Gradebook Stats
    const stats = useMemo(() => {
        const totalAssessments = assessments.length;
        let gradedCount = 0;
        for (const val of Object.values(scoresMap)) {
            if (val.trim() !== "") gradedCount++;
        }

        const gradedStudents = Object.values(studentGradesMap).filter((g) => g.numericGrade !== null);
        const sumGrades = gradedStudents.reduce((acc, g) => acc + (g.numericGrade ?? 0), 0);
        const avgGrade = gradedStudents.length > 0 ? Math.round((sumGrades / gradedStudents.length) * 10) / 10 : 0;

        const passingStudents = gradedStudents.filter((g) => (g.numericGrade ?? 0) >= 75);
        const passingRate = gradedStudents.length > 0 ? Math.round((passingStudents.length / gradedStudents.length) * 100) : 0;

        return {
            totalAssessments,
            gradedCount,
            avgGrade: gradedStudents.length > 0 ? `${avgGrade}%` : "—",
            passingRate: gradedStudents.length > 0 ? `${passingRate}%` : "—",
            passingCount: passingStudents.length,
            totalGradedStudents: gradedStudents.length,
        };
    }, [assessments, scoresMap, studentGradesMap]);

    // Options for SelectGroup when creating/editing assessment
    const weightSelectOptions = useMemo<SelectOption[]>(() => {
        const list: SelectOption[] = [
            { label: "No Specific Category", value: "NONE" },
        ];
        for (const w of weights) {
            // Exclude attendance category from assessment options since attendance is tracked on a separate page
            if (w.name.trim().toLowerCase().includes("attendance")) {
                continue;
            }
            list.push({
                label: `${w.name} (${w.weight}%)`,
                value: String(w.id),
            });
        }
        return list;
    }, [weights]);

    // Open Assessment Modal for Create
    const handleOpenCreateAssessment = () => {
        setEditingAssessment(null);
        setAssessmentTitle("");
        setAssessmentMaxScore("50");
        setAssessmentDate(getTodayDateString());
        const nonAttendanceWeights = weights.filter(
            (w) => !w.name.trim().toLowerCase().includes("attendance")
        );
        setAssessmentWeightId(
            nonAttendanceWeights.length > 0 ? String(nonAttendanceWeights[0].id) : "NONE"
        );
        setIsAssessmentModalOpen(true);
    };

    // Open Assessment Modal for Edit
    const handleOpenEditAssessment = (assessment: Assessment) => {
        setEditingAssessment(assessment);
        setAssessmentTitle(assessment.title);
        setAssessmentMaxScore(String(assessment.maxScore));
        setAssessmentDate(assessment.date);
        setAssessmentWeightId(assessment.weightId ? String(assessment.weightId) : "NONE");
        setIsAssessmentModalOpen(true);
    };

    // Submit Create or Update Assessment
    const handleSubmitAssessment = async () => {
        if (isSubmittingAssessment) return;

        if (!assessmentTitle.trim()) {
            setDialog({
                visible: true,
                type: "error",
                title: "Missing Title",
                message: "Please enter an assessment title.",
            });
            return;
        }

        const maxScoreNum = parseFloat(assessmentMaxScore);
        if (isNaN(maxScoreNum) || maxScoreNum <= 0) {
            setDialog({
                visible: true,
                type: "error",
                title: "Invalid Max Score",
                message: "Max score must be a number greater than 0.",
            });
            return;
        }

        if (!assessmentDate.trim()) {
            setDialog({
                visible: true,
                type: "error",
                title: "Missing Date",
                message: "Please specify a date for the assessment.",
            });
            return;
        }

        const weightId = assessmentWeightId === "NONE" ? null : Number(assessmentWeightId);

        setIsSubmittingAssessment(true);
        try {
            if (editingAssessment) {
                const result = await updateAssessment({
                    id: editingAssessment.id,
                    title: assessmentTitle.trim(),
                    maxScore: maxScoreNum,
                    date: assessmentDate.trim(),
                    weightId,
                });

                if (result.success) {
                    setIsAssessmentModalOpen(false);
                    await loadSpreadsheetData();
                    setDialog({
                        visible: true,
                        type: "success",
                        title: "Assessment Updated",
                        message: `"${assessmentTitle.trim()}" has been updated successfully.`,
                    });
                } else {
                    setDialog({
                        visible: true,
                        type: "error",
                        title: "Update Failed",
                        message: result.message,
                    });
                }
            } else {
                const result = await createAssessment(username, {
                    title: assessmentTitle.trim(),
                    maxScore: maxScoreNum,
                    date: assessmentDate.trim(),
                    weightId,
                    classId: selectedClassId ?? undefined,
                });

                if (result.success) {
                    setIsAssessmentModalOpen(false);
                    await loadSpreadsheetData();
                    setDialog({
                        visible: true,
                        type: "success",
                        title: "Assessment Created",
                        message: `"${assessmentTitle.trim()}" (Max Score: ${maxScoreNum}) has been added to the gradebook.`,
                    });
                } else {
                    setDialog({
                        visible: true,
                        type: "error",
                        title: "Creation Failed",
                        message: result.message,
                    });
                }
            }
        } finally {
            setIsSubmittingAssessment(false);
        }
    };

    // Confirm Delete Assessment
    const handleDeleteAssessment = async () => {
        if (!deletingAssessment || isDeletingAssessment) return;

        setIsDeletingAssessment(true);
        try {
            const result = await deleteAssessment(deletingAssessment.id);
            if (result.success) {
                setDeletingAssessment(null);
                await loadSpreadsheetData();
                setDialog({
                    visible: true,
                    type: "success",
                    title: "Assessment Deleted",
                    message: "Assessment and its student scores have been removed.",
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
            setIsDeletingAssessment(false);
        }
    };

    // Add New Grading Weight
    const handleAddWeight = async () => {
        if (isSubmittingWeight) return;

        if (!newWeightName.trim()) {
            setDialog({
                visible: true,
                type: "error",
                title: "Missing Category Name",
                message: "Please enter a weight category name (e.g. Quizzes, Projects).",
            });
            return;
        }

        const percent = parseFloat(newWeightPercent);
        if (isNaN(percent) || percent <= 0) {
            setDialog({
                visible: true,
                type: "error",
                title: "Invalid Percentage",
                message: "Weight percentage must be a number greater than 0.",
            });
            return;
        }

        setIsSubmittingWeight(true);
        try {
            const result = await createGradingWeight(
                username,
                newWeightName.trim(),
                percent,
                selectedClassId
            );
            if (result.success) {
                setNewWeightName("");
                setNewWeightPercent("");
                await loadSpreadsheetData();
            } else {
                setDialog({
                    visible: true,
                    type: "error",
                    title: "Failed to Add Weight",
                    message: result.message,
                });
            }
        } finally {
            setIsSubmittingWeight(false);
        }
    };

    // Delete Grading Weight
    const handleDeleteWeight = async (weightId: number) => {
        const result = await deleteGradingWeight(weightId);
        if (result.success) {
            await loadSpreadsheetData();
        } else {
            setDialog({
                visible: true,
                type: "error",
                title: "Failed",
                message: result.message,
            });
        }
    };

    // Handle Student Score Input with Validation
    // Score must NOT be greater than maxScore and NOT less than 0
    const handleScoreChange = (
        assessmentId: number,
        studentId: number,
        maxScore: number,
        inputValue: string
    ) => {
        const key = `${studentId}_${assessmentId}`;
        const trimmed = inputValue.trim();

        // Allow clearing the field
        if (trimmed === "") {
            setScoresMap((prev) => ({ ...prev, [key]: "" }));
            return;
        }

        // Allow typing numbers or decimals (e.g. "45" or "45.5")
        if (!/^\d*\.?\d*$/.test(trimmed)) {
            return;
        }

        const num = parseFloat(trimmed);
        if (isNaN(num)) {
            return;
        }

        // Must not be less than 0
        if (num < 0) {
            setDialog({
                visible: true,
                type: "error",
                title: "Invalid Score",
                message: "Student score cannot be less than 0.",
            });
            return;
        }

        // Must not be greater than maxScore
        if (num > maxScore) {
            setDialog({
                visible: true,
                type: "error",
                title: "Score Exceeds Max Score",
                message: `Inputted score (${num}) cannot be greater than the assessment max score (${maxScore}).`,
            });
            return;
        }

        setScoresMap((prev) => ({ ...prev, [key]: trimmed }));
    };

    // Manual Save All button
    const handleSaveAll = async () => {
        if (isSaving || !hasUnsavedChanges) return;

        setIsSaving(true);
        try {
            const recordsToSave: {
                assessmentId: number;
                studentId: number;
                score: number;
            }[] = [];

            for (const [key, scoreStr] of Object.entries(scoresMap)) {
                if (scoreStr.trim() !== "") {
                    const score = parseFloat(scoreStr);
                    if (!isNaN(score)) {
                        const [studentIdStr, assessmentIdStr] = key.split("_");
                        const studentId = Number(studentIdStr);
                        const assessmentId = Number(assessmentIdStr);

                        if (!isNaN(studentId) && !isNaN(assessmentId)) {
                            recordsToSave.push({ assessmentId, studentId, score });
                        }
                    }
                }
            }

            const success = await saveAllAssessmentScores(recordsToSave);

            if (success) {
                setSavedScoresMap({ ...scoresMap });
                setDialog({
                    visible: true,
                    type: "success",
                    title: "Scores Saved",
                    message: "All student assessment scores have been saved successfully.",
                });
            } else {
                setDialog({
                    visible: true,
                    type: "error",
                    title: "Save Failed",
                    message: "Could not save scores. Please try again.",
                });
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={gradebookPagesStyle.container}>
            <View style={gradebookPagesStyle.backgroundAccent} pointerEvents="none" />
            <View style={gradebookPagesStyle.backgroundAccentBottom} pointerEvents="none" />

            <ScrollView
                contentContainerStyle={gradebookPagesStyle.scrollView}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {!selectedClassId || !activeClass ? (
                    /* =========================================================================
                       VIEW 1: SELECT CLASS IN CARD FORMAT
                       ========================================================================= */
                    <>
                        <View style={gradebookPagesStyle.header}>
                            <View style={gradebookPagesStyle.headerTopRow}>
                                <View style={gradebookPagesStyle.headerTitleRow}>
                                    <Ionicons name="book-outline" size={26} color="#4F46E5" />
                                    <Text style={gradebookPagesStyle.greeting}>Class Gradebook</Text>
                                </View>
                            </View>
                            <Text style={gradebookPagesStyle.subtitle}>
                                Select a class card to view assessments, grading weights, and compute student grades
                            </Text>
                        </View>

                        {/* Search Filter for Classes */}
                        <View style={gradebookPagesStyle.filterContainer}>
                            <Ionicons name="search-outline" size={18} color="#94A3B8" />
                            <TextInput
                                style={gradebookPagesStyle.filterInput}
                                placeholder="Search classes by name, section, or subject..."
                                placeholderTextColor="#94A3B8"
                                value={classSearchQuery}
                                onChangeText={setClassSearchQuery}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {classSearchQuery.length > 0 && (
                                <Pressable
                                    onPress={() => setClassSearchQuery("")}
                                    style={gradebookPagesStyle.filterClearButton}
                                    hitSlop={8}
                                >
                                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                                </Pressable>
                            )}
                        </View>

                        {isLoadingClasses ? (
                            <View style={{ paddingVertical: 40, alignItems: "center" }}>
                                <ActivityIndicator size="large" color="#4F46E5" />
                                <Text style={{ color: "#64748B", marginTop: 10, fontSize: 14 }}>
                                    Loading classes...
                                </Text>
                            </View>
                        ) : filteredClasses.length === 0 ? (
                            <View style={gradebookPagesStyle.noClassesCard}>
                                <Ionicons name="school-outline" size={48} color="#94A3B8" />
                                <Text style={[gradebookPagesStyle.emptyText, { marginTop: 12 }]}>
                                    {classSearchQuery.trim()
                                        ? `No classes matching "${classSearchQuery}"`
                                        : "No Classes Created Yet"}
                                </Text>
                                <Text style={[gradebookPagesStyle.emptySubtext, { textAlign: "center", marginHorizontal: 20 }]}>
                                    {classSearchQuery.trim()
                                        ? "Try searching with a different keyword."
                                        : "Please create a class in My Class first before managing gradebook."}
                                </Text>
                                {!classSearchQuery.trim() && (
                                    <Pressable
                                        onPress={() => navigation.navigate("myclass", { username })}
                                        style={[gradebookPagesStyle.createButton, { marginTop: 16 }]}
                                    >
                                        <Ionicons name="school-outline" size={16} color="#FFFFFF" />
                                        <Text style={gradebookPagesStyle.createButtonText}>Go to My Classes</Text>
                                    </Pressable>
                                )}
                            </View>
                        ) : (
                            <View style={gradebookPagesStyle.classesGrid}>
                                {filteredClasses.map((item) => {
                                    const accentColor = item.color || "#4F46E5";
                                    return (
                                        <Pressable
                                            key={item.id}
                                            onPress={() => setSelectedClassId(item.id)}
                                            style={({ pressed }) => [
                                                gradebookPagesStyle.classCard,
                                                pressed && gradebookPagesStyle.classCardPressed,
                                            ]}
                                        >
                                            <View
                                                style={[
                                                    gradebookPagesStyle.classCardColorBar,
                                                    { backgroundColor: accentColor },
                                                ]}
                                            />
                                            <View style={gradebookPagesStyle.classCardBody}>
                                                <View style={gradebookPagesStyle.classCardTopRow}>
                                                    <View style={gradebookPagesStyle.classCardTitleBlock}>
                                                        <Text style={gradebookPagesStyle.classCardName} numberOfLines={1}>
                                                            {item.name}
                                                        </Text>
                                                        {item.subject ? (
                                                            <Text style={gradebookPagesStyle.classCardSubject} numberOfLines={1}>
                                                                {item.subject}
                                                            </Text>
                                                        ) : null}
                                                    </View>
                                                    {item.section ? (
                                                        <View
                                                            style={[
                                                                gradebookPagesStyle.classCardSectionBadge,
                                                                { backgroundColor: `${accentColor}1A` },
                                                            ]}
                                                        >
                                                            <Text style={[gradebookPagesStyle.classCardSectionText, { color: accentColor }]}>
                                                                {item.section}
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                </View>

                                                {(item.room || item.schedule) ? (
                                                    <View style={gradebookPagesStyle.classCardDetailsRow}>
                                                        {item.room ? (
                                                            <View style={gradebookPagesStyle.classCardDetailItem}>
                                                                <Ionicons name="location-outline" size={13} color="#64748B" />
                                                                <Text style={gradebookPagesStyle.classCardDetailText}>
                                                                    {item.room}
                                                                </Text>
                                                            </View>
                                                        ) : null}
                                                        {item.schedule ? (
                                                            <View style={gradebookPagesStyle.classCardDetailItem}>
                                                                <Ionicons name="time-outline" size={13} color="#64748B" />
                                                                <Text style={gradebookPagesStyle.classCardDetailText}>
                                                                    {item.schedule}
                                                                </Text>
                                                            </View>
                                                        ) : null}
                                                    </View>
                                                ) : null}

                                                <View style={gradebookPagesStyle.classCardFooter}>
                                                    <View style={gradebookPagesStyle.classCardStudentCountBadge}>
                                                        <Ionicons name="people" size={15} color="#475569" />
                                                        <Text style={gradebookPagesStyle.classCardStudentCountText}>
                                                            {item.studentCount || 0} Student{item.studentCount === 1 ? "" : "s"}
                                                        </Text>
                                                    </View>

                                                    <View
                                                        style={[
                                                            gradebookPagesStyle.classCardOpenBadge,
                                                            { backgroundColor: `${accentColor}15` },
                                                        ]}
                                                    >
                                                        <Text style={[gradebookPagesStyle.classCardOpenText, { color: accentColor }]}>
                                                            Open Gradebook
                                                        </Text>
                                                        <Ionicons name="chevron-forward" size={14} color={accentColor} />
                                                    </View>
                                                </View>
                                            </View>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}
                    </>
                ) : (
                    /* =========================================================================
                       VIEW 2: SHOW CLASS GRADEBOOK DETAILS & SPREADSHEET
                       ========================================================================= */
                    <>
                        {/* Class Header Card with Back to All Classes button & Actions */}
                        <View style={gradebookPagesStyle.classDetailHeaderCard}>
                            <View style={gradebookPagesStyle.classDetailTopBar}>
                                <Pressable
                                    onPress={() => setSelectedClassId(null)}
                                    style={gradebookPagesStyle.backButton}
                                    hitSlop={8}
                                >
                                    <Ionicons name="arrow-back" size={16} color="#4F46E5" />
                                    <Text style={gradebookPagesStyle.backButtonText}>All Classes</Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => setIsKebabOpen(true)}
                                    style={({ pressed }) => [
                                        gradebookPagesStyle.kebabButton,
                                        pressed && gradebookPagesStyle.kebabButtonPressed,
                                    ]}
                                    hitSlop={8}
                                    accessibilityLabel="Class options menu"
                                    accessibilityRole="button"
                                >
                                    <Ionicons name="ellipsis-vertical" size={20} color="#334155" />
                                </Pressable>
                            </View>

                            <Text style={gradebookPagesStyle.classDetailTitle}>
                                {activeClass.name}
                            </Text>
                            {activeClass.subject ? (
                                <Text style={gradebookPagesStyle.classDetailSubtitle}>
                                    {activeClass.subject}
                                </Text>
                            ) : null}

                            <View style={gradebookPagesStyle.classDetailMetaRow}>
                                {activeClass.section ? (
                                    <View style={gradebookPagesStyle.classDetailMetaBadge}>
                                        <Ionicons name="bookmark-outline" size={13} color="#475569" />
                                        <Text style={gradebookPagesStyle.classDetailMetaBadgeText}>
                                            Section: {activeClass.section}
                                        </Text>
                                    </View>
                                ) : null}
                                {activeClass.room ? (
                                    <View style={gradebookPagesStyle.classDetailMetaBadge}>
                                        <Ionicons name="location-outline" size={13} color="#475569" />
                                        <Text style={gradebookPagesStyle.classDetailMetaBadgeText}>
                                            {activeClass.room}
                                        </Text>
                                    </View>
                                ) : null}
                                {activeClass.schedule ? (
                                    <View style={gradebookPagesStyle.classDetailMetaBadge}>
                                        <Ionicons name="time-outline" size={13} color="#475569" />
                                        <Text style={gradebookPagesStyle.classDetailMetaBadgeText}>
                                            {activeClass.schedule}
                                        </Text>
                                    </View>
                                ) : null}
                                <View style={gradebookPagesStyle.classDetailMetaBadge}>
                                    <Ionicons name="people" size={13} color="#4F46E5" />
                                    <Text style={[gradebookPagesStyle.classDetailMetaBadgeText, { color: "#4F46E5", fontWeight: "700" }]}>
                                        {students.length} Enrolled
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Stats Summary */}
                        <View style={gradebookPagesStyle.statsRow}>
                    <View style={gradebookPagesStyle.statCard}>
                        <Text style={gradebookPagesStyle.statValue}>
                            {stats.totalAssessments}
                        </Text>
                        <Text style={gradebookPagesStyle.statLabel}>Assessments</Text>
                    </View>
                    <View style={gradebookPagesStyle.statCard}>
                        <Text style={[gradebookPagesStyle.statValue, { color: "#16A34A" }]}>
                            {stats.gradedCount}
                        </Text>
                        <Text style={gradebookPagesStyle.statLabel}>Scores Recorded</Text>
                    </View>
                    <View style={gradebookPagesStyle.statCard}>
                        <Text style={[gradebookPagesStyle.statValue, { color: "#059669" }]}>
                            {stats.avgGrade}
                        </Text>
                        <Text style={gradebookPagesStyle.statLabel}>Class Avg</Text>
                    </View>
                    <View style={gradebookPagesStyle.statCard}>
                        <Text style={[gradebookPagesStyle.statValue, { color: "#4F46E5" }]}>
                            {stats.passingRate}
                        </Text>
                        <Text style={gradebookPagesStyle.statLabel}>Passing Rate</Text>
                    </View>
                </View>

                {/* Section Title & Status Bar */}
                <View style={gradebookPagesStyle.section}>
                    <View style={gradebookPagesStyle.sectionHeaderRow}>
                        <View style={gradebookPagesStyle.sectionHeaderLeft}>
                            <View style={gradebookPagesStyle.countBadge}>
                                <Text style={gradebookPagesStyle.countBadgeText}>
                                    {filteredStudents.length} of {students.length} students
                                </Text>
                            </View>
                            <View style={gradebookPagesStyle.countBadge}>
                                <Text style={gradebookPagesStyle.countBadgeText}>
                                    {filteredAssessments.length} of {assessments.length} assessments
                                </Text>
                            </View>

                            {/* Expand All / Collapse All Button */}
                            {students.length > 0 && (
                                <Pressable
                                    onPress={handleToggleExpandAll}
                                    style={gradebookPagesStyle.expandAllBtn}
                                    hitSlop={6}
                                >
                                    <Ionicons
                                        name={isAllExpanded ? "contract-outline" : "expand-outline"}
                                        size={12}
                                        color="#4F46E5"
                                    />
                                    <Text style={gradebookPagesStyle.expandAllBtnText}>
                                        {isAllExpanded ? "Collapse All" : "Expand All"}
                                    </Text>
                                </Pressable>
                            )}

                            {hasUnsavedChanges && (
                                <View style={gradebookPagesStyle.unsavedBadge}>
                                    <Ionicons name="alert-circle" size={12} color="#D97706" />
                                    <Text style={gradebookPagesStyle.unsavedBadgeText}>
                                        {unsavedCount} unsaved
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Horizontal Flexbox Row: Search Filter, Filter by Date, and Save All Button */}
                    <View style={gradebookPagesStyle.controlsRow}>
                        {/* 1. Search Filter by Student Name */}
                        <View style={gradebookPagesStyle.filterInputWrapper}>
                            <Ionicons name="search-outline" size={17} color="#4F46E5" />
                            <TextInput
                                style={gradebookPagesStyle.filterInput}
                                placeholder="Search student name..."
                                placeholderTextColor="#94A3B8"
                                value={nameQuery}
                                onChangeText={setNameQuery}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {nameQuery.length > 0 && (
                                <Pressable
                                    onPress={() => setNameQuery("")}
                                    style={gradebookPagesStyle.filterClearButton}
                                    hitSlop={8}
                                >
                                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                                </Pressable>
                            )}
                        </View>

                        {/* 2. Filter Assessments by Specific Date */}
                        <Pressable
                            onPress={() => setIsDateSelectModalOpen(true)}
                            style={({ pressed }) => [
                                gradebookPagesStyle.filterSelectWrapper,
                                selectedDate !== "" && gradebookPagesStyle.filterSelectWrapperActive,
                                pressed && gradebookPagesStyle.filterSelectWrapperPressed,
                            ]}
                        >
                            <View style={gradebookPagesStyle.filterSelectLeft}>
                                <Ionicons
                                    name={selectedDate ? "calendar" : "calendar-outline"}
                                    size={17}
                                    color={selectedDate ? "#059669" : "#64748B"}
                                />
                                <Text
                                    style={[
                                        gradebookPagesStyle.filterSelectValue,
                                        !selectedDate && gradebookPagesStyle.filterSelectPlaceholder,
                                    ]}
                                    numberOfLines={1}
                                >
                                    {selectedDate ? formatDateHeader(selectedDate) : "All Dates (Filter)"}
                                </Text>
                            </View>

                            <View style={gradebookPagesStyle.filterSelectRight}>
                                {selectedDate !== "" ? (
                                    <Pressable
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            setSelectedDate("");
                                        }}
                                        hitSlop={8}
                                        style={gradebookPagesStyle.filterClearButton}
                                    >
                                        <Ionicons name="close-circle" size={16} color="#94A3B8" />
                                    </Pressable>
                                ) : (
                                    <Ionicons name="chevron-down" size={15} color="#64748B" />
                                )}
                            </View>
                        </Pressable>

                        {/* 3. Save All Button */}
                        <Pressable
                            onPress={handleSaveAll}
                            disabled={isSaving || !hasUnsavedChanges}
                            style={({ pressed }) => [
                                gradebookPagesStyle.saveAllButton,
                                !hasUnsavedChanges && gradebookPagesStyle.saveAllButtonDisabled,
                                pressed && hasUnsavedChanges && gradebookPagesStyle.saveAllButtonPressed,
                            ]}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Ionicons
                                    name="save-outline"
                                    size={16}
                                    color={hasUnsavedChanges ? "#FFFFFF" : "#94A3B8"}
                                />
                            )}
                            <Text
                                style={[
                                    gradebookPagesStyle.saveAllButtonText,
                                    !hasUnsavedChanges && gradebookPagesStyle.saveAllButtonTextDisabled,
                                ]}
                            >
                                {isSaving ? "Saving..." : "Save All"}
                            </Text>
                        </Pressable>
                    </View>

                    {/* Spreadsheet Table View */}
                    {students.length === 0 ? (
                        <View style={gradebookPagesStyle.emptyCard}>
                            <Ionicons
                                name="people-outline"
                                size={44}
                                color="#94A3B8"
                                style={gradebookPagesStyle.emptyIcon}
                            />
                            <Text style={gradebookPagesStyle.emptyText}>No students in your class</Text>
                            <Text style={gradebookPagesStyle.emptySubtext}>
                                Add students in the My Class tab before recording scores.
                            </Text>
                        </View>
                    ) : assessments.length === 0 ? (
                        <View style={gradebookPagesStyle.emptyCard}>
                            <Ionicons
                                name="document-text-outline"
                                size={44}
                                color="#94A3B8"
                                style={gradebookPagesStyle.emptyIcon}
                            />
                            <Text style={gradebookPagesStyle.emptyText}>No assessments created yet</Text>
                            <Text style={gradebookPagesStyle.emptySubtext}>
                                Create your first assessment (quiz, exam, project) to start recording student grades.
                            </Text>
                            <Pressable
                                onPress={handleOpenCreateAssessment}
                                style={({ pressed }) => [
                                    gradebookPagesStyle.createButton,
                                    pressed && gradebookPagesStyle.createButtonPressed,
                                ]}
                            >
                                <Ionicons name="add" size={18} color="#FFFFFF" />
                                <Text style={gradebookPagesStyle.createButtonText}>
                                    Create First Assessment
                                </Text>
                            </Pressable>
                        </View>
                    ) : filteredStudents.length === 0 ? (
                        <View style={gradebookPagesStyle.emptyCard}>
                            <Ionicons
                                name="person-outline"
                                size={36}
                                color="#94A3B8"
                                style={gradebookPagesStyle.emptyIcon}
                            />
                            <Text style={gradebookPagesStyle.emptyText}>
                                No students found matching &quot;{nameQuery}&quot;
                            </Text>
                            <Text style={gradebookPagesStyle.emptySubtext}>
                                Try searching with a different name or spelling.
                            </Text>
                            <Pressable
                                onPress={() => setNameQuery("")}
                                style={gradebookPagesStyle.clearFilterButton}
                            >
                                <Text style={gradebookPagesStyle.clearFilterButtonText}>
                                    Clear Name Filter
                                </Text>
                            </Pressable>
                        </View>
                    ) : filteredAssessments.length === 0 ? (
                        <View style={gradebookPagesStyle.emptyCard}>
                            <Ionicons
                                name="calendar-outline"
                                size={36}
                                color="#94A3B8"
                                style={gradebookPagesStyle.emptyIcon}
                            />
                            <Text style={gradebookPagesStyle.emptyText}>
                                No assessments found for this date
                            </Text>
                            <Text style={gradebookPagesStyle.emptySubtext}>
                                Clear the date filter to view all assessments.
                            </Text>
                            <Pressable
                                onPress={() => setSelectedDate("")}
                                style={gradebookPagesStyle.clearFilterButton}
                            >
                                <Text style={gradebookPagesStyle.clearFilterButtonText}>
                                    Show All Dates
                                </Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={gradebookPagesStyle.spreadsheetCard}>
                            <View style={gradebookPagesStyle.spreadsheetWrapper}>
                                {/* First Column: Fixed Student Names & Calculated Grades */}
                                <View style={gradebookPagesStyle.studentFixedColumn}>
                                    {/* Header Cell */}
                                    <View style={gradebookPagesStyle.studentHeaderCell}>
                                        <View style={gradebookPagesStyle.studentHeaderTopRow}>
                                            <Text style={gradebookPagesStyle.studentHeaderCellText}>
                                                Student Name
                                            </Text>
                                            <Text style={gradebookPagesStyle.gradeHeaderColText}>
                                                Grade
                                            </Text>
                                        </View>
                                        <Text style={gradebookPagesStyle.studentHeaderCellSub}>
                                            {filteredStudents.length} Students • Avg: {stats.avgGrade}
                                        </Text>
                                    </View>

                                    {/* Student Rows with Collapsible & Expandable Details */}
                                    {filteredStudents.map((student, idx) => {
                                        const isExpanded = !!expandedStudentIds[student.id];
                                        const gradeInfo = studentGradesMap[student.id];
                                        const num = gradeInfo?.numericGrade ?? null;
                                        const isHigh = num !== null && num >= 90;
                                        const isMid = num !== null && num >= 80 && num < 90;
                                        const isPassing = num !== null && num >= 75 && num < 80;
                                        const isFailed = num !== null && num < 75;

                                        return (
                                            <View
                                                key={student.id}
                                                style={[
                                                    gradebookPagesStyle.studentRowContainer,
                                                    idx % 2 === 0
                                                        ? gradebookPagesStyle.rowEven
                                                        : gradebookPagesStyle.rowOdd,
                                                    isExpanded && gradebookPagesStyle.rowExpanded,
                                                ]}
                                            >
                                                {/* Main Row (height 52) */}
                                                <Pressable
                                                    onPress={() => toggleStudentExpanded(student.id)}
                                                    style={gradebookPagesStyle.studentRowMain}
                                                >
                                                    <Ionicons
                                                        name={isExpanded ? "chevron-down" : "chevron-forward"}
                                                        size={14}
                                                        color="#64748B"
                                                        style={{ marginRight: 2 }}
                                                    />

                                                    <Text
                                                        style={gradebookPagesStyle.studentRowText}
                                                        numberOfLines={1}
                                                    >
                                                        {student.firstname} {student.lastname}
                                                    </Text>

                                                    <Pressable
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedBreakdownStudent(student);
                                                        }}
                                                        hitSlop={4}
                                                        style={[
                                                            gradebookPagesStyle.studentGradePill,
                                                            isHigh
                                                                ? gradebookPagesStyle.gradeBadgeHigh
                                                                : isMid
                                                                    ? gradebookPagesStyle.gradeBadgeMid
                                                                    : isPassing
                                                                        ? gradebookPagesStyle.gradeBadgePassing
                                                                        : isFailed
                                                                            ? gradebookPagesStyle.gradeBadgeFailed
                                                                            : gradebookPagesStyle.gradeBadgeEmpty,
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                gradebookPagesStyle.studentGradePillText,
                                                                isHigh
                                                                    ? gradebookPagesStyle.gradeTextHigh
                                                                    : isMid
                                                                        ? gradebookPagesStyle.gradeTextMid
                                                                        : isPassing
                                                                            ? gradebookPagesStyle.gradeTextPassing
                                                                            : isFailed
                                                                                ? gradebookPagesStyle.gradeTextFailed
                                                                                : gradebookPagesStyle.gradeTextEmpty,
                                                            ]}
                                                        >
                                                            {gradeInfo?.displayGrade || "—"}
                                                        </Text>
                                                    </Pressable>
                                                </Pressable>

                                                {/* Expanded Details Drawer (height 56) */}
                                                {isExpanded && (
                                                    <View style={gradebookPagesStyle.studentRowExpandedDrawer}>
                                                        <View style={gradebookPagesStyle.expandedMetaRow}>
                                                            <View style={gradebookPagesStyle.expandedStatusBadge}>
                                                                <Text style={gradebookPagesStyle.expandedStatusText}>
                                                                    {gradeInfo?.statusLabel || "No Scores"} ({gradeInfo?.letterGrade || "—"})
                                                                </Text>
                                                            </View>

                                                            <Pressable
                                                                onPress={() => setSelectedBreakdownStudent(student)}
                                                                hitSlop={6}
                                                                style={gradebookPagesStyle.expandedViewBtn}
                                                            >
                                                                <Text style={gradebookPagesStyle.expandedViewBtnText}>Breakdown</Text>
                                                                <Ionicons name="arrow-forward" size={11} color="#4F46E5" />
                                                            </Pressable>
                                                        </View>

                                                        <View style={gradebookPagesStyle.expandedChipsRow}>
                                                            {gradeInfo && gradeInfo.breakdown.length > 0 ? (
                                                                gradeInfo.breakdown.slice(0, 3).map((b, bIdx) => (
                                                                    <View key={bIdx} style={gradebookPagesStyle.expandedChip}>
                                                                        <Text style={gradebookPagesStyle.expandedChipText} numberOfLines={1}>
                                                                            {b.weightName.slice(0, 8)}: {b.percentage}%
                                                                        </Text>
                                                                    </View>
                                                                ))
                                                            ) : (
                                                                <Text style={gradebookPagesStyle.expandedEmptyHint}>
                                                                    No assessments graded yet
                                                                </Text>
                                                            )}
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>

                                {/* Horizontally Scrollable Assessment Columns */}
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={true}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    <View>
                                        {/* Assessment Header Row */}
                                        <View style={{ flexDirection: "row" }}>
                                            {filteredAssessments.map((assessment) => {
                                                const isHovered = hoveredAssessmentId === assessment.id;

                                                return (
                                                    <View
                                                        key={assessment.id}
                                                        style={gradebookPagesStyle.assessmentHeaderCell}
                                                        // Web hover support
                                                        {...(Platform.OS === "web"
                                                            ? {
                                                                onMouseEnter: () => setHoveredAssessmentId(assessment.id),
                                                                onMouseLeave: () => setHoveredAssessmentId(null),
                                                            }
                                                            : {})}
                                                    >
                                                        {/* Top row: Title + Edit/Delete Icons on Hover */}
                                                        <View style={gradebookPagesStyle.assessmentHeaderTopRow}>
                                                            <Text
                                                                style={gradebookPagesStyle.assessmentTitle}
                                                                numberOfLines={1}
                                                            >
                                                                {assessment.title}
                                                            </Text>

                                                            {/* Edit and Delete Icons (visible on hover or always accessible) */}
                                                            <View
                                                                style={[
                                                                    gradebookPagesStyle.headerActionIcons,
                                                                    Platform.OS === "web" && !isHovered && { opacity: 0.3 },
                                                                ]}
                                                            >
                                                                <Pressable
                                                                    onPress={() => handleOpenEditAssessment(assessment)}
                                                                    style={gradebookPagesStyle.actionIconBtn}
                                                                    hitSlop={6}
                                                                >
                                                                    <Ionicons name="pencil" size={13} color="#4F46E5" />
                                                                </Pressable>

                                                                <Pressable
                                                                    onPress={() => setDeletingAssessment(assessment)}
                                                                    style={gradebookPagesStyle.actionIconBtn}
                                                                    hitSlop={6}
                                                                >
                                                                    <Ionicons name="trash-outline" size={13} color="#EF4444" />
                                                                </Pressable>
                                                            </View>
                                                        </View>

                                                        {/* Badges: Category & Max Score */}
                                                        <View style={gradebookPagesStyle.assessmentMetaRow}>
                                                            {assessment.weightName ? (
                                                                <View style={gradebookPagesStyle.weightBadge}>
                                                                    <Text style={gradebookPagesStyle.weightBadgeText}>
                                                                        {assessment.weightName}
                                                                    </Text>
                                                                </View>
                                                            ) : null}

                                                            <View style={gradebookPagesStyle.maxScoreBadge}>
                                                                <Text style={gradebookPagesStyle.maxScoreBadgeText}>
                                                                    Max: {assessment.maxScore}
                                                                </Text>
                                                            </View>
                                                        </View>

                                                        {/* Date created */}
                                                        <Text style={gradebookPagesStyle.assessmentDateText}>
                                                            {formatDateHeader(assessment.date)}
                                                        </Text>
                                                    </View>
                                                );
                                            })}
                                        </View>

                                        {/* Score Input Cells per Student Row */}
                                        {filteredStudents.map((student, rowIdx) => {
                                            const isExpanded = !!expandedStudentIds[student.id];

                                            return (
                                                <View
                                                    key={student.id}
                                                    style={[
                                                        { flexDirection: "row" },
                                                        rowIdx % 2 === 0
                                                            ? gradebookPagesStyle.rowEven
                                                            : gradebookPagesStyle.rowOdd,
                                                        isExpanded && gradebookPagesStyle.rowExpanded,
                                                    ]}
                                                >
                                                    {filteredAssessments.map((assessment) => {
                                                        const key = `${student.id}_${assessment.id}`;
                                                        const currentScore = scoresMap[key] || "";
                                                        const hasVal = currentScore.trim().length > 0;
                                                        const numVal = parseFloat(currentScore);
                                                        const isInvalid = hasVal && (numVal > assessment.maxScore || numVal < 0);
                                                        const percent = hasVal && !isInvalid && assessment.maxScore > 0
                                                            ? Math.round((numVal / assessment.maxScore) * 100)
                                                            : null;

                                                        return (
                                                            <View
                                                                key={assessment.id}
                                                                style={[
                                                                    gradebookPagesStyle.scoreCell,
                                                                    isExpanded && gradebookPagesStyle.scoreCellExpandedHeight,
                                                                ]}
                                                            >
                                                                <View style={gradebookPagesStyle.scoreCellMain}>
                                                                    <View
                                                                        style={[
                                                                            gradebookPagesStyle.scoreInputWrapper,
                                                                            isInvalid
                                                                                ? gradebookPagesStyle.scoreInputError
                                                                                : hasVal
                                                                                    ? gradebookPagesStyle.scoreInputHasValue
                                                                                    : gradebookPagesStyle.scoreInputValid,
                                                                        ]}
                                                                    >
                                                                        <TextInput
                                                                            style={gradebookPagesStyle.scoreInput}
                                                                            value={currentScore}
                                                                            placeholder="—"
                                                                            placeholderTextColor="#CBD5E1"
                                                                            keyboardType="decimal-pad"
                                                                            selectTextOnFocus={true}
                                                                            onChangeText={(val) =>
                                                                                handleScoreChange(
                                                                                    assessment.id,
                                                                                    student.id,
                                                                                    assessment.maxScore,
                                                                                    val
                                                                                )
                                                                            }
                                                                        />
                                                                        <Text style={gradebookPagesStyle.scoreMaxHint}>
                                                                            /{assessment.maxScore}
                                                                        </Text>
                                                                    </View>
                                                                </View>

                                                                {/* Expanded Percentage & Weight Details */}
                                                                {isExpanded && (
                                                                    <View style={gradebookPagesStyle.scoreCellDrawer}>
                                                                        {percent !== null ? (
                                                                            <View
                                                                                style={[
                                                                                    gradebookPagesStyle.cellPercentBadge,
                                                                                    percent >= 75
                                                                                        ? gradebookPagesStyle.cellPercentBadgePassed
                                                                                        : gradebookPagesStyle.cellPercentBadgeFailed,
                                                                                ]}
                                                                            >
                                                                                <Text
                                                                                    style={[
                                                                                        gradebookPagesStyle.cellPercentText,
                                                                                        percent >= 75
                                                                                            ? { color: "#15803D" }
                                                                                            : { color: "#DC2626" },
                                                                                    ]}
                                                                                >
                                                                                    {percent}%
                                                                                </Text>
                                                                            </View>
                                                                        ) : (
                                                                            <Text style={gradebookPagesStyle.cellPercentEmpty}>
                                                                                Unscored
                                                                            </Text>
                                                                        )}
                                                                        <Text style={gradebookPagesStyle.cellWeightLabel} numberOfLines={1}>
                                                                            {assessment.weightName || "Standard"}
                                                                        </Text>
                                                                    </View>
                                                                )}
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            );
                                        })}
                                    </View>
                                </ScrollView>
                            </View>
                        </View>
                    )}
                </View>
                </>
                )}
            </ScrollView>

            {/* Create / Edit Assessment Modal */}
            <Modal
                visible={isAssessmentModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!isSubmittingAssessment) setIsAssessmentModalOpen(false);
                }}
            >
                <KeyboardAvoidingView
                    style={gradebookPagesStyle.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <View style={gradebookPagesStyle.modalContent}>
                        <View style={gradebookPagesStyle.modalHeader}>
                            <Text style={gradebookPagesStyle.modalTitle}>
                                {editingAssessment ? "Edit Assessment" : "New Assessment"}
                            </Text>
                            <Pressable
                                onPress={() => {
                                    if (!isSubmittingAssessment) setIsAssessmentModalOpen(false);
                                }}
                                hitSlop={8}
                            >
                                <Ionicons name="close" size={22} color="#64748B" />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <InputGroup
                                label="Assessment Title"
                                placeholder="e.g. Quiz 1: Fractions, Midterm Exam"
                                value={assessmentTitle}
                                onChangeText={setAssessmentTitle}
                            />

                            <InputGroup
                                label="Max Score (Total Points)"
                                placeholder="e.g. 50, 100"
                                value={assessmentMaxScore}
                                onChangeText={setAssessmentMaxScore}
                                keyboardType="number-pad"
                            />

                            {/* Date input with quick Today chip */}
                            <View style={gradebookPagesStyle.dateQuickChipsRow}>
                                <Pressable
                                    onPress={() => setAssessmentDate(getTodayDateString())}
                                    style={gradebookPagesStyle.dateQuickChip}
                                >
                                    <Text style={gradebookPagesStyle.dateQuickChipText}>Today</Text>
                                </Pressable>
                            </View>

                            <InputGroup
                                label="Date Created (YYYY-MM-DD)"
                                placeholder="e.g. 2026-11-04"
                                value={assessmentDate}
                                onChangeText={setAssessmentDate}
                            />

                            <SelectGroup
                                label="Grading Weight / Category"
                                value={assessmentWeightId}
                                options={weightSelectOptions}
                                onSelect={(val) => setAssessmentWeightId(val)}
                                placeholder="Select category"
                            />

                            <Button
                                label={
                                    isSubmittingAssessment
                                        ? "Saving..."
                                        : editingAssessment
                                            ? "Update Assessment"
                                            : "Create Assessment"
                                }
                                onPress={handleSubmitAssessment}
                            />

                            <Pressable
                                onPress={() => {
                                    if (!isSubmittingAssessment) setIsAssessmentModalOpen(false);
                                }}
                                style={gradebookPagesStyle.cancelButton}
                            >
                                <Text style={gradebookPagesStyle.cancelButtonText}>Cancel</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Delete Assessment Confirmation Modal */}
            <Modal
                visible={deletingAssessment !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setDeletingAssessment(null)}
            >
                <View style={gradebookPagesStyle.modalOverlay}>
                    <View style={gradebookPagesStyle.modalContent}>
                        <View style={gradebookPagesStyle.modalHeader}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <Ionicons name="alert-circle" size={22} color="#EF4444" />
                                <Text style={gradebookPagesStyle.modalTitle}>Delete Assessment</Text>
                            </View>
                            <Pressable
                                onPress={() => setDeletingAssessment(null)}
                                hitSlop={8}
                            >
                                <Ionicons name="close" size={22} color="#64748B" />
                            </Pressable>
                        </View>

                        <Text style={{ fontSize: 14, color: "#334155", lineHeight: 21, marginBottom: 16 }}>
                            Are you sure you want to delete &quot;{deletingAssessment?.title}&quot;? All student scores for this assessment will be permanently deleted.
                        </Text>

                        <Pressable
                            onPress={handleDeleteAssessment}
                            disabled={isDeletingAssessment}
                            style={gradebookPagesStyle.dangerButton}
                        >
                            {isDeletingAssessment ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={gradebookPagesStyle.dangerButtonText}>
                                    Yes, Delete Assessment
                                </Text>
                            )}
                        </Pressable>

                        <Pressable
                            onPress={() => setDeletingAssessment(null)}
                            style={gradebookPagesStyle.cancelButton}
                        >
                            <Text style={gradebookPagesStyle.cancelButtonText}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Grading Weights Management Modal */}
            <Modal
                visible={isWeightsModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsWeightsModalOpen(false)}
            >
                <KeyboardAvoidingView
                    style={gradebookPagesStyle.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <View style={gradebookPagesStyle.modalContent}>
                        <View style={gradebookPagesStyle.modalHeader}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <Ionicons name="pie-chart" size={22} color="#4F46E5" />
                                <Text style={gradebookPagesStyle.modalTitle}>Grading Weights</Text>
                            </View>
                            <Pressable
                                onPress={() => setIsWeightsModalOpen(false)}
                                hitSlop={8}
                            >
                                <Ionicons name="close" size={22} color="#64748B" />
                            </Pressable>
                        </View>

                        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                            {/* Total Percentage Banner */}
                            <View style={gradebookPagesStyle.totalWeightBanner}>
                                <Text style={gradebookPagesStyle.totalWeightText}>
                                    Total Weight Percentage:
                                </Text>
                                <Text style={[gradebookPagesStyle.totalWeightText, { fontSize: 16 }]}>
                                    {totalWeightPercent}%
                                </Text>
                            </View>

                            {/* Weights List */}
                            {weights.map((w) => (
                                <View key={w.id} style={gradebookPagesStyle.weightListItem}>
                                    <View>
                                        <Text style={gradebookPagesStyle.weightListName}>{w.name}</Text>
                                        <Text style={gradebookPagesStyle.weightListPercent}>{w.weight}%</Text>
                                    </View>
                                    <Pressable
                                        onPress={() => handleDeleteWeight(w.id)}
                                        hitSlop={8}
                                        style={gradebookPagesStyle.actionIconBtn}
                                    >
                                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                    </Pressable>
                                </View>
                            ))}

                            {/* Add New Weight */}
                            <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#E2E8F0" }}>
                                <Text style={{ fontSize: 14, fontWeight: "700", color: "#0F172A", marginBottom: 10 }}>
                                    Add New Category
                                </Text>

                                <InputGroup
                                    label="Category Name"
                                    placeholder="e.g. Unit Projects, Quizzes"
                                    value={newWeightName}
                                    onChangeText={setNewWeightName}
                                />

                                <InputGroup
                                    label="Weight (%)"
                                    placeholder="e.g. 25"
                                    value={newWeightPercent}
                                    onChangeText={setNewWeightPercent}
                                    keyboardType="number-pad"
                                />

                                <Button
                                    label={isSubmittingWeight ? "Adding..." : "+ Add Category"}
                                    onPress={handleAddWeight}
                                />
                            </View>

                            <Pressable
                                onPress={() => setIsWeightsModalOpen(false)}
                                style={gradebookPagesStyle.cancelButton}
                            >
                                <Text style={gradebookPagesStyle.cancelButtonText}>Done</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Student Grade Calculation Breakdown Modal */}
            <Modal
                visible={selectedBreakdownStudent !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedBreakdownStudent(null)}
            >
                <View style={gradebookPagesStyle.modalOverlay}>
                    <View style={gradebookPagesStyle.modalContent}>
                        <View style={gradebookPagesStyle.modalHeader}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <Ionicons name="ribbon-outline" size={22} color="#4F46E5" />
                                <Text style={gradebookPagesStyle.modalTitle}>Grade Breakdown</Text>
                            </View>
                            <Pressable
                                onPress={() => setSelectedBreakdownStudent(null)}
                                hitSlop={8}
                            >
                                <Ionicons name="close" size={22} color="#64748B" />
                            </Pressable>
                        </View>

                        {selectedBreakdownStudent && (() => {
                            const grade = studentGradesMap[selectedBreakdownStudent.id];
                            const num = grade?.numericGrade ?? null;
                            const isHigh = num !== null && num >= 90;
                            const isMid = num !== null && num >= 80 && num < 90;
                            const isPassing = num !== null && num >= 75 && num < 80;
                            const isFailed = num !== null && num < 75;

                            return (
                                <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                                    {/* Overall Grade Card */}
                                    <View style={gradebookPagesStyle.breakdownCard}>
                                        <View style={gradebookPagesStyle.breakdownHeaderRow}>
                                            <View>
                                                <Text style={gradebookPagesStyle.breakdownStudentName}>
                                                    {selectedBreakdownStudent.firstname} {selectedBreakdownStudent.lastname}
                                                </Text>
                                                <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                                                    {grade?.totalScoredAssessments || 0} of {assessments.length} assessments scored
                                                </Text>
                                            </View>

                                            <View
                                                style={[
                                                    gradebookPagesStyle.breakdownFinalGradeBox,
                                                    isHigh
                                                        ? gradebookPagesStyle.gradeBadgeHigh
                                                        : isMid
                                                            ? gradebookPagesStyle.gradeBadgeMid
                                                            : isPassing
                                                                ? gradebookPagesStyle.gradeBadgePassing
                                                                : isFailed
                                                                    ? gradebookPagesStyle.gradeBadgeFailed
                                                                    : gradebookPagesStyle.gradeBadgeEmpty,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        gradebookPagesStyle.breakdownFinalGradeText,
                                                        isHigh
                                                            ? gradebookPagesStyle.gradeTextHigh
                                                            : isMid
                                                                ? gradebookPagesStyle.gradeTextMid
                                                                : isPassing
                                                                    ? gradebookPagesStyle.gradeTextPassing
                                                                    : isFailed
                                                                        ? gradebookPagesStyle.gradeTextFailed
                                                                        : gradebookPagesStyle.gradeTextEmpty,
                                                    ]}
                                                >
                                                    {grade?.displayGrade || "—"}
                                                </Text>
                                            </View>
                                        </View>

                                        <Text
                                            style={[
                                                gradebookPagesStyle.breakdownStatusText,
                                                isHigh
                                                    ? gradebookPagesStyle.gradeTextHigh
                                                    : isMid
                                                        ? gradebookPagesStyle.gradeTextMid
                                                        : isPassing
                                                            ? gradebookPagesStyle.gradeTextPassing
                                                            : isFailed
                                                                ? gradebookPagesStyle.gradeTextFailed
                                                                : gradebookPagesStyle.gradeTextEmpty,
                                            ]}
                                        >
                                            {grade?.statusLabel} • Grade {grade?.letterGrade}
                                        </Text>
                                    </View>

                                    {/* Weighted Categories Breakdown */}
                                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                        Weighted Categories
                                    </Text>

                                    {grade && grade.breakdown.length > 0 ? (
                                        grade.breakdown.map((cat, idx) => (
                                            <View key={idx} style={gradebookPagesStyle.breakdownCategoryItem}>
                                                <View style={gradebookPagesStyle.breakdownCatTopRow}>
                                                    <Text style={gradebookPagesStyle.breakdownCatName}>
                                                        {cat.weightName} {cat.weightPercent > 0 ? `(${cat.weightPercent}%)` : ""}
                                                    </Text>
                                                    <Text style={gradebookPagesStyle.breakdownCatPercent}>
                                                        {cat.percentage}%
                                                    </Text>
                                                </View>
                                                <Text style={gradebookPagesStyle.breakdownCatSubText}>
                                                    {cat.weightName.toLowerCase().includes("attendance")
                                                        ? `Present: ${cat.totalScore} of ${cat.totalMaxScore} session${cat.totalMaxScore > 1 ? "s" : ""}`
                                                        : `Total: ${cat.totalScore} / ${cat.totalMaxScore} pts`}
                                                    {cat.weightPercent > 0 ? ` • Contributes: +${cat.weightedContribution}%` : ""}
                                                </Text>

                                                {/* Progress bar */}
                                                <View style={gradebookPagesStyle.breakdownProgressBarBg}>
                                                    <View
                                                        style={[
                                                            gradebookPagesStyle.breakdownProgressBarFill,
                                                            { width: `${Math.min(100, Math.max(0, cat.percentage))}%` },
                                                        ]}
                                                    />
                                                </View>
                                            </View>
                                        ))
                                    ) : (
                                        <Text style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic", marginBottom: 12 }}>
                                            No scores entered yet for this student.
                                        </Text>
                                    )}

                                    {/* Assessment Score Details */}
                                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#334155", marginTop: 8, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                        Assessment Scores
                                    </Text>

                                    {assessments.map((a) => {
                                        const key = `${selectedBreakdownStudent.id}_${a.id}`;
                                        const score = scoresMap[key];
                                        const hasScore = score !== undefined && score.trim() !== "";

                                        return (
                                            <View
                                                key={a.id}
                                                style={{
                                                    flexDirection: "row",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    paddingVertical: 8,
                                                    borderBottomWidth: 1,
                                                    borderBottomColor: "#F1F5F9",
                                                }}
                                            >
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#1E293B" }}>
                                                        {a.title}
                                                    </Text>
                                                    <Text style={{ fontSize: 11, color: "#64748B" }}>
                                                        Max: {a.maxScore} {a.weightName ? `• ${a.weightName}` : ""}
                                                    </Text>
                                                </View>

                                                <Text
                                                    style={{
                                                        fontSize: 14,
                                                        fontWeight: "700",
                                                        color: hasScore ? "#0F172A" : "#94A3B8",
                                                    }}
                                                >
                                                    {hasScore ? `${score} / ${a.maxScore}` : "Unrecorded"}
                                                </Text>
                                            </View>
                                        );
                                    })}

                                    <Pressable
                                        onPress={() => setSelectedBreakdownStudent(null)}
                                        style={[gradebookPagesStyle.cancelButton, { marginTop: 14 }]}
                                    >
                                        <Text style={gradebookPagesStyle.cancelButtonText}>Close</Text>
                                    </Pressable>
                                </ScrollView>
                            );
                        })()}
                    </View>
                </View>
            </Modal>

            {/* Date Select Filter Modal */}
            <CalendarPickerModal
                visible={isDateSelectModalOpen}
                selectedDate={selectedDate}
                onSelectDate={(d) => setSelectedDate(d)}
                onClose={() => setIsDateSelectModalOpen(false)}
                markedDates={uniqueAssessmentDates}
                title="Filter by Date"
                subtitle="Select any date on the calendar to view its assessments:"
                accentColor="#059669"
            />

            {/* Kebab Action Menu Modal */}
            <Modal
                visible={isKebabOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsKebabOpen(false)}
            >
                <Pressable
                    style={gradebookPagesStyle.kebabModalOverlay}
                    onPress={() => setIsKebabOpen(false)}
                >
                    <Pressable
                        style={gradebookPagesStyle.kebabModalCard}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={gradebookPagesStyle.kebabModalHeader}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <Ionicons name="options-outline" size={18} color="#4F46E5" />
                                <Text style={gradebookPagesStyle.kebabModalTitle}>Gradebook Actions</Text>
                            </View>
                            <Pressable
                                onPress={() => setIsKebabOpen(false)}
                                hitSlop={8}
                                style={gradebookPagesStyle.kebabModalCloseBtn}
                            >
                                <Ionicons name="close" size={16} color="#64748B" />
                            </Pressable>
                        </View>

                        <Pressable
                            onPress={() => {
                                setIsKebabOpen(false);
                                setIsWeightsModalOpen(true);
                            }}
                            style={({ pressed }) => [
                                gradebookPagesStyle.kebabActionOption,
                                pressed && gradebookPagesStyle.kebabActionOptionPressed,
                            ]}
                        >
                            <View style={[gradebookPagesStyle.kebabActionIconWrap, { backgroundColor: "#EEF2FF" }]}>
                                <Ionicons name="pie-chart" size={20} color="#4F46E5" />
                            </View>
                            <View style={gradebookPagesStyle.kebabActionTextCol}>
                                <View style={gradebookPagesStyle.kebabActionTitleRow}>
                                    <Text style={gradebookPagesStyle.kebabActionTitle}>Grading Weights</Text>
                                    <View style={gradebookPagesStyle.kebabActionBadge}>
                                        <Text style={gradebookPagesStyle.kebabActionBadgeText}>
                                            {totalWeightPercent}%
                                        </Text>
                                    </View>
                                </View>
                                <Text style={gradebookPagesStyle.kebabActionSubtitle}>
                                    Manage assessment categories & weights
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                        </Pressable>

                        <View style={gradebookPagesStyle.kebabActionDivider} />

                        <Pressable
                            onPress={() => {
                                setIsKebabOpen(false);
                                handleOpenCreateAssessment();
                            }}
                            style={({ pressed }) => [
                                gradebookPagesStyle.kebabActionOption,
                                pressed && gradebookPagesStyle.kebabActionOptionPressed,
                            ]}
                        >
                            <View style={[gradebookPagesStyle.kebabActionIconWrap, { backgroundColor: "#ECFDF5" }]}>
                                <Ionicons name="add-circle" size={20} color="#059669" />
                            </View>
                            <View style={gradebookPagesStyle.kebabActionTextCol}>
                                <Text style={gradebookPagesStyle.kebabActionTitle}>New Assessment</Text>
                                <Text style={gradebookPagesStyle.kebabActionSubtitle}>
                                    Create a test, quiz, or assignment
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>

            <DialogMessage
                visible={dialog.visible}
                type={dialog.type}
                title={dialog.title}
                message={dialog.message}
                onClose={() => setDialog((prev) => ({ ...prev, visible: false }))}
            />

            <BottomNavBar activeTab="gradebook" onTabPress={handleTabPress} />
        </View>
    );
}
