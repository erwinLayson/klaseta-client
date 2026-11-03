import { View, Text, ScrollView, Pressable } from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { dashboardPagesStyle } from "../styles/index";
import { RootParamList } from "../types/RootParamList";

export function DashboardPages() {
    const route = useRoute<RouteProp<RootParamList, "dashboard">>();
    const { username } = route.params;

    return (
        <View style={dashboardPagesStyle.container}>
            <View style={dashboardPagesStyle.backgroundAccent} pointerEvents="none" />
            <View style={dashboardPagesStyle.backgroundAccentBottom} pointerEvents="none" />

            <ScrollView
                contentContainerStyle={dashboardPagesStyle.scrollView}
                showsVerticalScrollIndicator={false}
            >
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
                        <Pressable style={dashboardPagesStyle.actionButton}>
                            <Text style={dashboardPagesStyle.actionIcon}>📚</Text>
                            <Text style={dashboardPagesStyle.actionLabel}>Browse Courses</Text>
                        </Pressable>
                        <Pressable style={dashboardPagesStyle.actionButton}>
                            <Text style={dashboardPagesStyle.actionIcon}>📝</Text>
                            <Text style={dashboardPagesStyle.actionLabel}>My Notes</Text>
                        </Pressable>
                        <Pressable style={dashboardPagesStyle.actionButton}>
                            <Text style={dashboardPagesStyle.actionIcon}>⚙️</Text>
                            <Text style={dashboardPagesStyle.actionLabel}>Settings</Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
