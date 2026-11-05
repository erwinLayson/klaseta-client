import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
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

