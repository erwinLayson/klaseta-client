import { View, Text, ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { dashboardPagesStyle } from "../styles/index";
import { RootParamList } from "../types/RootParamList";
import { BottomNavBar, type NavTab } from "../components/index";

export function AttendancePages() {
    const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>();
    const route = useRoute<RouteProp<RootParamList, "attendance">>();
    const { username } = route.params;

    const handleTabPress = (tab: NavTab) => {
        if (tab !== "attendance") {
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
                    <View style={dashboardPagesStyle.headerTitleRow}>
                        <Ionicons name="clipboard-outline" size={26} color="#4F46E5" />
                        <Text style={dashboardPagesStyle.greeting}>Attendance</Text>
                    </View>
                    <Text style={dashboardPagesStyle.subtitle}>Track student attendance records</Text>
                </View>

                <View style={dashboardPagesStyle.statsRow}>
                    <View style={dashboardPagesStyle.statCard}>
                        <Text style={dashboardPagesStyle.statValue}>0</Text>
                        <Text style={dashboardPagesStyle.statLabel}>Present</Text>
                    </View>
                    <View style={dashboardPagesStyle.statCard}>
                        <Text style={dashboardPagesStyle.statValue}>0</Text>
                        <Text style={dashboardPagesStyle.statLabel}>Late</Text>
                    </View>
                    <View style={dashboardPagesStyle.statCard}>
                        <Text style={dashboardPagesStyle.statValue}>0</Text>
                        <Text style={dashboardPagesStyle.statLabel}>Absent</Text>
                    </View>
                </View>

                <View style={dashboardPagesStyle.section}>
                    <Text style={dashboardPagesStyle.sectionTitle}>Daily Attendance Log</Text>
                    <View style={dashboardPagesStyle.emptyCard}>
                        <Ionicons
                            name="calendar-outline"
                            size={40}
                            color="#94A3B8"
                            style={dashboardPagesStyle.emptyIcon}
                        />
                        <Text style={dashboardPagesStyle.emptyText}>No attendance records</Text>
                        <Text style={dashboardPagesStyle.emptySubtext}>
                            Attendance logs will appear here once classes begin.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <BottomNavBar activeTab="attendance" onTabPress={handleTabPress} />
        </View>
    );
}

