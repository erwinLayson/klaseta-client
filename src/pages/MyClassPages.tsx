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
import * as DocumentPicker from "expo-document-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { myClassPagesStyle } from "../styles/index";
import { RootParamList } from "../types/RootParamList";
import type { Student, AddStudentInput } from "../types/student";
import type { ClassItem, CreateClassInput, UpdateClassInput } from "../types/class";
import {
    getClassesByTeacher,
    getClassById,
    createClass,
    updateClass,
    deleteClass,
    getStudentsByClass,
    addStudentToClass,
    addStudentsBulkToClass,
    removeStudentFromClass,
    parseXlsxFile,
} from "../services/pages/MyClassPages";
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

const SUFFIX_OPTIONS: SelectOption[] = [
    { label: "None", value: "None" },
    { label: "Jr.", value: "Jr." },
    { label: "Sr.", value: "Sr." },
    { label: "II", value: "II" },
    { label: "III", value: "III" },
    { label: "IV", value: "IV" },
    { label: "V", value: "V" },
];

const COLOR_PALETTE = [
    "#4F46E5", // Indigo
    "#059669", // Emerald
    "#0284C7", // Sky
    "#D97706", // Amber
    "#E11D48", // Rose
    "#7C3AED", // Purple
];

export function MyClassPages() {
    const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>();
    const route = useRoute<RouteProp<RootParamList, "myclass">>();
    const { username, classId: routeClassId } = route.params;

    // Class list state
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);
    const [classSearchQuery, setClassSearchQuery] = useState("");

    // Active drill-down class
    const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);

    // Students in active class
    const [students, setStudents] = useState<Student[]>([]);
    const [studentSearchQuery, setStudentSearchQuery] = useState("");
    const [sortAsc, setSortAsc] = useState<boolean | null>(null);

    // Create / Edit Class modal state
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
    const [className, setClassName] = useState("");
    const [classSection, setClassSection] = useState("");
    const [classSubject, setClassSubject] = useState("");
    const [classRoom, setClassRoom] = useState("");
    const [classSchedule, setClassSchedule] = useState("");
    const [classColor, setClassColor] = useState(COLOR_PALETTE[0]);
    const [isSubmittingClass, setIsSubmittingClass] = useState(false);

    // Delete Class confirmation modal
    const [deletingClass, setDeletingClass] = useState<ClassItem | null>(null);
    const [isDeletingClass, setIsDeletingClass] = useState(false);

    // Single student modal state
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);
    const [studentForm, setStudentForm] = useState<AddStudentInput>({
        firstname: "",
        middlename: "",
        lastname: "",
        suffix: "None",
    });

    // Bulk upload state
    const [isBulkLoading, setIsBulkLoading] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkPreview, setBulkPreview] = useState<{
        fileName: string;
        students: AddStudentInput[];
        skippedCount: number;
        totalRows: number;
    } | null>(null);

    // Dialog message state
    const [dialog, setDialog] = useState({
        visible: false,
        type: "success" as DialogType,
        title: "",
        message: "",
    });

    // Load all classes
    const loadClasses = useCallback(async () => {
        setIsLoadingClasses(true);
        try {
            const list = await getClassesByTeacher(username);
            setClasses(list);

            // If route parameter classId was specified and selectedClass not yet set, auto-open that class
            if (routeClassId) {
                const matched = list.find((c) => c.id === routeClassId);
                if (matched) {
                    setSelectedClass(matched);
                }
            }
        } finally {
            setIsLoadingClasses(false);
        }
    }, [username, routeClassId]);

    // Load students for currently selected class
    const loadClassStudents = useCallback(async (classId: number) => {
        const list = await getStudentsByClass(classId);
        setStudents(list);
    }, []);

    useEffect(() => {
        let isMounted = true;
        const fetchClasses = async () => {
            setIsLoadingClasses(true);
            try {
                const list = await getClassesByTeacher(username);
                if (!isMounted) return;
                setClasses(list);

                if (routeClassId) {
                    const matched = list.find((c) => c.id === routeClassId);
                    if (matched) setSelectedClass(matched);
                }
            } finally {
                if (isMounted) setIsLoadingClasses(false);
            }
        };
        fetchClasses();
        return () => {
            isMounted = false;
        };
    }, [username, routeClassId]);

    useEffect(() => {
        let isMounted = true;
        if (!selectedClass) {
            return;
        }
        const fetchStudents = async () => {
            const list = await getStudentsByClass(selectedClass.id);
            if (isMounted) {
                setStudents(list);
            }
        };
        fetchStudents();
        return () => {
            isMounted = false;
        };
    }, [selectedClass]);

    const handleTabPress = (tab: NavTab) => {
        if (tab !== "myclass") {
            navigation.navigate(tab, { username });
        }
    };

    // ---------------------------------------------------------------------------
    // Class Actions
    // ---------------------------------------------------------------------------
    const handleOpenCreateClass = () => {
        setEditingClass(null);
        setClassName("");
        setClassSection("");
        setClassSubject("");
        setClassRoom("");
        setClassSchedule("");
        setClassColor(COLOR_PALETTE[0]);
        setIsClassModalOpen(true);
    };

    const handleOpenEditClass = (cls: ClassItem) => {
        setEditingClass(cls);
        setClassName(cls.name);
        setClassSection(cls.section || "");
        setClassSubject(cls.subject || "");
        setClassRoom(cls.room || "");
        setClassSchedule(cls.schedule || "");
        setClassColor(cls.color || COLOR_PALETTE[0]);
        setIsClassModalOpen(true);
    };

    const handleSubmitClass = async () => {
        if (isSubmittingClass) return;

        if (!className.trim()) {
            setDialog({
                visible: true,
                type: "error",
                title: "Missing Class Name",
                message: "Please enter a name for the class (e.g. Mathematics 10).",
            });
            return;
        }

        setIsSubmittingClass(true);
        try {
            if (editingClass) {
                const updateInput: UpdateClassInput = {
                    id: editingClass.id,
                    name: className.trim(),
                    section: classSection.trim() || undefined,
                    subject: classSubject.trim() || undefined,
                    room: classRoom.trim() || undefined,
                    schedule: classSchedule.trim() || undefined,
                    color: classColor,
                };
                const res = await updateClass(updateInput);
                if (res.success) {
                    setIsClassModalOpen(false);
                    await loadClasses();
                    // Update selectedClass in place if currently viewing it
                    if (selectedClass && selectedClass.id === editingClass.id) {
                        const refreshed = await getClassById(editingClass.id);
                        if (refreshed) setSelectedClass(refreshed);
                    }
                    setDialog({
                        visible: true,
                        type: "success",
                        title: "Class Updated",
                        message: `"${className.trim()}" has been updated successfully.`,
                    });
                } else {
                    setDialog({
                        visible: true,
                        type: "error",
                        title: "Update Failed",
                        message: res.message,
                    });
                }
            } else {
                const createInput: CreateClassInput = {
                    name: className.trim(),
                    section: classSection.trim() || undefined,
                    subject: classSubject.trim() || undefined,
                    room: classRoom.trim() || undefined,
                    schedule: classSchedule.trim() || undefined,
                    color: classColor,
                };
                const res = await createClass(username, createInput);
                if (res.success) {
                    setIsClassModalOpen(false);
                    await loadClasses();
                    setDialog({
                        visible: true,
                        type: "success",
                        title: "Class Created",
                        message: `"${className.trim()}" has been created successfully. Tap it to start adding students!`,
                    });
                } else {
                    setDialog({
                        visible: true,
                        type: "error",
                        title: "Creation Failed",
                        message: res.message,
                    });
                }
            }
        } finally {
            setIsSubmittingClass(false);
        }
    };

    const handleDeleteClass = async () => {
        if (!deletingClass || isDeletingClass) return;

        setIsDeletingClass(true);
        try {
            const res = await deleteClass(deletingClass.id);
            if (res.success) {
                setDeletingClass(null);
                if (selectedClass?.id === deletingClass.id) {
                    setSelectedClass(null);
                }
                await loadClasses();
                setDialog({
                    visible: true,
                    type: "success",
                    title: "Class Deleted",
                    message: "The class has been deleted.",
                });
            } else {
                setDialog({
                    visible: true,
                    type: "error",
                    title: "Delete Failed",
                    message: res.message,
                });
            }
        } finally {
            setIsDeletingClass(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Student Actions (within active class)
    // ---------------------------------------------------------------------------
    const handleOpenAddStudent = () => {
        setStudentForm({
            firstname: "",
            middlename: "",
            lastname: "",
            suffix: "None",
        });
        setIsStudentModalOpen(true);
    };

    const handleSubmitStudent = async () => {
        if (!selectedClass || isSubmittingStudent) return;

        if (!studentForm.firstname.trim() || !studentForm.lastname.trim()) {
            setDialog({
                visible: true,
                type: "error",
                title: "Missing Name",
                message: "First name and last name are required.",
            });
            return;
        }

        setIsSubmittingStudent(true);
        try {
            const res = await addStudentToClass(username, selectedClass.id, studentForm);
            if (res.success) {
                setIsStudentModalOpen(false);
                setStudentForm({
                    firstname: "",
                    middlename: "",
                    lastname: "",
                    suffix: "None",
                });
                await loadClassStudents(selectedClass.id);
                await loadClasses();
                setDialog({
                    visible: true,
                    type: "success",
                    title: "Student Enrolled",
                    message: `${studentForm.firstname.trim()} has been enrolled in ${selectedClass.name}.`,
                });
            } else {
                setDialog({
                    visible: true,
                    type: "error",
                    title: "Failed to Add Student",
                    message: res.message,
                });
            }
        } finally {
            setIsSubmittingStudent(false);
        }
    };

    const handlePickXlsx = async () => {
        if (!selectedClass) return;

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "application/vnd.ms-excel",
                    "text/csv",
                    "*/*",
                ],
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            const asset = result.assets[0];
            const fileName = asset.name || "students.xlsx";
            const lowerName = fileName.toLowerCase();

            if (
                !lowerName.endsWith(".xlsx") &&
                !lowerName.endsWith(".xls") &&
                !lowerName.endsWith(".csv")
            ) {
                setDialog({
                    visible: true,
                    type: "error",
                    title: "Invalid File Type",
                    message: "Please choose an Excel spreadsheet (.xlsx, .xls) or CSV file.",
                });
                return;
            }

            setIsBulkLoading(true);
            const parsed = await parseXlsxFile(asset.uri);

            if (parsed.students.length === 0) {
                setDialog({
                    visible: true,
                    type: "error",
                    title: "No Valid Records",
                    message:
                        "No student records with first and last names were found in this file. Please ensure column headers include First Name and Last Name.",
                });
                return;
            }

            setBulkPreview({
                fileName,
                students: parsed.students,
                skippedCount: parsed.skippedCount,
                totalRows: parsed.totalRows,
            });
            setIsBulkModalOpen(true);
        } catch (error) {
            console.error("Error picking document:", error);
            setDialog({
                visible: true,
                type: "error",
                title: "File Read Error",
                message: "Could not read the spreadsheet. Please check the file format and try again.",
            });
        } finally {
            setIsBulkLoading(false);
        }
    };

    const handleConfirmBulkImport = async () => {
        if (!selectedClass || !bulkPreview || isBulkLoading) return;

        setIsBulkLoading(true);
        try {
            const res = await addStudentsBulkToClass(username, selectedClass.id, bulkPreview.students);
            setIsBulkModalOpen(false);
            setBulkPreview(null);
            await loadClassStudents(selectedClass.id);
            await loadClasses();

            setDialog({
                visible: true,
                type: res.success ? "success" : "error",
                title: res.success ? "Bulk Import Completed" : "Import Error",
                message: res.message,
            });
        } finally {
            setIsBulkLoading(false);
        }
    };

    const handleRemoveStudent = async (studentId: number, studentName: string) => {
        if (!selectedClass) return;

        const res = await removeStudentFromClass(selectedClass.id, studentId);
        if (res.success) {
            await loadClassStudents(selectedClass.id);
            await loadClasses();
            setDialog({
                visible: true,
                type: "success",
                title: "Student Removed",
                message: `${studentName} was removed from this class.`,
            });
        } else {
            setDialog({
                visible: true,
                type: "error",
                title: "Removal Failed",
                message: res.message,
            });
        }
    };

    const formatStudentName = useCallback(
        (st: { firstname: string; middlename?: string | null; lastname: string; suffix?: string | null }) => {
            const parts = [st.firstname];
            if (st.middlename) parts.push(st.middlename);
            parts.push(st.lastname);
            if (st.suffix && st.suffix !== "None") parts.push(st.suffix);
            return parts.join(" ");
        },
        []
    );

    // Filter classes list
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

    // Total enrolled students across all classes
    const totalStudentsCount = useMemo(() => {
        return classes.reduce((sum, c) => sum + (c.studentCount || 0), 0);
    }, [classes]);

    // Filter students within active class
    const filteredStudents = useMemo(() => {
        let result = students;
        if (studentSearchQuery.trim()) {
            const q = studentSearchQuery.trim().toLowerCase();
            result = result.filter((st) => {
                const fullName = formatStudentName(st).toLowerCase();
                return fullName.includes(q);
            });
        }

        if (sortAsc !== null) {
            result = [...result].sort((a, b) => {
                const nameA = `${a.lastname} ${a.firstname}`.toLowerCase();
                const nameB = `${b.lastname} ${b.firstname}`.toLowerCase();
                return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
            });
        }
        return result;
    }, [students, studentSearchQuery, sortAsc, formatStudentName]);

    const toggleSort = () => {
        if (sortAsc === null) setSortAsc(true);
        else if (sortAsc === true) setSortAsc(false);
        else setSortAsc(null);
    };

    return (
        <View style={myClassPagesStyle.container}>
            <View style={myClassPagesStyle.backgroundAccent} pointerEvents="none" />
            <View style={myClassPagesStyle.backgroundAccentBottom} pointerEvents="none" />

            <ScrollView
                contentContainerStyle={myClassPagesStyle.scrollView}
                showsVerticalScrollIndicator={false}
            >
                {/* =========================================================================
                    VIEW A: ALL CLASSES OVERVIEW (Cards)
                    ========================================================================= */}
                {!selectedClass ? (
                    <>
                        <View style={myClassPagesStyle.header}>
                            <View style={myClassPagesStyle.headerTopRow}>
                                <View style={myClassPagesStyle.headerTitleRow}>
                                    <Ionicons name="school-outline" size={26} color="#4F46E5" />
                                    <Text style={myClassPagesStyle.greeting}>My Classes</Text>
                                </View>

                                <View style={myClassPagesStyle.headerActions}>
                                    <Pressable
                                        onPress={handleOpenCreateClass}
                                        style={({ pressed }) => [
                                            myClassPagesStyle.addButton,
                                            pressed && myClassPagesStyle.addButtonPressed,
                                        ]}
                                    >
                                        <Ionicons name="add" size={18} color="#FFFFFF" />
                                        <Text style={myClassPagesStyle.addButtonText}>Create Class</Text>
                                    </Pressable>
                                </View>
                            </View>
                            <Text style={myClassPagesStyle.subtitle}>
                                Manage your active classes and student rosters
                            </Text>
                        </View>

                        {/* Stats Summary */}
                        <View style={myClassPagesStyle.statsRow}>
                            <View style={myClassPagesStyle.statCard}>
                                <Text style={myClassPagesStyle.statValue}>{classes.length}</Text>
                                <Text style={myClassPagesStyle.statLabel}>Total Classes</Text>
                            </View>
                            <View style={myClassPagesStyle.statCard}>
                                <Text style={[myClassPagesStyle.statValue, { color: "#059669" }]}>
                                    {totalStudentsCount}
                                </Text>
                                <Text style={myClassPagesStyle.statLabel}>Enrolled Students</Text>
                            </View>
                        </View>

                        {/* Search Filter for Classes */}
                        <View style={myClassPagesStyle.filterContainer}>
                            <Ionicons name="search-outline" size={18} color="#94A3B8" />
                            <TextInput
                                style={myClassPagesStyle.filterInput}
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
                                    style={myClassPagesStyle.filterClearButton}
                                    hitSlop={8}
                                >
                                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                                </Pressable>
                            )}
                        </View>

                        {/* Classes Cards Grid */}
                        {isLoadingClasses ? (
                            <View style={{ paddingVertical: 40, alignItems: "center" }}>
                                <ActivityIndicator size="large" color="#4F46E5" />
                                <Text style={{ color: "#64748B", marginTop: 10, fontSize: 14 }}>
                                    Loading classes...
                                </Text>
                            </View>
                        ) : filteredClasses.length === 0 ? (
                            <View style={myClassPagesStyle.emptyCard}>
                                <Ionicons
                                    name="school-outline"
                                    size={48}
                                    color="#94A3B8"
                                    style={myClassPagesStyle.emptyIcon}
                                />
                                <Text style={myClassPagesStyle.emptyText}>
                                    {classSearchQuery.trim()
                                        ? `No classes matching "${classSearchQuery}"`
                                        : "No classes created yet"}
                                </Text>
                                <Text style={myClassPagesStyle.emptySubtext}>
                                    {classSearchQuery.trim()
                                        ? "Try searching with a different keyword."
                                        : "Create your first class to start tracking attendance and managing grades."}
                                </Text>
                                {!classSearchQuery.trim() && (
                                    <Pressable
                                        onPress={handleOpenCreateClass}
                                        style={[myClassPagesStyle.addButton, { marginTop: 14, alignSelf: "center" }]}
                                    >
                                        <Ionicons name="add" size={18} color="#FFFFFF" />
                                        <Text style={myClassPagesStyle.addButtonText}>Create First Class</Text>
                                    </Pressable>
                                )}
                            </View>
                        ) : (
                            <View style={myClassPagesStyle.classesGrid}>
                                {filteredClasses.map((item) => {
                                    const accentColor = item.color || "#4F46E5";
                                    return (
                                        <Pressable
                                            key={item.id}
                                            onPress={() => setSelectedClass(item)}
                                            style={({ pressed }) => [
                                                myClassPagesStyle.classCard,
                                                pressed && myClassPagesStyle.classCardPressed,
                                            ]}
                                        >
                                            {/* Colored Top Accent Bar */}
                                            <View
                                                style={[
                                                    myClassPagesStyle.classCardColorBar,
                                                    { backgroundColor: accentColor },
                                                ]}
                                            />

                                            <View style={myClassPagesStyle.classCardBody}>
                                                <View style={myClassPagesStyle.classCardTopRow}>
                                                    <View style={myClassPagesStyle.classCardTitleBlock}>
                                                        <Text
                                                            style={myClassPagesStyle.classCardName}
                                                            numberOfLines={1}
                                                        >
                                                            {item.name}
                                                        </Text>
                                                        {item.subject ? (
                                                            <Text
                                                                style={myClassPagesStyle.classCardSubject}
                                                                numberOfLines={1}
                                                            >
                                                                {item.subject}
                                                            </Text>
                                                        ) : null}
                                                    </View>

                                                    {item.section ? (
                                                        <View
                                                            style={[
                                                                myClassPagesStyle.classCardSectionBadge,
                                                                { backgroundColor: `${accentColor}1A` },
                                                            ]}
                                                        >
                                                            <Text
                                                                style={[
                                                                    myClassPagesStyle.classCardSectionText,
                                                                    { color: accentColor },
                                                                ]}
                                                            >
                                                                {item.section}
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                </View>

                                                {/* Room and Schedule info */}
                                                {(item.room || item.schedule) ? (
                                                    <View style={myClassPagesStyle.classCardDetailsRow}>
                                                        {item.room ? (
                                                            <View style={myClassPagesStyle.classCardDetailItem}>
                                                                <Ionicons name="location-outline" size={13} color="#64748B" />
                                                                <Text style={myClassPagesStyle.classCardDetailText}>
                                                                    {item.room}
                                                                </Text>
                                                            </View>
                                                        ) : null}
                                                        {item.schedule ? (
                                                            <View style={myClassPagesStyle.classCardDetailItem}>
                                                                <Ionicons name="time-outline" size={13} color="#64748B" />
                                                                <Text style={myClassPagesStyle.classCardDetailText}>
                                                                    {item.schedule}
                                                                </Text>
                                                            </View>
                                                        ) : null}
                                                    </View>
                                                ) : null}

                                                {/* Card Footer */}
                                                <View style={myClassPagesStyle.classCardFooter}>
                                                    <View style={myClassPagesStyle.classCardStudentCountBadge}>
                                                        <Ionicons name="people" size={15} color="#475569" />
                                                        <Text style={myClassPagesStyle.classCardStudentCountText}>
                                                            {item.studentCount || 0} Student{item.studentCount === 1 ? "" : "s"}
                                                        </Text>
                                                    </View>

                                                    <View style={myClassPagesStyle.classCardActionIcons}>
                                                        <Pressable
                                                            onPress={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenEditClass(item);
                                                            }}
                                                            hitSlop={6}
                                                            style={myClassPagesStyle.classCardIconBtn}
                                                        >
                                                            <Ionicons name="create-outline" size={16} color="#64748B" />
                                                        </Pressable>
                                                        <Pressable
                                                            onPress={(e) => {
                                                                e.stopPropagation();
                                                                setDeletingClass(item);
                                                            }}
                                                            hitSlop={6}
                                                            style={myClassPagesStyle.classCardIconBtn}
                                                        >
                                                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                                        </Pressable>
                                                        <View
                                                            style={[
                                                                myClassPagesStyle.classCardOpenBadge,
                                                                { backgroundColor: `${accentColor}15` },
                                                            ]}
                                                        >
                                                            <Text
                                                                style={[
                                                                    myClassPagesStyle.classCardOpenText,
                                                                    { color: accentColor },
                                                                ]}
                                                            >
                                                                Open Roster
                                                            </Text>
                                                            <Ionicons name="chevron-forward" size={14} color={accentColor} />
                                                        </View>
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
                       VIEW B: CLASS DETAILS & STUDENT ROSTER (Drill-down)
                       ========================================================================= */
                    <>
                        {/* Class Header Card with Navigation & Actions */}
                        <View style={myClassPagesStyle.classDetailHeaderCard}>
                            <View style={myClassPagesStyle.classDetailTopBar}>
                                <Pressable
                                    onPress={() => setSelectedClass(null)}
                                    style={myClassPagesStyle.backButton}
                                    hitSlop={8}
                                >
                                    <Ionicons name="arrow-back" size={16} color="#4F46E5" />
                                    <Text style={myClassPagesStyle.backButtonText}>All Classes</Text>
                                </Pressable>

                                <View style={{ flexDirection: "row", gap: 6 }}>
                                    <Pressable
                                        onPress={() => handleOpenEditClass(selectedClass)}
                                        style={myClassPagesStyle.classCardIconBtn}
                                        hitSlop={8}
                                    >
                                        <Ionicons name="create-outline" size={17} color="#4F46E5" />
                                    </Pressable>
                                    <Pressable
                                        onPress={() => setDeletingClass(selectedClass)}
                                        style={myClassPagesStyle.classCardIconBtn}
                                        hitSlop={8}
                                    >
                                        <Ionicons name="trash-outline" size={17} color="#EF4444" />
                                    </Pressable>
                                </View>
                            </View>

                            <Text style={myClassPagesStyle.classDetailTitle}>
                                {selectedClass.name}
                            </Text>
                            {selectedClass.subject ? (
                                <Text style={myClassPagesStyle.classDetailSubtitle}>
                                    {selectedClass.subject}
                                </Text>
                            ) : null}

                            <View style={myClassPagesStyle.classDetailMetaRow}>
                                {selectedClass.section ? (
                                    <View style={myClassPagesStyle.classDetailMetaBadge}>
                                        <Ionicons name="bookmark-outline" size={13} color="#475569" />
                                        <Text style={myClassPagesStyle.classDetailMetaBadgeText}>
                                            Section: {selectedClass.section}
                                        </Text>
                                    </View>
                                ) : null}
                                {selectedClass.room ? (
                                    <View style={myClassPagesStyle.classDetailMetaBadge}>
                                        <Ionicons name="location-outline" size={13} color="#475569" />
                                        <Text style={myClassPagesStyle.classDetailMetaBadgeText}>
                                            {selectedClass.room}
                                        </Text>
                                    </View>
                                ) : null}
                                {selectedClass.schedule ? (
                                    <View style={myClassPagesStyle.classDetailMetaBadge}>
                                        <Ionicons name="time-outline" size={13} color="#475569" />
                                        <Text style={myClassPagesStyle.classDetailMetaBadgeText}>
                                            {selectedClass.schedule}
                                        </Text>
                                    </View>
                                ) : null}
                                <View style={myClassPagesStyle.classDetailMetaBadge}>
                                    <Ionicons name="people" size={13} color="#4F46E5" />
                                    <Text style={[myClassPagesStyle.classDetailMetaBadgeText, { color: "#4F46E5", fontWeight: "700" }]}>
                                        {students.length} Enrolled
                                    </Text>
                                </View>
                            </View>

                            {/* Quick Links to Attendance & Gradebook for this class */}
                            <View style={myClassPagesStyle.classDetailQuickNavRow}>
                                <Pressable
                                    onPress={() => navigation.navigate("attendance", { username, classId: selectedClass.id })}
                                    style={myClassPagesStyle.classQuickNavBtn}
                                >
                                    <Ionicons name="calendar-outline" size={15} color="#059669" />
                                    <Text style={[myClassPagesStyle.classQuickNavBtnText, { color: "#059669" }]}>
                                        Class Attendance
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => navigation.navigate("gradebook", { username, classId: selectedClass.id })}
                                    style={myClassPagesStyle.classQuickNavBtn}
                                >
                                    <Ionicons name="ribbon-outline" size={15} color="#4F46E5" />
                                    <Text style={[myClassPagesStyle.classQuickNavBtnText, { color: "#4F46E5" }]}>
                                        Class Gradebook
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Student Roster Section Header with Add & Bulk Upload Buttons */}
                        <View style={myClassPagesStyle.section}>
                            <View style={myClassPagesStyle.classRosterActionBar}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                    <Text style={myClassPagesStyle.sectionTitle}>Class Roster</Text>
                                    <View style={myClassPagesStyle.countBadge}>
                                        <Text style={myClassPagesStyle.countBadgeText}>
                                            {filteredStudents.length} of {students.length}
                                        </Text>
                                    </View>
                                </View>

                                <View style={{ flexDirection: "row", gap: 8 }}>
                                    <Pressable
                                        onPress={handlePickXlsx}
                                        disabled={isBulkLoading}
                                        style={({ pressed }) => [
                                            myClassPagesStyle.bulkButton,
                                            pressed && myClassPagesStyle.bulkButtonPressed,
                                        ]}
                                    >
                                        {isBulkLoading ? (
                                            <ActivityIndicator size="small" color="#4F46E5" />
                                        ) : (
                                            <Ionicons name="cloud-upload-outline" size={15} color="#4F46E5" />
                                        )}
                                        <Text style={myClassPagesStyle.bulkButtonText}>Import</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={handleOpenAddStudent}
                                        style={({ pressed }) => [
                                            myClassPagesStyle.addButton,
                                            pressed && myClassPagesStyle.addButtonPressed,
                                        ]}
                                    >
                                        <Ionicons name="person-add" size={15} color="#FFFFFF" />
                                        <Text style={myClassPagesStyle.addButtonText}>Add Student</Text>
                                    </Pressable>
                                </View>
                            </View>

                            {/* Search Student in Roster */}
                            <View style={myClassPagesStyle.filterContainer}>
                                <Ionicons name="search-outline" size={18} color="#94A3B8" />
                                <TextInput
                                    style={myClassPagesStyle.filterInput}
                                    placeholder="Search student in this class..."
                                    placeholderTextColor="#94A3B8"
                                    value={studentSearchQuery}
                                    onChangeText={setStudentSearchQuery}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                {studentSearchQuery.length > 0 && (
                                    <Pressable
                                        onPress={() => setStudentSearchQuery("")}
                                        style={myClassPagesStyle.filterClearButton}
                                        hitSlop={8}
                                    >
                                        <Ionicons name="close-circle" size={16} color="#94A3B8" />
                                    </Pressable>
                                )}
                            </View>

                            {/* Roster Table */}
                            {filteredStudents.length === 0 ? (
                                <View style={myClassPagesStyle.emptyCard}>
                                    <Ionicons
                                        name="people-outline"
                                        size={44}
                                        color="#94A3B8"
                                        style={myClassPagesStyle.emptyIcon}
                                    />
                                    <Text style={myClassPagesStyle.emptyText}>
                                        {studentSearchQuery.trim()
                                            ? `No students matching "${studentSearchQuery}"`
                                            : "No students in this class yet"}
                                    </Text>
                                    <Text style={myClassPagesStyle.emptySubtext}>
                                        {studentSearchQuery.trim()
                                            ? "Try searching with a different spelling or name."
                                            : "Add students manually or import an Excel spreadsheet to populate the roster."}
                                    </Text>
                                    {!studentSearchQuery.trim() && (
                                        <Pressable
                                            onPress={handleOpenAddStudent}
                                            style={[myClassPagesStyle.addButton, { marginTop: 14, alignSelf: "center" }]}
                                        >
                                            <Ionicons name="person-add" size={16} color="#FFFFFF" />
                                            <Text style={myClassPagesStyle.addButtonText}>Add First Student</Text>
                                        </Pressable>
                                    )}
                                </View>
                            ) : (
                                <View style={myClassPagesStyle.tableCard}>
                                    {/* Table Header */}
                                    <View style={myClassPagesStyle.tableHeader}>
                                        <Text style={[myClassPagesStyle.tableHeaderCell, myClassPagesStyle.tableCellIndex]}>
                                            #
                                        </Text>
                                        <Pressable
                                            onPress={toggleSort}
                                            style={myClassPagesStyle.tableHeaderNameCell}
                                            hitSlop={8}
                                        >
                                            <Text style={myClassPagesStyle.tableHeaderCell}>Student Name</Text>
                                            <Ionicons
                                                name={
                                                    sortAsc === true
                                                        ? "arrow-up"
                                                        : sortAsc === false
                                                        ? "arrow-down"
                                                        : "swap-vertical"
                                                }
                                                size={13}
                                                color="#64748B"
                                            />
                                        </Pressable>
                                        <Text style={[myClassPagesStyle.tableHeaderCell, { width: 50, textAlign: "center" }]}>
                                            Action
                                        </Text>
                                    </View>

                                    {/* Table Rows */}
                                    {filteredStudents.map((student, index) => {
                                        const isEven = index % 2 === 0;
                                        const initials = `${student.firstname[0] || ""}${student.lastname[0] || ""}`.toUpperCase();
                                        const fullName = formatStudentName(student);

                                        return (
                                            <View
                                                key={student.id}
                                                style={[
                                                    myClassPagesStyle.tableRow,
                                                    isEven ? myClassPagesStyle.tableRowEven : myClassPagesStyle.tableRowOdd,
                                                ]}
                                            >
                                                <Text style={myClassPagesStyle.tableCellIndex}>{index + 1}</Text>

                                                <View style={myClassPagesStyle.avatar}>
                                                    <Text style={myClassPagesStyle.avatarText}>{initials}</Text>
                                                </View>

                                                <View style={myClassPagesStyle.tableCellName}>
                                                    <Text style={myClassPagesStyle.studentFullName} numberOfLines={1}>
                                                        {fullName}
                                                    </Text>
                                                    {student.suffix && student.suffix !== "None" ? (
                                                        <View style={myClassPagesStyle.suffixBadge}>
                                                            <Text style={myClassPagesStyle.suffixBadgeText}>
                                                                {student.suffix}
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                </View>

                                                <Pressable
                                                    onPress={() => handleRemoveStudent(student.id, fullName)}
                                                    style={myClassPagesStyle.removeStudentBtn}
                                                    hitSlop={8}
                                                >
                                                    <Ionicons name="trash-outline" size={17} color="#94A3B8" />
                                                </Pressable>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>

            {/* =========================================================================
                MODALS
                ========================================================================= */}

            {/* Create / Edit Class Modal */}
            <Modal
                visible={isClassModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsClassModalOpen(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={myClassPagesStyle.modalOverlay}
                >
                    <View style={myClassPagesStyle.modalContent}>
                        <View style={myClassPagesStyle.modalHeader}>
                            <Text style={myClassPagesStyle.modalTitle}>
                                {editingClass ? "Edit Class" : "Create New Class"}
                            </Text>
                            <Pressable onPress={() => setIsClassModalOpen(false)} hitSlop={8}>
                                <Ionicons name="close" size={22} color="#64748B" />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                            <InputGroup
                                label="Class Name *"
                                placeholder="e.g. Mathematics 10, English 8"
                                value={className}
                                onChangeText={setClassName}
                            />

                            <InputGroup
                                label="Section"
                                placeholder="e.g. Diamond, Section A, Grade 10-A"
                                value={classSection}
                                onChangeText={setClassSection}
                            />

                            <InputGroup
                                label="Subject"
                                placeholder="e.g. Algebra & Trigonometry"
                                value={classSubject}
                                onChangeText={setClassSubject}
                            />

                            <InputGroup
                                label="Room"
                                placeholder="e.g. Room 302, Science Lab"
                                value={classRoom}
                                onChangeText={setClassRoom}
                            />

                            <InputGroup
                                label="Schedule"
                                placeholder="e.g. MWF 8:00 AM - 9:30 AM"
                                value={classSchedule}
                                onChangeText={setClassSchedule}
                            />

                            {/* Color Picker Chips */}
                            <Text style={{ fontSize: 13, fontWeight: "600", color: "#334155", marginBottom: 8 }}>
                                Card Color Theme
                            </Text>
                            <View style={myClassPagesStyle.colorPaletteRow}>
                                {COLOR_PALETTE.map((c) => {
                                    const isSelected = classColor === c;
                                    return (
                                        <Pressable
                                            key={c}
                                            onPress={() => setClassColor(c)}
                                            style={[
                                                myClassPagesStyle.colorChip,
                                                { backgroundColor: c },
                                                isSelected && myClassPagesStyle.colorChipSelected,
                                            ]}
                                        >
                                            {isSelected && (
                                                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                                            )}
                                        </Pressable>
                                    );
                                })}
                            </View>

                            <Button
                                label={
                                    isSubmittingClass
                                        ? "Saving..."
                                        : editingClass
                                        ? "Save Changes"
                                        : "Create Class"
                                }
                                onPress={isSubmittingClass ? undefined : handleSubmitClass}
                            />

                            <Pressable
                                onPress={() => setIsClassModalOpen(false)}
                                style={myClassPagesStyle.cancelButton}
                            >
                                <Text style={myClassPagesStyle.cancelButtonText}>Cancel</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Delete Class Confirmation Modal */}
            <Modal
                visible={deletingClass !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setDeletingClass(null)}
            >
                <View style={myClassPagesStyle.modalOverlay}>
                    <View style={myClassPagesStyle.modalContent}>
                        <View style={myClassPagesStyle.modalHeader}>
                            <Text style={[myClassPagesStyle.modalTitle, { color: "#EF4444" }]}>
                                Delete Class
                            </Text>
                            <Pressable onPress={() => setDeletingClass(null)} hitSlop={8}>
                                <Ionicons name="close" size={22} color="#64748B" />
                            </Pressable>
                        </View>

                        <Text style={{ fontSize: 14, color: "#475569", lineHeight: 20, marginBottom: 16 }}>
                            Are you sure you want to delete <Text style={{ fontWeight: "700" }}>{deletingClass?.name}</Text>?
                            This will also remove this class association from its student roster, attendance sessions, and gradebook.
                        </Text>

                        <Pressable
                            onPress={handleDeleteClass}
                            disabled={isDeletingClass}
                            style={[myClassPagesStyle.addButton, { backgroundColor: "#EF4444", justifyContent: "center" }]}
                        >
                            <Text style={myClassPagesStyle.addButtonText}>
                                {isDeletingClass ? "Deleting..." : "Yes, Delete Class"}
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => setDeletingClass(null)}
                            style={myClassPagesStyle.cancelButton}
                        >
                            <Text style={myClassPagesStyle.cancelButtonText}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Add Student to Class Modal */}
            <Modal
                visible={isStudentModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsStudentModalOpen(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={myClassPagesStyle.modalOverlay}
                >
                    <View style={myClassPagesStyle.modalContent}>
                        <View style={myClassPagesStyle.modalHeader}>
                            <Text style={myClassPagesStyle.modalTitle}>
                                Add Student to {selectedClass?.name}
                            </Text>
                            <Pressable onPress={() => setIsStudentModalOpen(false)} hitSlop={8}>
                                <Ionicons name="close" size={22} color="#64748B" />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <InputGroup
                                label="First Name *"
                                placeholder="e.g. Juan"
                                value={studentForm.firstname}
                                onChangeText={(v) => setStudentForm((p) => ({ ...p, firstname: v }))}
                            />

                            <InputGroup
                                label="Middle Name"
                                placeholder="e.g. Protacio (optional)"
                                value={studentForm.middlename || ""}
                                onChangeText={(v) => setStudentForm((p) => ({ ...p, middlename: v }))}
                            />

                            <InputGroup
                                label="Last Name *"
                                placeholder="e.g. Dela Cruz"
                                value={studentForm.lastname}
                                onChangeText={(v) => setStudentForm((p) => ({ ...p, lastname: v }))}
                            />

                            <SelectGroup
                                label="Suffix"
                                options={SUFFIX_OPTIONS}
                                value={studentForm.suffix || "None"}
                                onSelect={(val: string) => setStudentForm((p) => ({ ...p, suffix: val }))}
                            />

                            <Button
                                label={isSubmittingStudent ? "Adding Student..." : "Add to Class Roster"}
                                onPress={isSubmittingStudent ? undefined : handleSubmitStudent}
                            />

                            <Pressable
                                onPress={() => setIsStudentModalOpen(false)}
                                style={myClassPagesStyle.cancelButton}
                            >
                                <Text style={myClassPagesStyle.cancelButtonText}>Cancel</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Bulk Upload Preview Modal */}
            <Modal
                visible={isBulkModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsBulkModalOpen(false)}
            >
                <View style={myClassPagesStyle.modalOverlay}>
                    <View style={myClassPagesStyle.modalContent}>
                        <View style={myClassPagesStyle.modalHeader}>
                            <Text style={myClassPagesStyle.modalTitle}>Confirm Bulk Import</Text>
                            <Pressable onPress={() => setIsBulkModalOpen(false)} hitSlop={8}>
                                <Ionicons name="close" size={22} color="#64748B" />
                            </Pressable>
                        </View>

                        {bulkPreview && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={myClassPagesStyle.previewCard}>
                                    <Text style={myClassPagesStyle.previewFileName}>
                                        📄 {bulkPreview.fileName}
                                    </Text>
                                    <Text style={myClassPagesStyle.previewStats}>
                                        ✓ {bulkPreview.students.length} student
                                        {bulkPreview.students.length > 1 ? "s" : ""} will be added to {selectedClass?.name}
                                    </Text>
                                    {bulkPreview.skippedCount > 0 && (
                                        <Text style={myClassPagesStyle.previewSkipped}>
                                            ⚠ {bulkPreview.skippedCount} row
                                            {bulkPreview.skippedCount > 1 ? "s" : ""} skipped (missing first or last name)
                                        </Text>
                                    )}

                                    <Text style={myClassPagesStyle.previewListTitle}>
                                        Preview (first {Math.min(5, bulkPreview.students.length)} students):
                                    </Text>
                                    {bulkPreview.students.slice(0, 5).map((s, idx) => (
                                        <View key={idx} style={myClassPagesStyle.previewItem}>
                                            <Ionicons name="person-outline" size={13} color="#64748B" />
                                            <Text style={myClassPagesStyle.previewItemText}>
                                                {formatStudentName(s)}
                                            </Text>
                                        </View>
                                    ))}
                                    {bulkPreview.students.length > 5 && (
                                        <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 4, fontStyle: "italic" }}>
                                            ...and {bulkPreview.students.length - 5} more
                                        </Text>
                                    )}
                                </View>

                                <Button
                                    label={
                                        isBulkLoading
                                            ? "Importing..."
                                            : `Import ${bulkPreview.students.length} Students`
                                    }
                                    onPress={isBulkLoading ? undefined : handleConfirmBulkImport}
                                />

                                <Pressable
                                    onPress={() => setIsBulkModalOpen(false)}
                                    style={myClassPagesStyle.cancelButton}
                                >
                                    <Text style={myClassPagesStyle.cancelButtonText}>Cancel</Text>
                                </Pressable>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Dialog Message */}
            <DialogMessage
                visible={dialog.visible}
                type={dialog.type}
                title={dialog.title}
                message={dialog.message}
                onClose={() => setDialog((prev) => ({ ...prev, visible: false }))}
            />

            <BottomNavBar activeTab="myclass" onTabPress={handleTabPress} />
        </View>
    );
}
