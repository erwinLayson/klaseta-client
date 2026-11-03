import { Pressable, StyleSheet, Text } from "react-native";

interface ButtonProps {
    label: string,
    onPress?: () => void
}

export function Button({ label, onPress }: ButtonProps) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
            <Text style={styles.label}>{label}</Text>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    button: {
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#4F46E5",
        borderRadius: 14,
        paddingVertical: 16,
        marginTop: 8,
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.28,
        shadowRadius: 16,
        elevation: 4,
    },
    buttonPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
    label: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
});
