import { useState } from "react";
import { StyleSheet, Text, View, TextInput } from "react-native";

interface InputGroupProps {
    label: string,
    value?: string,
    placeholder: string,
    onChangeText?: (value: string) => void,
    secureText?: boolean
}

export function InputGroup({ label, placeholder, value, onChangeText, secureText }: InputGroupProps) {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.group}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={[styles.input, isFocused && styles.inputFocused]}
                placeholder={placeholder}
                placeholderTextColor="#94A3B8"
                value={value}
                onChangeText={onChangeText ? (value) => onChangeText(value) : undefined}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                secureTextEntry={secureText}
                selectionColor="#4F46E5"
            />
        </View>
    )
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
    input: {
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: "#F8FAFC",
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: "#0F172A",
    },
    inputFocused: {
        borderColor: "#4F46E5",
        backgroundColor: "#FFFFFF",
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 2,
    },
});
