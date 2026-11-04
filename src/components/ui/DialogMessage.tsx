import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type DialogType = "success" | "error";

interface DialogMessageProps {
    visible: boolean;
    type: DialogType;
    title: string;
    message: string;
    onClose: () => void;
}

export function DialogMessage({ visible, type, title, message, onClose }: DialogMessageProps) {
    const isSuccess = type === "success";

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={[styles.iconCircle, isSuccess ? styles.iconSuccess : styles.iconError]}>
                        <Ionicons
                            name={isSuccess ? "checkmark" : "close"}
                            size={28}
                            color={isSuccess ? "#16A34A" : "#DC2626"}
                        />
                    </View>

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <Pressable
                        onPress={onClose}
                        style={({ pressed }) => [
                            styles.button,
                            isSuccess ? styles.buttonSuccess : styles.buttonError,
                            pressed && styles.buttonPressed,
                        ]}
                    >
                        <Text style={styles.buttonLabel}>OK</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
    },
    container: {
        width: "100%",
        maxWidth: 340,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        paddingHorizontal: 28,
        paddingVertical: 32,
        alignItems: "center",
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.12,
        shadowRadius: 30,
        elevation: 8,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    iconSuccess: {
        backgroundColor: "#DCFCE7",
    },
    iconError: {
        backgroundColor: "#FEE2E2",
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#0F172A",
        marginBottom: 8,
        textAlign: "center",
        letterSpacing: -0.3,
    },
    message: {
        fontSize: 14,
        lineHeight: 21,
        color: "#64748B",
        textAlign: "center",
        marginBottom: 24,
    },
    button: {
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
        paddingVertical: 14,
    },
    buttonSuccess: {
        backgroundColor: "#16A34A",
    },
    buttonError: {
        backgroundColor: "#DC2626",
    },
    buttonPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
    buttonLabel: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
});
