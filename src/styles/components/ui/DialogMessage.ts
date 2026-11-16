import { StyleSheet, Platform } from "react-native";

export const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
    },
    overlayWrapper: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
    },
    backdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
    },
    container: {
        width: "100%",
        maxWidth: 340,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        paddingHorizontal: 28,
        paddingTop: 30,
        paddingBottom: 28,
        alignItems: "center",
        ...Platform.select({
            ios: {
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.08,
                shadowRadius: 20,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: "#F1F5F9",
            },
            android: {
                elevation: 0,
                borderWidth: 1,
                borderColor: "#E2E8F0",
            },
            default: {
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.08,
                shadowRadius: 20,
                borderWidth: 1,
                borderColor: "#E2E8F0",
            },
        }),
    },
    iconCircle: {
        width: 58,
        height: 58,
        borderRadius: 29,
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
    },
    messageWithButton: {
        marginBottom: 22,
    },
    messageWithoutButton: {
        marginBottom: 6,
    },
    button: {
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
        paddingVertical: 14,
        marginTop: 6,
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

