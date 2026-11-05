import React, { useState, useMemo } from "react";
import {
    Modal,
    View,
    Text,
    Pressable,
    StyleSheet,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export interface CalendarPickerModalProps {
    visible: boolean;
    selectedDate: string; // "YYYY-MM-DD" or ""
    onSelectDate: (dateStr: string) => void;
    onClose: () => void;
    markedDates?: string[]; // Dates that have records in the database
    title?: string;
    subtitle?: string;
    accentColor?: string; // Default "#059669"
}

const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function padZero(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

function formatDateString(year: number, month: number, day: number): string {
    return `${year}-${padZero(month + 1)}-${padZero(day)}`;
}

function getTodayString(): string {
    const today = new Date();
    return formatDateString(today.getFullYear(), today.getMonth(), today.getDate());
}

function CalendarPickerContent({
    selectedDate,
    onSelectDate,
    onClose,
    markedDates = [],
    title = "Select Date",
    subtitle = "Choose any date from the calendar to filter records",
    accentColor = "#059669",
}: Omit<CalendarPickerModalProps, "visible">) {
    const todayStr = useMemo(() => getTodayString(), []);
    const markedSet = useMemo(() => new Set(markedDates), [markedDates]);

    // Current viewed Year and Month in the calendar
    const [viewYear, setViewYear] = useState<number>(() => {
        if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
            return Number(selectedDate.slice(0, 4));
        }
        return new Date().getFullYear();
    });

    const [viewMonth, setViewMonth] = useState<number>(() => {
        if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
            return Number(selectedDate.slice(5, 7)) - 1;
        }
        return new Date().getMonth();
    });

    // Calendar grid calculations
    const calendarDays = useMemo(() => {
        const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

        const cells: {
            day: number | null;
            dateStr: string | null;
            isCurrentMonth: boolean;
        }[] = [];

        // Preceding blank cells
        for (let i = 0; i < firstDayIndex; i++) {
            cells.push({ day: null, dateStr: null, isCurrentMonth: false });
        }

        // Days of current month
        for (let d = 1; d <= daysInMonth; d++) {
            cells.push({
                day: d,
                dateStr: formatDateString(viewYear, viewMonth, d),
                isCurrentMonth: true,
            });
        }

        return cells;
    }, [viewYear, viewMonth]);

    const handlePrevMonth = () => {
        if (viewMonth === 0) {
            setViewYear((y) => y - 1);
            setViewMonth(11);
        } else {
            setViewMonth((m) => m - 1);
        }
    };

    const handleNextMonth = () => {
        if (viewMonth === 11) {
            setViewYear((y) => y + 1);
            setViewMonth(0);
        } else {
            setViewMonth((m) => m + 1);
        }
    };

    const handleJumpToToday = () => {
        const now = new Date();
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth());
        onSelectDate(todayStr);
        onClose();
    };

    const handleSelectDay = (dateStr: string) => {
        onSelectDate(dateStr);
        onClose();
    };

    const handleClearDate = () => {
        onSelectDate("");
        onClose();
    };

    return (
        <Pressable style={styles.overlay} onPress={onClose}>
            <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTitleRow}>
                        <Ionicons name="calendar" size={20} color={accentColor} />
                        <Text style={styles.title}>{title}</Text>
                    </View>
                    <Pressable onPress={onClose} hitSlop={8}>
                        <Ionicons name="close" size={22} color="#64748B" />
                    </Pressable>
                </View>

                <Text style={styles.subtitle}>{subtitle}</Text>

                {/* Quick Filter Buttons */}
                <View style={styles.quickButtonsRow}>
                    <Pressable
                        onPress={handleClearDate}
                        style={[
                            styles.quickButton,
                            selectedDate === "" && [
                                styles.quickButtonActive,
                                { borderColor: accentColor, backgroundColor: "#ECFDF5" },
                            ],
                        ]}
                    >
                        <Ionicons
                            name="layers-outline"
                            size={14}
                            color={selectedDate === "" ? accentColor : "#64748B"}
                        />
                        <Text
                            style={[
                                styles.quickButtonText,
                                selectedDate === "" && { color: accentColor, fontWeight: "700" },
                            ]}
                        >
                            All Dates
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={handleJumpToToday}
                        style={[
                            styles.quickButton,
                            selectedDate === todayStr && [
                                styles.quickButtonActive,
                                { borderColor: accentColor, backgroundColor: "#ECFDF5" },
                            ],
                        ]}
                    >
                        <Ionicons
                            name="today-outline"
                            size={14}
                            color={selectedDate === todayStr ? accentColor : "#64748B"}
                        />
                        <Text
                            style={[
                                styles.quickButtonText,
                                selectedDate === todayStr && { color: accentColor, fontWeight: "700" },
                            ]}
                        >
                            Today
                        </Text>
                    </Pressable>
                </View>

                {/* Month / Year Navigator */}
                <View style={styles.monthNavigator}>
                    <Pressable
                        onPress={handlePrevMonth}
                        style={styles.navArrowButton}
                        hitSlop={8}
                        accessibilityLabel="Previous month"
                    >
                        <Ionicons name="chevron-back" size={18} color="#334155" />
                    </Pressable>

                    <Text style={styles.monthTitle}>
                        {MONTH_NAMES[viewMonth]} {viewYear}
                    </Text>

                    <Pressable
                        onPress={handleNextMonth}
                        style={styles.navArrowButton}
                        hitSlop={8}
                        accessibilityLabel="Next month"
                    >
                        <Ionicons name="chevron-forward" size={18} color="#334155" />
                    </Pressable>
                </View>

                {/* Day of Week Headers */}
                <View style={styles.daysOfWeekRow}>
                    {DAYS_OF_WEEK.map((dayName, idx) => (
                        <View key={idx} style={styles.dayOfWeekCell}>
                            <Text style={styles.dayOfWeekText}>{dayName}</Text>
                        </View>
                    ))}
                </View>

                {/* Calendar Grid */}
                <View style={styles.grid}>
                    {calendarDays.map((cell, idx) => {
                        if (!cell.day || !cell.dateStr) {
                            return <View key={`blank_${idx}`} style={styles.dayCell} />;
                        }

                        const isSelected = selectedDate === cell.dateStr;
                        const isToday = todayStr === cell.dateStr;
                        const hasRecords = markedSet.has(cell.dateStr);

                        return (
                            <Pressable
                                key={cell.dateStr}
                                onPress={() => cell.dateStr && handleSelectDay(cell.dateStr)}
                                style={styles.dayCell}
                            >
                                <View
                                    style={[
                                        styles.dayNumberCircle,
                                        isSelected && [styles.dayNumberSelected, { backgroundColor: accentColor }],
                                        !isSelected && isToday && styles.dayNumberToday,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.dayNumberText,
                                            isSelected && styles.dayNumberTextSelected,
                                            !isSelected && isToday && [styles.dayNumberTextToday, { color: accentColor }],
                                        ]}
                                    >
                                        {cell.day}
                                    </Text>

                                    {/* Dot indicator for dates with database records */}
                                    {hasRecords && (
                                        <View
                                            style={[
                                                styles.recordDot,
                                                isSelected
                                                    ? styles.recordDotSelected
                                                    : { backgroundColor: accentColor },
                                            ]}
                                        />
                                    )}
                                </View>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Legend */}
                {markedDates.length > 0 && (
                    <View style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: accentColor }]} />
                        <Text style={styles.legendText}>
                            Dates with recorded sessions ({markedDates.length})
                        </Text>
                    </View>
                )}

                {/* Close / Cancel Button */}
                <Pressable onPress={onClose} style={styles.cancelButton}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
            </Pressable>
        </Pressable>
    );
}

export function CalendarPickerModal({
    visible,
    selectedDate,
    onSelectDate,
    onClose,
    markedDates = [],
    title = "Select Date",
    subtitle = "Choose any date from the calendar to filter records",
    accentColor = "#059669",
}: CalendarPickerModalProps) {
    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <CalendarPickerContent
                key={`${selectedDate}`}
                selectedDate={selectedDate}
                onSelectDate={onSelectDate}
                onClose={onClose}
                markedDates={markedDates}
                title={title}
                subtitle={subtitle}
                accentColor={accentColor}
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    content: {
        width: "100%",
        maxWidth: 380,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 22,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.12,
        shadowRadius: 28,
        elevation: 8,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    headerTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    title: {
        fontSize: 19,
        fontWeight: "700",
        color: "#0F172A",
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 12.5,
        color: "#64748B",
        marginBottom: 14,
        lineHeight: 18,
    },
    quickButtonsRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 14,
    },
    quickButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: "#F8FAFC",
    },
    quickButtonActive: {
        borderWidth: 1.5,
    },
    quickButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#475569",
    },
    monthNavigator: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#F8FAFC",
        borderRadius: 14,
        paddingHorizontal: 8,
        paddingVertical: 6,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    navArrowButton: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    monthTitle: {
        fontSize: 14.5,
        fontWeight: "700",
        color: "#0F172A",
    },
    daysOfWeekRow: {
        flexDirection: "row",
        marginBottom: 4,
    },
    dayOfWeekCell: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 4,
    },
    dayOfWeekText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#94A3B8",
        textTransform: "uppercase",
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    dayCell: {
        width: "14.28%", // 100% / 7 days
        aspectRatio: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 2,
    },
    dayNumberCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    dayNumberSelected: {
        shadowColor: "#059669",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 3,
    },
    dayNumberToday: {
        borderWidth: 1.5,
        borderColor: "#CBD5E1",
    },
    dayNumberText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#1E293B",
    },
    dayNumberTextSelected: {
        color: "#FFFFFF",
        fontWeight: "700",
    },
    dayNumberTextToday: {
        fontWeight: "700",
    },
    recordDot: {
        position: "absolute",
        bottom: 3,
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    recordDotSelected: {
        backgroundColor: "#FFFFFF",
    },
    legendRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
    },
    legendDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    legendText: {
        fontSize: 11,
        color: "#64748B",
        fontWeight: "500",
    },
    cancelButton: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        marginTop: 10,
    },
    cancelButtonText: {
        fontSize: 13.5,
        fontWeight: "600",
        color: "#64748B",
    },
});
