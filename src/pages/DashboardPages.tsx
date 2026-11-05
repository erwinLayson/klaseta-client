import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { dashboardPagesStyle } from "../styles/index";
import { RootParamList } from "../types/RootParamList";
import { BottomNavBar, type NavTab } from "../components/index";
import {
    getDashboardData,
    type DashboardData,
    type RecentActivityItem,
} from "../services/pages/DashboardPages";
import type { ClassItem } from "../types/class";

export function DashboardPages() {
    const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>();
    const route = useRoute<RouteProp<RootParamList, "dashboard">>();
    const { username } = route.params;

    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const result = await getDashboardData(username);
            setData(result);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [username]);

    // Refresh data whenever screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadData();
    };

    const handleTabPress = (tab: NavTab) => {
        if (tab !== "dashboard") {
            navigation.navigate(tab, { username });
        }
    };

    const handleNavigateClass = (cId?: number) => {
        navigation.navigate("myclass", { username, classId: cId });
    };

    const handleNavigateActivity = (activity: RecentActivityItem) => {
        if (activity.type === "attendance") {
            navigation.navigate("attendance", {
                username,
                classId: activity.classId,
            });
        } else if (activity.type === "assessment") {
            navigation.navigate("gradebook", {
                username,
                classId: activity.classId,
            });
        } else if (activity.type === "class") {
            navigation.navigate("myclass", {
                username,
                classId: activity.classId,
            });
        }
    };

    return (
        <View style={dashboardPagesStyle.container}>
            <View style={dashboardPagesStyle.backgroundAccent} pointerEvents="none" />
            <View style={dashboardPagesStyle.backgroundAccentBottom} pointerEvents="none" />

            {isLoading && !data ? (
                <View style={dashboardPagesStyle.loadingContainer}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={dashboardPagesStyle.loadingText}>Loading dashboard...</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={dashboardPagesStyle.scrollView}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            colors={["#4F46E5"]}
                            tintColor="#4F46E5"
                        />
                    }
                >
                    {/* Header with Greeting & Academic Setting Pill */}
                    <View style={dashboardPagesStyle.header}>
                        <View style={dashboardPagesStyle.headerTopRow}>
                            <View>
                                <Text style={dashboardPagesStyle.greetingPre}>Overview</Text>
                                <Text style={dashboardPagesStyle.greeting}>
                                    Welcome back, {data?.teacher.username || username}!
                                </Text>
                                <Text style={dashboardPagesStyle.dateSubtitle}>
                                    {data?.formattedToday || "Today"}
                                </Text>
                            </View>
                        </View>

                        {data?.academicSettings && (
                            <Pressable
                                style={dashboardPagesStyle.academicPill}
                                onPress={() => navigation.navigate("settings", { username })}
                            >
                                <Ionicons name="school" size={14} color="#4F46E5" />
                                <Text style={dashboardPagesStyle.academicPillText}>
                                    A.Y. {data.academicSettings.academicYear} •{" "}
                                    {data.academicSettings.activeQuarter} •{" "}
                                    {data.academicSettings.semester}
                                </Text>
                                <Ionicons name="chevron-forward" size={12} color="#4F46E5" />
                            </Pressable>
                        )}
                    </View>

                    {/* Stats 2x2 Grid */}
                    <View style={dashboardPagesStyle.statsGrid}>
                        {/* Row 1: Classes & Students */}
                        <View style={dashboardPagesStyle.statsRow}>
                            <Pressable
                                style={dashboardPagesStyle.statCard}
                                onPress={() => navigation.navigate("myclass", { username })}
                            >
                                <View style={dashboardPagesStyle.statCardTop}>
                                    <View
                                        style={[
                                            dashboardPagesStyle.statIconBox,
                                            { backgroundColor: "#EEF2FF" },
                                        ]}
                                    >
                                        <Ionicons name="school-outline" size={20} color="#4F46E5" />
                                    </View>
                                    <Ionicons name="arrow-forward" size={14} color="#CBD5E1" />
                                </View>
                                <Text style={dashboardPagesStyle.statValue}>
                                    {data?.stats.totalClasses ?? 0}
                                </Text>
                                <Text style={dashboardPagesStyle.statLabel}>Total Classes</Text>
                            </Pressable>

                            <Pressable
                                style={dashboardPagesStyle.statCard}
                                onPress={() => navigation.navigate("myclass", { username })}
                            >
                                <View style={dashboardPagesStyle.statCardTop}>
                                    <View
                                        style={[
                                            dashboardPagesStyle.statIconBox,
                                            { backgroundColor: "#EFF6FF" },
                                        ]}
                                    >
                                        <Ionicons name="people-outline" size={20} color="#2563EB" />
                                    </View>
                                    <Ionicons name="arrow-forward" size={14} color="#CBD5E1" />
                                </View>
                                <Text style={dashboardPagesStyle.statValue}>
                                    {data?.stats.totalStudents ?? 0}
                                </Text>
                                <Text style={dashboardPagesStyle.statLabel}>Enrolled Students</Text>
                            </Pressable>
                        </View>

                        {/* Row 2: Attendance Rate & Total Assessments */}
                        <View style={dashboardPagesStyle.statsRow}>
                            <Pressable
                                style={dashboardPagesStyle.statCard}
                                onPress={() => navigation.navigate("attendance", { username })}
                            >
                                <View style={dashboardPagesStyle.statCardTop}>
                                    <View
                                        style={[
                                            dashboardPagesStyle.statIconBox,
                                            { backgroundColor: "#ECFDF5" },
                                        ]}
                                    >
                                        <Ionicons
                                            name="checkmark-circle-outline"
                                            size={20}
                                            color="#059669"
                                        />
                                    </View>
                                    <Ionicons name="arrow-forward" size={14} color="#CBD5E1" />
                                </View>
                                <Text style={dashboardPagesStyle.statValue}>
                                    {data?.stats.attendanceRate !== null &&
                                    data?.stats.attendanceRate !== undefined
                                        ? `${data.stats.attendanceRate}%`
                                        : "—"}
                                </Text>
                                <Text style={dashboardPagesStyle.statLabel}>Attendance Rate</Text>
                            </Pressable>

                            <Pressable
                                style={dashboardPagesStyle.statCard}
                                onPress={() => navigation.navigate("gradebook", { username })}
                            >
                                <View style={dashboardPagesStyle.statCardTop}>
                                    <View
                                        style={[
                                            dashboardPagesStyle.statIconBox,
                                            { backgroundColor: "#F5F3FF" },
                                        ]}
                                    >
                                        <Ionicons
                                            name="document-text-outline"
                                            size={20}
                                            color="#7C3AED"
                                        />
                                    </View>
                                    <Ionicons name="arrow-forward" size={14} color="#CBD5E1" />
                                </View>
                                <Text style={dashboardPagesStyle.statValue}>
                                    {data?.stats.totalAssessments ?? 0}
                                </Text>
                                <Text style={dashboardPagesStyle.statLabel}>Assessments</Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Today's Attendance Status Banner */}
                    <View style={dashboardPagesStyle.todayBanner}>
                        <View style={dashboardPagesStyle.todayBannerContent}>
                            <View
                                style={[
                                    dashboardPagesStyle.todayIconCircle,
                                    {
                                        backgroundColor:
                                            (data?.stats.todaySessionsCount ?? 0) > 0
                                                ? "#ECFDF5"
                                                : "#EEF2FF",
                                    },
                                ]}
                            >
                                <Ionicons
                                    name={
                                        (data?.stats.todaySessionsCount ?? 0) > 0
                                            ? "checkmark-done-circle"
                                            : "calendar-outline"
                                    }
                                    size={24}
                                    color={
                                        (data?.stats.todaySessionsCount ?? 0) > 0
                                            ? "#059669"
                                            : "#4F46E5"
                                    }
                                />
                            </View>
                            <View style={dashboardPagesStyle.todayTextContainer}>
                                <Text style={dashboardPagesStyle.todayBannerTitle}>
                                    {(data?.stats.todaySessionsCount ?? 0) > 0
                                        ? "Today's Attendance Recorded"
                                        : "Daily Attendance"}
                                </Text>
                                <Text style={dashboardPagesStyle.todayBannerSubtitle}>
                                    {(data?.stats.todaySessionsCount ?? 0) > 0
                                        ? `${data?.stats.todaySessionsCount} session(s) recorded for today.`
                                        : "No attendance recorded yet for today."}
                                </Text>
                            </View>
                        </View>
                        <Pressable
                            style={dashboardPagesStyle.todayActionButton}
                            onPress={() => navigation.navigate("attendance", { username })}
                        >
                            <Text style={dashboardPagesStyle.todayActionButtonText}>
                                {(data?.stats.todaySessionsCount ?? 0) > 0
                                    ? "View Sessions"
                                    : "Take Attendance Now"}
                            </Text>
                            <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
                        </Pressable>
                    </View>

                    {/* My Classes Section */}
                    <View style={dashboardPagesStyle.section}>
                        <View style={dashboardPagesStyle.sectionHeaderRow}>
                            <Text style={dashboardPagesStyle.sectionTitle}>
                                My Classes ({data?.classes.length ?? 0})
                            </Text>
                            <Pressable
                                style={dashboardPagesStyle.sectionLink}
                                onPress={() => navigation.navigate("myclass", { username })}
                            >
                                <Text style={dashboardPagesStyle.sectionLinkText}>View All</Text>
                                <Ionicons name="chevron-forward" size={14} color="#4F46E5" />
                            </Pressable>
                        </View>

                        {data && data.classes.length > 0 ? (
                            <View style={dashboardPagesStyle.classesList}>
                                {data.classes.slice(0, 4).map((c: ClassItem) => (
                                    <Pressable
                                        key={c.id}
                                        style={dashboardPagesStyle.classCard}
                                        onPress={() => handleNavigateClass(c.id)}
                                    >
                                        <View style={dashboardPagesStyle.classCardRow}>
                                            <View style={dashboardPagesStyle.classCardLeft}>
                                                <View
                                                    style={[
                                                        dashboardPagesStyle.classColorBar,
                                                        { backgroundColor: c.color || "#4F46E5" },
                                                    ]}
                                                />
                                                <View style={{ flex: 1 }}>
                                                    <Text
                                                        style={dashboardPagesStyle.className}
                                                        numberOfLines={1}
                                                    >
                                                        {c.name}
                                                    </Text>
                                                    <View style={dashboardPagesStyle.classMetaRow}>
                                                        {c.section ? (
                                                            <Text
                                                                style={
                                                                    dashboardPagesStyle.classMetaText
                                                                }
                                                            >
                                                                Sec: {c.section}
                                                            </Text>
                                                        ) : null}
                                                        {c.subject ? (
                                                            <Text
                                                                style={
                                                                    dashboardPagesStyle.classMetaText
                                                                }
                                                            >
                                                                • {c.subject}
                                                            </Text>
                                                        ) : null}
                                                    </View>
                                                </View>
                                            </View>

                                            <View style={dashboardPagesStyle.classStudentBadge}>
                                                <Ionicons
                                                    name="people-outline"
                                                    size={12}
                                                    color="#475569"
                                                />
                                                <Text
                                                    style={
                                                        dashboardPagesStyle.classStudentBadgeText
                                                    }
                                                >
                                                    {c.studentCount ?? 0}
                                                </Text>
                                            </View>
                                        </View>
                                    </Pressable>
                                ))}
                            </View>
                        ) : (
                            <View style={dashboardPagesStyle.emptyCard}>
                                <Ionicons
                                    name="school-outline"
                                    size={36}
                                    color="#94A3B8"
                                    style={dashboardPagesStyle.emptyIcon}
                                />
                                <Text style={dashboardPagesStyle.emptyText}>
                                    No classes created yet
                                </Text>
                                <Text style={dashboardPagesStyle.emptySubtext}>
                                    Create your first class roster to start recording attendance and
                                    grades.
                                </Text>
                                <Pressable
                                    style={dashboardPagesStyle.emptyActionButton}
                                    onPress={() => navigation.navigate("myclass", { username })}
                                >
                                    <Text style={dashboardPagesStyle.emptyActionButtonText}>
                                        + Create Class
                                    </Text>
                                </Pressable>
                            </View>
                        )}
                    </View>

                    {/* Recent Activity Section */}
                    <View style={dashboardPagesStyle.section}>
                        <View style={dashboardPagesStyle.sectionHeaderRow}>
                            <Text style={dashboardPagesStyle.sectionTitle}>Recent Activity</Text>
                        </View>

                        {data && data.recentActivities.length > 0 ? (
                            <View style={dashboardPagesStyle.activityList}>
                                {data.recentActivities.map((act) => (
                                    <Pressable
                                        key={act.id}
                                        style={dashboardPagesStyle.activityItem}
                                        onPress={() => handleNavigateActivity(act)}
                                    >
                                        <View style={dashboardPagesStyle.activityItemLeft}>
                                            <View
                                                style={[
                                                    dashboardPagesStyle.activityIconBox,
                                                    {
                                                        backgroundColor:
                                                            act.type === "attendance"
                                                                ? "#ECFDF5"
                                                                : act.type === "assessment"
                                                                  ? "#EEF2FF"
                                                                  : "#EFF6FF",
                                                    },
                                                ]}
                                            >
                                                <Ionicons
                                                    name={
                                                        act.type === "attendance"
                                                            ? "checkmark-circle"
                                                            : act.type === "assessment"
                                                              ? "document-text"
                                                              : "school"
                                                    }
                                                    size={18}
                                                    color={act.badgeColor}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={dashboardPagesStyle.activityTitle}
                                                    numberOfLines={1}
                                                >
                                                    {act.title}
                                                </Text>
                                                <Text
                                                    style={dashboardPagesStyle.activitySubtitle}
                                                    numberOfLines={1}
                                                >
                                                    {act.subtitle}
                                                </Text>
                                            </View>
                                        </View>

                                        <View
                                            style={[
                                                dashboardPagesStyle.activityBadge,
                                                {
                                                    backgroundColor:
                                                        act.type === "attendance"
                                                            ? "#ECFDF5"
                                                            : act.type === "assessment"
                                                              ? "#EEF2FF"
                                                              : "#F1F5F9",
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    dashboardPagesStyle.activityBadgeText,
                                                    { color: act.badgeColor },
                                                ]}
                                            >
                                                {act.badgeText}
                                            </Text>
                                        </View>
                                    </Pressable>
                                ))}
                            </View>
                        ) : (
                            <View style={dashboardPagesStyle.emptyCard}>
                                <Ionicons
                                    name="time-outline"
                                    size={36}
                                    color="#94A3B8"
                                    style={dashboardPagesStyle.emptyIcon}
                                />
                                <Text style={dashboardPagesStyle.emptyText}>
                                    No recent activity yet
                                </Text>
                                <Text style={dashboardPagesStyle.emptySubtext}>
                                    When you record attendance, add assessments, or create classes,
                                    your updates will appear here.
                                </Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            )}

            <BottomNavBar activeTab="dashboard" onTabPress={handleTabPress} />
        </View>
    );
}
