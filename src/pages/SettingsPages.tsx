import { View, Text, ScrollView, Pressable } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { dashboardPagesStyle } from "../styles/index";
import { RootParamList } from "../types/RootParamList";
import { BottomNavBar, type NavTab } from "../components/index";

export function SettingsPages() {
    const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>();
    const route = useRoute<RouteProp<RootParamList, "settings">>();
    const { username } = route.params;

    const handleTabPress = (tab: NavTab) => {
        if (tab !== "settings") {
            navigation.navigate(tab, { username });
        }
    };

    const handleLogout = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: "login" }],
        });
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
                        <Ionicons name="settings-outline" size={26} color="#4F46E5" />
                        <Text style={dashboardPagesStyle.greeting}>Settings</Text>
                    </View>
                    <Text style={dashboardPagesStyle.subtitle}>Account and application preferences</Text>
                </View>

                <View style={dashboardPagesStyle.section}>
                    <Text style={dashboardPagesStyle.sectionTitle}>Account Profile</Text>
                    <View style={dashboardPagesStyle.emptyCard}>
                        <Ionicons
                            name="person-circle-outline"
                            size={56}
                            color="#4F46E5"
                            style={dashboardPagesStyle.emptyIcon}
                        />
                        <Text style={dashboardPagesStyle.emptyText}>{username}</Text>
                        <Text style={dashboardPagesStyle.emptySubtext}>
                            Signed in as teacher account
                        </Text>
                    </View>
                </View>

                <View style={dashboardPagesStyle.section}>
                    <Text style={dashboardPagesStyle.sectionTitle}>Preferences</Text>
                    <View style={dashboardPagesStyle.actionsRow}>
                        <Pressable
                            style={[dashboardPagesStyle.actionButton, { backgroundColor: "#FEE2E2" }]}
                            onPress={handleLogout}
                        >
                            <Ionicons
                                name="log-out-outline"
                                size={26}
                                color="#DC2626"
                                style={dashboardPagesStyle.actionIcon}
                            />
                            <Text style={[dashboardPagesStyle.actionLabel, { color: "#DC2626" }]}>
                                Sign Out
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>

            <BottomNavBar activeTab="settings" onTabPress={handleTabPress} />
        </View>
    );
}

