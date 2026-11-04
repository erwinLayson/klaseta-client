import { StyleSheet, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export type NavTab = "dashboard" | "attendance" | "gradebook" | "settings";

interface NavItemConfig {
    key: NavTab;
    label: string;
    activeIcon: keyof typeof Ionicons.glyphMap;
    inactiveIcon: keyof typeof Ionicons.glyphMap;
}

const NAV_ITEMS: NavItemConfig[] = [
    {
        key: "dashboard",
        label: "Dashboard",
        activeIcon: "grid",
        inactiveIcon: "grid-outline",
    },
    {
        key: "attendance",
        label: "Attendance",
        activeIcon: "clipboard",
        inactiveIcon: "clipboard-outline",
    },
    {
        key: "gradebook",
        label: "Gradebook",
        activeIcon: "book",
        inactiveIcon: "book-outline",
    },
    {
        key: "settings",
        label: "Settings",
        activeIcon: "settings",
        inactiveIcon: "settings-outline",
    },
];

interface BottomNavBarProps {
    activeTab: NavTab;
    onTabPress?: (tab: NavTab) => void;
}

export function BottomNavBar({ activeTab, onTabPress }: BottomNavBarProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.container}>
                {NAV_ITEMS.map((item) => {
                    const isActive = activeTab === item.key;
                    const iconName = isActive ? item.activeIcon : item.inactiveIcon;
                    const iconColor = isActive ? "#4F46E5" : "#64748B";

                    return (
                        <Pressable
                            key={item.key}
                            onPress={() => onTabPress?.(item.key)}
                            style={({ pressed }) => [
                                styles.tabItem,
                                pressed && styles.tabItemPressed,
                            ]}
                        >
                            <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
                                <Ionicons name={iconName} size={20} color={iconColor} />
                            </View>
                            <Text
                                style={[
                                    styles.label,
                                    isActive ? styles.labelActive : styles.labelInactive,
                                ]}
                                numberOfLines={1}
                            >
                                {item.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
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
    container: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingTop: 8,
        paddingHorizontal: 8,
    },
    tabItem: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 4,
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
