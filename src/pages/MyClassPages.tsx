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
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { myClassPagesStyle } from "../styles/index";
import { RootParamList } from "../types/RootParamList";
import type { Student, AddStudentInput } from "../types/student";
import { addStudent, getStudentsByTeacher } from "../services/pages/MyClassPages";
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

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form, setForm] = useState<AddStudentInput>({
        firstname: "",
        middlename: "",
        lastname: "",
        suffix: "None",
    });

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
        loadStudents();
    }, [loadStudents]);

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

    const formatStudentName = useCallback((student: Student) => {
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
                                Tap &quot;Add Student&quot; to begin building your class roster.
                            </Text>
                            <Pressable
                                onPress={handleOpenModal}
                                style={({ pressed }) => [
                                    myClassPagesStyle.addButton,
                                    pressed && myClassPagesStyle.addButtonPressed,
                                ]}
                            >
                                <Ionicons name="add" size={18} color="#FFFFFF" />
                                <Text style={myClassPagesStyle.addButtonText}>Add First Student</Text>
                            </Pressable>
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

            {/* Add Student Modal */}
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
