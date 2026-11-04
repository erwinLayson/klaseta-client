import { View, Text, ScrollView, Pressable } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { dashboardPagesStyle } from "../styles/index";
import { RootParamList } from "../types/RootParamList";
import { BottomNavBar, type NavTab } from "../components/index";

export function DashboardPages() {
    const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>();
    const route = useRoute<RouteProp<RootParamList, "dashboard">>();
    const { username } = route.params;

    const handleTabPress = (tab: NavTab) => {
        if (tab !== "dashboard") {
            navigation.navigate(tab, { username });
        }
    };

    return (
        <View style={dashboardPagesStyle.container}>
            <View style={dashboardPagesStyle.backgroundAccent} pointerEvents="none" />
            <View style={dashboardPagesStyle.backgroundAccentBottom} pointerEvents="none" />

            <ScrollView
                contentContainerStyle={dashboardPagesStyle.scrollView}
                showsVerticalScrollIndicator={false}
            >
                <View style={dashboardPagesStyle.header}>
                    <Text style={dashboardPagesStyle.greeting}>Welcome back, {username}</Text>
                    <Text style={dashboardPagesStyle.subtitle}>Here&apos;s your overview</Text>
                </View>

                <View style={dashboardPagesStyle.statsRow}>
                    <View style={dashboardPagesStyle.statCard}>
                        <Text style={dashboardPagesStyle.statValue}>0</Text>
                        <Text style={dashboardPagesStyle.statLabel}>Courses</Text>
                    </View>
                    <View style={dashboardPagesStyle.statCard}>
                        <Text style={dashboardPagesStyle.statValue}>0</Text>
                        <Text style={dashboardPagesStyle.statLabel}>Completed</Text>
                    </View>
                    <View style={dashboardPagesStyle.statCard}>
                        <Text style={dashboardPagesStyle.statValue}>0</Text>
                        <Text style={dashboardPagesStyle.statLabel}>In Progress</Text>
                    </View>
                </View>

                <View style={dashboardPagesStyle.section}>
                    <Text style={dashboardPagesStyle.sectionTitle}>Recent Activity</Text>
                    <View style={dashboardPagesStyle.emptyCard}>
                        <Ionicons
                            name="time-outline"
                            size={36}
                            color="#94A3B8"
                            style={dashboardPagesStyle.emptyIcon}
                        />
                        <Text style={dashboardPagesStyle.emptyText}>No recent activity yet</Text>
                        <Text style={dashboardPagesStyle.emptySubtext}>
                            Start a course to see your progress here
                        </Text>
                    </View>
                </View>

                <View style={dashboardPagesStyle.section}>
                    <Text style={dashboardPagesStyle.sectionTitle}>Quick Actions</Text>
                    <View style={dashboardPagesStyle.actionsRow}>
                        <Pressable
                            style={dashboardPagesStyle.actionButton}
                            onPress={() => navigation.navigate("myclass", { username })}
                        >
                            <Ionicons
                                name="school-outline"
                                size={26}
                                color="#4F46E5"
                                style={dashboardPagesStyle.actionIcon}
                            />
                            <Text style={dashboardPagesStyle.actionLabel}>My Class</Text>
                        </Pressable>
                        <Pressable
                            style={dashboardPagesStyle.actionButton}
                            onPress={() => navigation.navigate("attendance", { username })}
                        >
                            <Ionicons
                                name="clipboard-outline"
                                size={26}
                                color="#4F46E5"
                                style={dashboardPagesStyle.actionIcon}
                            />
                            <Text style={dashboardPagesStyle.actionLabel}>Attendance</Text>
                        </Pressable>
                        <Pressable
                            style={dashboardPagesStyle.actionButton}
                            onPress={() => navigation.navigate("gradebook", { username })}
                        >
                            <Ionicons
                                name="book-outline"
                                size={26}
                                color="#4F46E5"
                                style={dashboardPagesStyle.actionIcon}
                            />
                            <Text style={dashboardPagesStyle.actionLabel}>Gradebook</Text>
                        </Pressable>
                        <Pressable
                            style={dashboardPagesStyle.actionButton}
                            onPress={() => navigation.navigate("settings", { username })}
                        >
                            <Ionicons
                                name="settings-outline"
                                size={26}
                                color="#4F46E5"
                                style={dashboardPagesStyle.actionIcon}
                            />
                            <Text style={dashboardPagesStyle.actionLabel}>Settings</Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>

            <BottomNavBar activeTab="dashboard" onTabPress={handleTabPress} />
        </View>
    );
}
