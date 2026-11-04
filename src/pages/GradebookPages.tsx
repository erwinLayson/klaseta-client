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
import type {
    GradingWeight,
    Assessment,
} from "../types/gradebook";
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
    const { username } = route.params;

    const [students, setStudents] = useState<Student[]>([]);
    const [weights, setWeights] = useState<GradingWeight[]>([]);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [scoresMap, setScoresMap] = useState<Record<string, string>>({});
    const [savedScoresMap, setSavedScoresMap] = useState<Record<string, string>>({});

    // Filters
    const [nameQuery, setNameQuery] = useState("");
    const [selectedWeightId, setSelectedWeightId] = useState<number | null>(null);

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
    const [newWeightName, setNewWeightName] = useState("");
    const [newWeightPercent, setNewWeightPercent] = useState("");
    const [isSubmittingWeight, setIsSubmittingWeight] = useState(false);

    // Hovered header cell id (for web / focus)
    const [hoveredAssessmentId, setHoveredAssessmentId] = useState<number | null>(null);

    // Dialog messages
    const [dialog, setDialog] = useState({
        visible: false,
        type: "success" as DialogType,
        title: "",
        message: "",
    });

    const loadSpreadsheetData = useCallback(async () => {
        const data = await getGradebookSpreadsheet(username);
        setStudents(data.students);
        setWeights(data.weights);
        setAssessments(data.assessments);
        setScoresMap(data.scoresMap);
        setSavedScoresMap(data.scoresMap);
    }, [username]);

    useEffect(() => {
        let isMounted = true;
        const fetchSpreadsheet = async () => {
            const data = await getGradebookSpreadsheet(username);
            if (isMounted) {
                setStudents(data.students);
                setWeights(data.weights);
                setAssessments(data.assessments);
                setScoresMap(data.scoresMap);
                setSavedScoresMap(data.scoresMap);
            }
        };
        fetchSpreadsheet();
        return () => {
            isMounted = false;
        };
    }, [username]);

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

    // Filter assessments by grading weight
    const filteredAssessments = useMemo(() => {
        if (selectedWeightId === null) {
            return assessments;
        }
        return assessments.filter((a) => a.weightId === selectedWeightId);
    }, [assessments, selectedWeightId]);

    // Total weights percentage
    const totalWeightPercent = useMemo(() => {
        return weights.reduce((sum, w) => sum + w.weight, 0);
    }, [weights]);

    // Gradebook Stats
    const stats = useMemo(() => {
        const totalAssessments = assessments.length;
        const totalPossibleEntries = students.length * totalAssessments;
        let gradedCount = 0;
        let totalScoreSum = 0;
        let totalMaxSum = 0;

        for (const [key, scoreStr] of Object.entries(scoresMap)) {
            if (scoreStr.trim() !== "") {
                const score = parseFloat(scoreStr);
                if (!isNaN(score)) {
                    gradedCount++;
                    const [, assessmentIdStr] = key.split("_");
                    const assessment = assessments.find((a) => a.id === Number(assessmentIdStr));
                    if (assessment && assessment.maxScore > 0) {
                        totalScoreSum += score;
                        totalMaxSum += assessment.maxScore;
                    }
                }
            }
        }

        const avgScorePercent = totalMaxSum > 0 ? Math.round((totalScoreSum / totalMaxSum) * 100) : 0;

        return {
            totalAssessments,
            totalPossibleEntries,
            gradedCount,
            avgScorePercent: `${avgScorePercent}%`,
        };
    }, [assessments, students, scoresMap]);

    // Options for SelectGroup when creating/editing assessment
    const weightSelectOptions = useMemo<SelectOption[]>(() => {
        const list: SelectOption[] = [
            { label: "No Specific Category", value: "NONE" },
        ];
        for (const w of weights) {
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
        setAssessmentWeightId(weights.length > 0 ? String(weights[0].id) : "NONE");
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
            const result = await createGradingWeight(username, newWeightName.trim(), percent);
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
                {/* Header */}
                <View style={gradebookPagesStyle.header}>
                    <View style={gradebookPagesStyle.headerTopRow}>
                        <View style={gradebookPagesStyle.headerTitleRow}>
                            <Ionicons name="book-outline" size={26} color="#4F46E5" />
                            <Text style={gradebookPagesStyle.greeting}>Gradebook</Text>
                        </View>

                        <View style={gradebookPagesStyle.headerActionsRow}>
                            <Pressable
                                onPress={() => setIsWeightsModalOpen(true)}
                                style={({ pressed }) => [
                                    gradebookPagesStyle.weightsButton,
                                    pressed && gradebookPagesStyle.weightsButtonPressed,
                                ]}
                            >
                                <Ionicons name="pie-chart-outline" size={16} color="#4F46E5" />
                                <Text style={gradebookPagesStyle.weightsButtonText}>
                                    Weights ({totalWeightPercent}%)
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={handleOpenCreateAssessment}
                                style={({ pressed }) => [
                                    gradebookPagesStyle.createButton,
                                    pressed && gradebookPagesStyle.createButtonPressed,
                                ]}
                            >
                                <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                                <Text style={gradebookPagesStyle.createButtonText}>
                                    New Assessment
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                    <Text style={gradebookPagesStyle.subtitle}>
                        Manage student assessments, grading weights, and scores spreadsheet
                    </Text>
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
                            {stats.avgScorePercent}
                        </Text>
                        <Text style={gradebookPagesStyle.statLabel}>Class Avg</Text>
                    </View>
                    <View style={gradebookPagesStyle.statCard}>
                        <Text style={[gradebookPagesStyle.statValue, { color: "#4F46E5" }]}>
                            {weights.length}
                        </Text>
                        <Text style={gradebookPagesStyle.statLabel}>Weights ({totalWeightPercent}%)</Text>
                    </View>
                </View>

                {/* Section Title & Status Bar */}
                <View style={gradebookPagesStyle.section}>
                    <View style={gradebookPagesStyle.sectionHeaderRow}>
                        <View style={gradebookPagesStyle.sectionHeaderLeft}>
                            <Text style={gradebookPagesStyle.sectionTitle}>
                                Gradebook Spreadsheet
                            </Text>
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

                    {/* Horizontal Flexbox Row: Search Filter, Filter by Weight Category, and Save All Button */}
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

                        {/* 2. Filter Assessments by Weight Category */}
                        <Pressable
                            onPress={() => {
                                // Cycle or toggle weight category filter
                                if (weights.length === 0) return;
                                if (selectedWeightId === null) {
                                    setSelectedWeightId(weights[0].id);
                                } else {
                                    const currentIndex = weights.findIndex((w) => w.id === selectedWeightId);
                                    if (currentIndex >= 0 && currentIndex < weights.length - 1) {
                                        setSelectedWeightId(weights[currentIndex + 1].id);
                                    } else {
                                        setSelectedWeightId(null);
                                    }
                                }
                            }}
                            style={({ pressed }) => [
                                gradebookPagesStyle.filterSelectWrapper,
                                selectedWeightId !== null && gradebookPagesStyle.filterSelectWrapperActive,
                                pressed && { opacity: 0.85 },
                            ]}
                        >
                            <View style={gradebookPagesStyle.filterSelectLeft}>
                                <Ionicons
                                    name="pie-chart-outline"
                                    size={17}
                                    color={selectedWeightId !== null ? "#4F46E5" : "#64748B"}
                                />
                                <Text
                                    style={[
                                        gradebookPagesStyle.filterSelectValue,
                                        selectedWeightId === null && gradebookPagesStyle.filterSelectPlaceholder,
                                    ]}
                                    numberOfLines={1}
                                >
                                    {selectedWeightId !== null
                                        ? weights.find((w) => w.id === selectedWeightId)?.name || "Category"
                                        : "All Weights (Filter)"}
                                </Text>
                            </View>

                            {selectedWeightId !== null ? (
                                <Pressable
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        setSelectedWeightId(null);
                                    }}
                                    hitSlop={8}
                                    style={gradebookPagesStyle.filterClearButton}
                                >
                                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                                </Pressable>
                            ) : (
                                <Ionicons name="chevron-down" size={15} color="#64748B" />
                            )}
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
                                name="pie-chart-outline"
                                size={36}
                                color="#94A3B8"
                                style={gradebookPagesStyle.emptyIcon}
                            />
                            <Text style={gradebookPagesStyle.emptyText}>
                                No assessments under this category
                            </Text>
                            <Text style={gradebookPagesStyle.emptySubtext}>
                                Clear the category filter to view all assessments.
                            </Text>
                            <Pressable
                                onPress={() => setSelectedWeightId(null)}
                                style={gradebookPagesStyle.clearFilterButton}
                            >
                                <Text style={gradebookPagesStyle.clearFilterButtonText}>
                                    Show All Categories
                                </Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={gradebookPagesStyle.spreadsheetCard}>
                            <View style={gradebookPagesStyle.spreadsheetWrapper}>
                                {/* First Column: Fixed Student Names */}
                                <View style={gradebookPagesStyle.studentFixedColumn}>
                                    {/* Header Cell */}
                                    <View style={gradebookPagesStyle.studentHeaderCell}>
                                        <Text style={gradebookPagesStyle.studentHeaderCellText}>
                                            Student Name
                                        </Text>
                                        <Text style={gradebookPagesStyle.studentHeaderCellSub}>
                                            {filteredStudents.length} Students
                                        </Text>
                                    </View>

                                    {/* Student Rows */}
                                    {filteredStudents.map((student, idx) => (
                                        <View
                                            key={student.id}
                                            style={[
                                                gradebookPagesStyle.studentRowCell,
                                                idx % 2 === 0
                                                    ? gradebookPagesStyle.rowEven
                                                    : gradebookPagesStyle.rowOdd,
                                            ]}
                                        >
                                            <Text
                                                style={gradebookPagesStyle.studentRowText}
                                                numberOfLines={1}
                                            >
                                                {student.firstname} {student.lastname}
                                            </Text>
                                        </View>
                                    ))}
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
                                        {filteredStudents.map((student, rowIdx) => (
                                            <View
                                                key={student.id}
                                                style={[
                                                    { flexDirection: "row" },
                                                    rowIdx % 2 === 0
                                                        ? gradebookPagesStyle.rowEven
                                                        : gradebookPagesStyle.rowOdd,
                                                ]}
                                            >
                                                {filteredAssessments.map((assessment) => {
                                                    const key = `${student.id}_${assessment.id}`;
                                                    const currentScore = scoresMap[key] || "";
                                                    const hasVal = currentScore.trim().length > 0;
                                                    const numVal = parseFloat(currentScore);
                                                    const isInvalid = hasVal && (numVal > assessment.maxScore || numVal < 0);

                                                    return (
                                                        <View
                                                            key={assessment.id}
                                                            style={gradebookPagesStyle.scoreCell}
                                                        >
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
