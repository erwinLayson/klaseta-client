import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { dashboardPagesStyle } from "../styles/index";
import { RootParamList } from "../types/RootParamList";
import { BottomNavBar, type NavTab } from "../components/index";

export function DashboardPages() {
    const route = useRoute<RouteProp<RootParamList, "dashboard">>();
    const { username } = route.params;
    const [activeTab, setActiveTab] = useState<NavTab>("dashboard");

    const handleTabPress = (tab: NavTab) => {
        setActiveTab(tab);
    };

    return (
        <View style={dashboardPagesStyle.container}>
            <View style={dashboardPagesStyle.backgroundAccent} pointerEvents="none" />
            <View style={dashboardPagesStyle.backgroundAccentBottom} pointerEvents="none" />

            <ScrollView
                contentContainerStyle={dashboardPagesStyle.scrollView}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === "dashboard" && (
                    <>
                        <View style={dashboardPagesStyle.header}>
                            <Text style={dashboardPagesStyle.greeting}>Welcome back, {username} 👋</Text>
                            <Text style={dashboardPagesStyle.subtitle}>Here's your overview</Text>
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
                                    onPress={() => setActiveTab("gradebook")}
                                >
                                    <Text style={dashboardPagesStyle.actionIcon}>📚</Text>
                                    <Text style={dashboardPagesStyle.actionLabel}>Gradebook</Text>
                                </Pressable>
                                <Pressable
                                    style={dashboardPagesStyle.actionButton}
                                    onPress={() => setActiveTab("attendance")}
                                >
                                    <Text style={dashboardPagesStyle.actionIcon}>📋</Text>
                                    <Text style={dashboardPagesStyle.actionLabel}>Attendance</Text>
                                </Pressable>
                                <Pressable
                                    style={dashboardPagesStyle.actionButton}
                                    onPress={() => setActiveTab("settings")}
                                >
                                    <Text style={dashboardPagesStyle.actionIcon}>⚙️</Text>
                                    <Text style={dashboardPagesStyle.actionLabel}>Settings</Text>
                                </Pressable>
                            </View>
                        </View>
                    </>
                )}

                {activeTab === "attendance" && (
                    <View style={dashboardPagesStyle.section}>
                        <View style={dashboardPagesStyle.header}>
                            <Text style={dashboardPagesStyle.greeting}>Attendance 📋</Text>
                            <Text style={dashboardPagesStyle.subtitle}>Track student attendance records</Text>
                        </View>
                        <View style={dashboardPagesStyle.emptyCard}>
                            <Text style={dashboardPagesStyle.emptyText}>No attendance records</Text>
                            <Text style={dashboardPagesStyle.emptySubtext}>
                                Attendance logs will appear here once classes begin.
                            </Text>
                        </View>
                    </View>
                )}

                {activeTab === "gradebook" && (
                    <View style={dashboardPagesStyle.section}>
                        <View style={dashboardPagesStyle.header}>
                            <Text style={dashboardPagesStyle.greeting}>Gradebook 📖</Text>
                            <Text style={dashboardPagesStyle.subtitle}>Manage student grades and assessments</Text>
                        </View>
                        <View style={dashboardPagesStyle.emptyCard}>
                            <Text style={dashboardPagesStyle.emptyText}>No grades recorded</Text>
                            <Text style={dashboardPagesStyle.emptySubtext}>
                                Grade entries and grading criteria will appear here.
                            </Text>
                        </View>
                    </View>
                )}

                {activeTab === "settings" && (
                    <View style={dashboardPagesStyle.section}>
                        <View style={dashboardPagesStyle.header}>
                            <Text style={dashboardPagesStyle.greeting}>Settings ⚙️</Text>
                            <Text style={dashboardPagesStyle.subtitle}>Account and application preferences</Text>
                        </View>
                        <View style={dashboardPagesStyle.emptyCard}>
                            <Text style={dashboardPagesStyle.emptyText}>User Preferences</Text>
                            <Text style={dashboardPagesStyle.emptySubtext}>
                                Signed in as {username}. Configuration options will appear here.
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>

            <BottomNavBar activeTab={activeTab} onTabPress={handleTabPress} />
        </View>
    );
}
