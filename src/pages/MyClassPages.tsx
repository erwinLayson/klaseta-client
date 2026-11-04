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
import {
    addStudent,
    addStudentsBulk,
    parseXlsxFile,
    getStudentsByTeacher,
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

export function MyClassPages() {
    const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>();
    const route = useRoute<RouteProp<RootParamList, "myclass">>();
    const { username } = route.params;

    const [students, setStudents] = useState<Student[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortAsc, setSortAsc] = useState<boolean | null>(null);

    // Single student modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState<AddStudentInput>({
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

    const [dialog, setDialog] = useState({
        visible: false,
        type: "success" as DialogType,
        title: "",
        message: "",
    });

    const loadStudents = useCallback(async () => {
        const list = await getStudentsByTeacher(username);
        setStudents(list);
    }, [username]);

    useEffect(() => {
        let isMounted = true;
        const fetchStudents = async () => {
            const list = await getStudentsByTeacher(username);
            if (isMounted) {
                setStudents(list);
            }
        };
        fetchStudents();
        return () => {
            isMounted = false;
        };
    }, [username]);

    const handleTabPress = (tab: NavTab) => {
        if (tab !== "myclass") {
            navigation.navigate(tab, { username });
        }
    };

    const setField = (field: keyof AddStudentInput, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleOpenModal = () => {
        setForm({
            firstname: "",
            middlename: "",
            lastname: "",
            suffix: "None",
        });
        setIsModalOpen(true);
    };

    const handleSubmitStudent = async () => {
        if (isSubmitting) return;

        if (!form.firstname.trim() || !form.lastname.trim()) {
            setDialog({
                visible: true,
                type: "error",
                title: "Missing Fields",
                message: "First name and last name are required.",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await addStudent(username, form);

            if (result.success) {
                setIsModalOpen(false);
                setForm({
                    firstname: "",
                    middlename: "",
                    lastname: "",
                    suffix: "None",
                });
                await loadStudents();
                setDialog({
                    visible: true,
                    type: "success",
                    title: "Student Added",
                    message: result.message,
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
            setIsSubmitting(false);
        }
    };

    // Bulk XLSX File Picker
    const handlePickXlsx = async () => {
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
                        "No student records with first and last names were found in this file. Please ensure your column headers include First Name and Last Name.",
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
        if (!bulkPreview || isBulkLoading) return;

        setIsBulkLoading(true);
        try {
            const result = await addStudentsBulk(username, bulkPreview.students);

            setIsBulkModalOpen(false);
            setBulkPreview(null);
            await loadStudents();

            setDialog({
                visible: true,
                type: result.success ? "success" : "error",
                title: result.success ? "Bulk Import Completed" : "Import Error",
                message: result.message,
            });
        } finally {
            setIsBulkLoading(false);
        }
    };

    const formatStudentName = useCallback((student: { firstname: string; middlename?: string | null; lastname: string; suffix?: string | null }) => {
        const parts = [student.firstname];
        if (student.middlename) parts.push(student.middlename);
        parts.push(student.lastname);
        if (student.suffix && student.suffix !== "None") parts.push(student.suffix);
        return parts.join(" ");
    }, []);

    const filteredStudents = useMemo(() => {
        let result = students;

        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            result = result.filter((student) => {
                const fullName = formatStudentName(student).toLowerCase();
                return fullName.includes(query);
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
    }, [students, searchQuery, sortAsc, formatStudentName]);

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
                <View style={myClassPagesStyle.header}>
                    <View style={myClassPagesStyle.headerTopRow}>
                        <View style={myClassPagesStyle.headerTitleRow}>
                            <Ionicons name="school-outline" size={26} color="#4F46E5" />
                            <Text style={myClassPagesStyle.greeting}>My Class</Text>
                        </View>

                        <View style={myClassPagesStyle.headerActions}>
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
                                    <Ionicons name="cloud-upload-outline" size={16} color="#4F46E5" />
                                )}
                                <Text style={myClassPagesStyle.bulkButtonText}>
                                    {isBulkLoading ? "Reading..." : "Bulk Upload"}
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={handleOpenModal}
                                style={({ pressed }) => [
                                    myClassPagesStyle.addButton,
                                    pressed && myClassPagesStyle.addButtonPressed,
                                ]}
                            >
                                <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
                                <Text style={myClassPagesStyle.addButtonText}>Add Student</Text>
                            </Pressable>
                        </View>
                    </View>
                    <Text style={myClassPagesStyle.subtitle}>
                        Manage enrolled students in your class
                    </Text>
                </View>

                <View style={myClassPagesStyle.statsRow}>
                    <View style={myClassPagesStyle.statCard}>
                        <Text style={myClassPagesStyle.statValue}>{students.length}</Text>
                        <Text style={myClassPagesStyle.statLabel}>Total Students</Text>
                    </View>
                    <View style={myClassPagesStyle.statCard}>
                        <Text style={myClassPagesStyle.statValue}>1</Text>
                        <Text style={myClassPagesStyle.statLabel}>Active Class</Text>
                    </View>
                </View>

                <View style={myClassPagesStyle.section}>
                    <View style={myClassPagesStyle.sectionHeaderRow}>
                        <Text style={myClassPagesStyle.sectionTitle}>Students Roster</Text>
                        <View style={myClassPagesStyle.countBadge}>
                            <Text style={myClassPagesStyle.countBadgeText}>
                                {filteredStudents.length} of {students.length}
                            </Text>
                        </View>
                    </View>

                    {/* Filter by Name Header */}
                    <View style={myClassPagesStyle.filterContainer}>
                        <Ionicons name="search-outline" size={18} color="#94A3B8" />
                        <TextInput
                            style={myClassPagesStyle.filterInput}
                            placeholder="Filter by student name..."
                            placeholderTextColor="#94A3B8"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <Pressable
                                onPress={() => setSearchQuery("")}
                                style={myClassPagesStyle.filterClearButton}
                                hitSlop={8}
                            >
                                <Ionicons name="close-circle" size={18} color="#94A3B8" />
                            </Pressable>
                        )}
                    </View>

                    {/* Students Table */}
                    {students.length === 0 ? (
                        <View style={myClassPagesStyle.emptyCard}>
                            <Ionicons
                                name="people-outline"
                                size={44}
                                color="#94A3B8"
                                style={myClassPagesStyle.emptyIcon}
                            />
                            <Text style={myClassPagesStyle.emptyText}>No students added yet</Text>
                            <Text style={myClassPagesStyle.emptySubtext}>
                                Tap &quot;Add Student&quot; or &quot;Bulk Upload&quot; to import your class roster from an Excel file.
                            </Text>
                            <View style={myClassPagesStyle.emptyActionsRow}>
                                <Pressable
                                    onPress={handleOpenModal}
                                    style={({ pressed }) => [
                                        myClassPagesStyle.addButton,
                                        pressed && myClassPagesStyle.addButtonPressed,
                                    ]}
                                >
                                    <Ionicons name="add" size={18} color="#FFFFFF" />
                                    <Text style={myClassPagesStyle.addButtonText}>Add Student</Text>
                                </Pressable>

                                <Pressable
                                    onPress={handlePickXlsx}
                                    style={({ pressed }) => [
                                        myClassPagesStyle.bulkButton,
                                        pressed && myClassPagesStyle.bulkButtonPressed,
                                    ]}
                                >
                                    <Ionicons name="cloud-upload-outline" size={16} color="#4F46E5" />
                                    <Text style={myClassPagesStyle.bulkButtonText}>Bulk Upload</Text>
                                </Pressable>
                            </View>
                        </View>
                    ) : (
                        <View style={myClassPagesStyle.tableCard}>
                            {/* Table Header Row */}
                            <View style={myClassPagesStyle.tableHeader}>
                                <Text
                                    style={[
                                        myClassPagesStyle.tableHeaderCell,
                                        myClassPagesStyle.tableCellIndex,
                                    ]}
                                >
                                    #
                                </Text>

                                <Pressable
                                    onPress={toggleSort}
                                    style={myClassPagesStyle.tableHeaderNameCell}
                                >
                                    <Text style={myClassPagesStyle.tableHeaderCell}>Name</Text>
                                    <Ionicons
                                        name={
                                            sortAsc === true
                                                ? "arrow-up"
                                                : sortAsc === false
                                                ? "arrow-down"
                                                : "swap-vertical"
                                        }
                                        size={14}
                                        color={sortAsc !== null ? "#4F46E5" : "#94A3B8"}
                                    />
                                </Pressable>

                                <Text
                                    style={[
                                        myClassPagesStyle.tableHeaderCell,
                                        myClassPagesStyle.tableCellSuffix,
                                        { textAlign: "center" },
                                    ]}
                                >
                                    Suffix
                                </Text>

                                <Text
                                    style={[
                                        myClassPagesStyle.tableHeaderCell,
                                        myClassPagesStyle.tableCellId,
                                    ]}
                                >
                                    ID
                                </Text>
                            </View>

                            {/* Table Body Rows */}
                            {filteredStudents.length === 0 ? (
                                <View style={myClassPagesStyle.tableEmptyMessage}>
                                    <Ionicons name="search" size={28} color="#CBD5E1" />
                                    <Text style={myClassPagesStyle.tableEmptyText}>
                                        No students found matching &quot;{searchQuery}&quot;
                                    </Text>
                                    <Pressable
                                        onPress={() => setSearchQuery("")}
                                        style={myClassPagesStyle.clearFilterButton}
                                    >
                                        <Text style={myClassPagesStyle.clearFilterButtonText}>
                                            Clear Filter
                                        </Text>
                                    </Pressable>
                                </View>
                            ) : (
                                filteredStudents.map((student, index) => {
                                    const hasSuffix =
                                        student.suffix && student.suffix !== "None";

                                    return (
                                        <View
                                            key={student.id}
                                            style={[
                                                myClassPagesStyle.tableRow,
                                                index % 2 === 0
                                                    ? myClassPagesStyle.tableRowEven
                                                    : myClassPagesStyle.tableRowOdd,
                                            ]}
                                        >
                                            <Text style={myClassPagesStyle.tableCellIndex}>
                                                {index + 1}
                                            </Text>

                                            <View style={myClassPagesStyle.tableCellName}>
                                                <Text
                                                    style={myClassPagesStyle.studentFullName}
                                                    numberOfLines={1}
                                                >
                                                    {student.firstname}{" "}
                                                    {student.middlename ? `${student.middlename} ` : ""}
                                                    {student.lastname}
                                                </Text>
                                            </View>

                                            <View style={myClassPagesStyle.tableCellSuffix}>
                                                {hasSuffix ? (
                                                    <View style={myClassPagesStyle.suffixBadge}>
                                                        <Text
                                                            style={
                                                                myClassPagesStyle.suffixBadgeText
                                                            }
                                                        >
                                                            {student.suffix}
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <Text style={myClassPagesStyle.noSuffixText}>
                                                        —
                                                    </Text>
                                                )}
                                            </View>

                                            <Text style={myClassPagesStyle.tableCellId}>
                                                #{student.id}
                                            </Text>
                                        </View>
                                    );
                                })
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Single Student Add Modal */}
            <Modal
                visible={isModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsModalOpen(false)}
            >
                <KeyboardAvoidingView
                    style={myClassPagesStyle.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <View style={myClassPagesStyle.modalContent}>
                        <View style={myClassPagesStyle.modalHeader}>
                            <Text style={myClassPagesStyle.modalTitle}>Add New Student</Text>
                            <Pressable
                                onPress={() => setIsModalOpen(false)}
                                hitSlop={8}
                            >
                                <Ionicons name="close" size={22} color="#64748B" />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <InputGroup
                                label="First Name"
                                placeholder="Enter first name"
                                value={form.firstname}
                                onChangeText={(value) => setField("firstname", value)}
                            />

                            <InputGroup
                                label="Middle Name (Optional)"
                                placeholder="Enter middle name"
                                value={form.middlename}
                                onChangeText={(value) => setField("middlename", value)}
                            />

                            <InputGroup
                                label="Last Name"
                                placeholder="Enter last name"
                                value={form.lastname}
                                onChangeText={(value) => setField("lastname", value)}
                            />

                            <SelectGroup
                                label="Suffix"
                                value={form.suffix ?? "None"}
                                options={SUFFIX_OPTIONS}
                                onSelect={(value) => setField("suffix", value)}
                                placeholder="Select suffix"
                            />

                            <Button
                                label={isSubmitting ? "Adding Student..." : "Save Student"}
                                onPress={handleSubmitStudent}
                            />

                            <Pressable
                                onPress={() => setIsModalOpen(false)}
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
                onRequestClose={() => {
                    if (!isBulkLoading) setIsBulkModalOpen(false);
                }}
            >
                <View style={myClassPagesStyle.modalOverlay}>
                    <View style={myClassPagesStyle.modalContent}>
                        <View style={myClassPagesStyle.modalHeader}>
                            <Text style={myClassPagesStyle.modalTitle}>Bulk Import Preview</Text>
                            <Pressable
                                onPress={() => !isBulkLoading && setIsBulkModalOpen(false)}
                                hitSlop={8}
                            >
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
                                        ✓ {bulkPreview.students.length} student records found
                                    </Text>
                                    {bulkPreview.skippedCount > 0 && (
                                        <Text style={myClassPagesStyle.previewSkipped}>
                                            ⚠ {bulkPreview.skippedCount} rows skipped (missing first/last name)
                                        </Text>
                                    )}

                                    <Text style={myClassPagesStyle.previewListTitle}>
                                        Sample Preview (first {Math.min(5, bulkPreview.students.length)}):
                                    </Text>
                                    {bulkPreview.students.slice(0, 5).map((item, idx) => (
                                        <View key={idx} style={myClassPagesStyle.previewItem}>
                                            <Ionicons name="checkmark" size={14} color="#16A34A" />
                                            <Text style={myClassPagesStyle.previewItemText}>
                                                {formatStudentName(item)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>

                                <Button
                                    label={
                                        isBulkLoading
                                            ? "Importing Students..."
                                            : `Import ${bulkPreview.students.length} Students`
                                    }
                                    onPress={handleConfirmBulkImport}
                                />

                                <Pressable
                                    onPress={() => !isBulkLoading && setIsBulkModalOpen(false)}
                                    style={myClassPagesStyle.cancelButton}
                                >
                                    <Text style={myClassPagesStyle.cancelButtonText}>Cancel</Text>
                                </Pressable>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

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
