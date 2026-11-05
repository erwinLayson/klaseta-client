import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    wrapper: {
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 8,
    },
    scrollContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        minWidth: "100%",
        paddingTop: 8,
        paddingHorizontal: 6,
    },
    tabItem: {
        minWidth: 66,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 4,
        paddingHorizontal: 6,
    },
    tabItemPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.95 }],
    },
    iconContainer: {
        width: 44,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 2,
    },
    iconContainerActive: {
        backgroundColor: "#EEF2FF",
    },
    label: {
        fontSize: 11,
        letterSpacing: 0.1,
    },
    labelActive: {
        fontWeight: "700",
        color: "#4F46E5",
    },
    labelInactive: {
        fontWeight: "500",
        color: "#64748B",
    },
});
