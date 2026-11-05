import { useState } from "react";
import { Modal, Pressable, Text, View, ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { styles } from "../../styles/components/ui/SelectGroup";

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
