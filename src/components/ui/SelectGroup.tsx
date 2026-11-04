import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export interface SelectOption {
    label: string;
    value: string;
}

interface SelectGroupProps {
    label: string;
    value: string;
    options: SelectOption[];
    onSelect: (value: string) => void;
    placeholder?: string;
}

export function SelectGroup({
    label,
    value,
    options,
    onSelect,
    placeholder = "Select an option",
}: SelectGroupProps) {
    const [isOpen, setIsOpen] = useState(false);

    const selectedOption = options.find((opt) => opt.value === value);
    const displayText = selectedOption ? selectedOption.label : placeholder;

    return (
        <View style={styles.group}>
            <Text style={styles.label}>{label}</Text>

            <Pressable
                onPress={() => setIsOpen(true)}
                style={({ pressed }) => [
                    styles.selector,
                    isOpen && styles.selectorActive,
                    pressed && styles.selectorPressed,
                ]}
            >
                <Text
                    style={[
                        styles.selectorText,
                        !selectedOption && styles.placeholderText,
                    ]}
                >
                    {displayText}
                </Text>
                <Ionicons
                    name="chevron-down"
                    size={18}
                    color="#64748B"
                />
            </Pressable>

            <Modal
                visible={isOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsOpen(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setIsOpen(false)}
                >
                    <Pressable
                        style={styles.modalCard}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select {label}</Text>
                            <Pressable
                                onPress={() => setIsOpen(false)}
                                hitSlop={8}
                            >
                                <Ionicons name="close" size={22} color="#64748B" />
                            </Pressable>
                        </View>

                        <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
                            {options.map((option) => {
                                const isSelected = option.value === value;

                                return (
                                    <Pressable
                                        key={option.value}
                                        onPress={() => {
                                            onSelect(option.value);
                                            setIsOpen(false);
                                        }}
                                        style={({ pressed }) => [
                                            styles.optionItem,
                                            isSelected && styles.optionItemSelected,
                                            pressed && styles.optionItemPressed,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.optionText,
                                                isSelected && styles.optionTextSelected,
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                        {isSelected && (
                                            <Ionicons
                                                name="checkmark-circle"
                                                size={20}
                                                color="#4F46E5"
                                            />
                                        )}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    group: {
        marginBottom: 18,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: "#334155",
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    selector: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: "#F8FAFC",
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    selectorActive: {
        borderColor: "#4F46E5",
        backgroundColor: "#FFFFFF",
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 2,
    },
    selectorPressed: {
        opacity: 0.8,
    },
    selectorText: {
        fontSize: 15,
        color: "#0F172A",
    },
    placeholderText: {
        color: "#94A3B8",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },
    modalCard: {
        width: "100%",
        maxWidth: 360,
        maxHeight: "75%",
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 20,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.12,
        shadowRadius: 28,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#0F172A",
        letterSpacing: -0.2,
    },
    optionsList: {
        marginTop: 4,
    },
    optionItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 13,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginVertical: 2,
    },
    optionItemSelected: {
        backgroundColor: "#EEF2FF",
    },
    optionItemPressed: {
        backgroundColor: "#F1F5F9",
    },
    optionText: {
        fontSize: 15,
        color: "#334155",
        fontWeight: "500",
    },
    optionTextSelected: {
        color: "#4F46E5",
        fontWeight: "700",
    },
});

