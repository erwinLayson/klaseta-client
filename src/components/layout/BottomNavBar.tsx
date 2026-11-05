import { Text, View, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { styles } from "../../styles/components/layout/BottomNavBar";

export type NavTab =
    | "dashboard"
    | "myclass"
    | "attendance"
    | "gradebook"
    | "academichistory"
    | "settings";

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
        key: "myclass",
        label: "My Class",
        activeIcon: "school",
        inactiveIcon: "school-outline",
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
        key: "academichistory",
        label: "History",
        activeIcon: "time",
        inactiveIcon: "time-outline",
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
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContainer}
                bounces={false}
            >
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
                            <View
                                style={[
                                    styles.iconContainer,
                                    isActive && styles.iconContainerActive,
                                ]}
                            >
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
            </ScrollView>
        </View>
    );
}
