import { View, Text, ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { dashboardPagesStyle } from "../styles/index";
import { RootParamList } from "../types/RootParamList";
import { BottomNavBar, type NavTab } from "../components/index";

export function GradebookPages() {
    const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>();
    const route = useRoute<RouteProp<RootParamList, "gradebook">>();
    const { username } = route.params;

    const handleTabPress = (tab: NavTab) => {
        if (tab !== "gradebook") {
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
                        <Ionicons name="book-outline" size={26} color="#4F46E5" />
                        <Text style={dashboardPagesStyle.greeting}>Gradebook</Text>
                    </View>
                    <Text style={dashboardPagesStyle.subtitle}>Manage student grades and assessments</Text>
                </View>

                <View style={dashboardPagesStyle.statsRow}>
                    <View style={dashboardPagesStyle.statCard}>
                        <Text style={dashboardPagesStyle.statValue}>0</Text>
                        <Text style={dashboardPagesStyle.statLabel}>Assessments</Text>
                    </View>
                    <View style={dashboardPagesStyle.statCard}>
                        <Text style={dashboardPagesStyle.statValue}>0</Text>
                        <Text style={dashboardPagesStyle.statLabel}>Graded</Text>
                    </View>
                    <View style={dashboardPagesStyle.statCard}>
                        <Text style={dashboardPagesStyle.statValue}>0%</Text>
                        <Text style={dashboardPagesStyle.statLabel}>Avg Score</Text>
                    </View>
                </View>

                <View style={dashboardPagesStyle.section}>
                    <Text style={dashboardPagesStyle.sectionTitle}>Grading Records</Text>
                    <View style={dashboardPagesStyle.emptyCard}>
                        <Ionicons
                            name="school-outline"
                            size={40}
                            color="#94A3B8"
                            style={dashboardPagesStyle.emptyIcon}
                        />
                        <Text style={dashboardPagesStyle.emptyText}>No grades recorded</Text>
                        <Text style={dashboardPagesStyle.emptySubtext}>
                            Grade entries and grading criteria will appear here.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <BottomNavBar activeTab="gradebook" onTabPress={handleTabPress} />
        </View>
    );
}

