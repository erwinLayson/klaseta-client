import { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Modal,
    ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { settingsPagesStyle } from "../styles/index";
import { RootParamList } from "../types/RootParamList";
import {
    BottomNavBar,
    DialogMessage,
    type NavTab,
} from "../components/index";
import type { DialogType } from "../components/ui/DialogMessage";
import {
    getUserProfile,
    deleteUserAccount,
    type UserProfileInfo,
} from "../services/pages/SettingsPages";

export function SettingsPages() {
    const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>();
    const route = useRoute<RouteProp<RootParamList, "settings">>();
    const { username } = route.params;

    const [profile, setProfile] = useState<UserProfileInfo | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    // Delete Account Modal State
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Dialog State
    const [dialog, setDialog] = useState<{
        visible: boolean;
        type: DialogType;
        title: string;
        message: string;
        onDismiss?: () => void;
    }>({
        visible: false,
        type: "success",
        title: "",
        message: "",
    });

    useEffect(() => {
        let isMounted = true;
        const loadProfile = async () => {
            setIsLoadingProfile(true);
            try {
                const info = await getUserProfile(username);
                if (isMounted) {
                    setProfile(info);
                }
            } finally {
                if (isMounted) {
                    setIsLoadingProfile(false);
                }
            }
        };

        loadProfile();

        return () => {
            isMounted = false;
        };
    }, [username]);

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

    const handleConfirmDelete = async () => {
        if (isDeleting) return;

        setIsDeleting(true);
        try {
            const result = await deleteUserAccount(username);
            setIsConfirmModalOpen(false);

            if (result.success) {
                setDialog({
                    visible: true,
                    type: "success",
                    title: "Account Deleted",
                    message: result.message,
                    onDismiss: () => {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: "login" }],
                        });
                    },
                });
            } else {
                setDialog({
                    visible: true,
                    type: "error",
                    title: "Deletion Failed",
                    message: result.message,
                });
            }
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <View style={settingsPagesStyle.container}>
            <View style={settingsPagesStyle.backgroundAccent} pointerEvents="none" />
            <View style={settingsPagesStyle.backgroundAccentBottom} pointerEvents="none" />

            <ScrollView
                contentContainerStyle={settingsPagesStyle.scrollView}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={settingsPagesStyle.header}>
                    <View style={settingsPagesStyle.headerTitleRow}>
                        <Ionicons name="settings-outline" size={26} color="#4F46E5" />
                        <Text style={settingsPagesStyle.greeting}>Settings</Text>
                    </View>
                    <Text style={settingsPagesStyle.subtitle}>
                        Account and application preferences
                    </Text>
                </View>

                {/* Account Profile Card */}
                <View style={settingsPagesStyle.section}>
                    <Text style={settingsPagesStyle.sectionTitle}>Account Profile</Text>
                    <View style={settingsPagesStyle.profileCard}>
                        <View style={settingsPagesStyle.avatarBox}>
                            <Ionicons name="person" size={36} color="#4F46E5" />
                        </View>
                        <Text style={settingsPagesStyle.profileUsername}>{username}</Text>
                        {profile?.email ? (
                            <Text style={settingsPagesStyle.profileEmail}>{profile.email}</Text>
                        ) : null}

                        <View style={settingsPagesStyle.roleBadge}>
                            <Text style={settingsPagesStyle.roleBadgeText}>Teacher Account</Text>
                        </View>

                        {isLoadingProfile ? (
                            <ActivityIndicator
                                size="small"
                                color="#4F46E5"
                                style={{ marginTop: 16 }}
                            />
                        ) : (
                            <View style={settingsPagesStyle.statsRow}>
                                <View style={settingsPagesStyle.statItem}>
                                    <Text style={settingsPagesStyle.statValue}>
                                        {profile?.classCount ?? 0}
                                    </Text>
                                    <Text style={settingsPagesStyle.statLabel}>Classes</Text>
                                </View>
                                <View style={settingsPagesStyle.statItem}>
                                    <Text style={settingsPagesStyle.statValue}>
                                        {profile?.studentCount ?? 0}
                                    </Text>
                                    <Text style={settingsPagesStyle.statLabel}>Students</Text>
                                </View>
                                <View style={settingsPagesStyle.statItem}>
                                    <Text style={settingsPagesStyle.statValue}>
                                        {profile?.sessionCount ?? 0}
                                    </Text>
                                    <Text style={settingsPagesStyle.statLabel}>Sessions</Text>
                                </View>
                                <View style={settingsPagesStyle.statItem}>
                                    <Text style={settingsPagesStyle.statValue}>
                                        {profile?.assessmentCount ?? 0}
                                    </Text>
                                    <Text style={settingsPagesStyle.statLabel}>Assessments</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* General Preferences */}
                <View style={settingsPagesStyle.section}>
                    <Text style={settingsPagesStyle.sectionTitle}>Preferences</Text>
                    <View style={settingsPagesStyle.preferencesCard}>
                        <Pressable
                            style={({ pressed }) => [
                                settingsPagesStyle.actionRowButton,
                                pressed && settingsPagesStyle.actionRowButtonPressed,
                            ]}
                            onPress={handleLogout}
                        >
                            <View style={settingsPagesStyle.actionRowLeft}>
                                <View
                                    style={[
                                        settingsPagesStyle.actionIconBox,
                                        { backgroundColor: "#EEF2FF" },
                                    ]}
                                >
                                    <Ionicons name="log-out-outline" size={20} color="#4F46E5" />
                                </View>
                                <View>
                                    <Text style={settingsPagesStyle.actionRowTitle}>Sign Out</Text>
                                    <Text style={settingsPagesStyle.actionRowSubtitle}>
                                        Log out of your current session
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                        </Pressable>
                    </View>
                </View>

                {/* Danger Zone */}
                <View style={settingsPagesStyle.section}>
                    <View style={settingsPagesStyle.dangerSectionTitleRow}>
                        <Ionicons name="warning-outline" size={20} color="#DC2626" />
                        <Text style={settingsPagesStyle.dangerSectionTitle}>Danger Zone</Text>
                    </View>

                    <View style={settingsPagesStyle.dangerCard}>
                        <View style={settingsPagesStyle.dangerNoticeRow}>
                            <Ionicons name="alert-circle" size={20} color="#DC2626" />
                            <Text style={settingsPagesStyle.dangerNoticeText}>
                                Removing your account will permanently wipe all your data, including
                                classes, enrolled students, daily attendance records, and gradebook scores.
                                This action cannot be reversed.
                            </Text>
                        </View>

                        <Pressable
                            style={({ pressed }) => [
                                settingsPagesStyle.deleteAccountButton,
                                pressed && settingsPagesStyle.deleteAccountButtonPressed,
                            ]}
                            onPress={() => setIsConfirmModalOpen(true)}
                        >
                            <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                            <Text style={settingsPagesStyle.deleteAccountButtonText}>
                                Remove / Delete Account
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>

            {/* Delete Account Confirmation Modal */}
            <Modal
                visible={isConfirmModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!isDeleting) setIsConfirmModalOpen(false);
                }}
            >
                <View style={settingsPagesStyle.modalOverlay}>
                    <View style={settingsPagesStyle.modalContent}>
                        <View style={settingsPagesStyle.modalHeader}>
                            <View style={settingsPagesStyle.warningIconCircle}>
                                <Ionicons name="warning" size={32} color="#DC2626" />
                            </View>
                            <Text style={settingsPagesStyle.modalTitle}>Delete Account?</Text>
                        </View>

                        <Text style={settingsPagesStyle.modalWarningText}>
                            Are you sure you want to permanently delete account{" "}
                            <Text style={{ fontWeight: "700", color: "#0F172A" }}>@{username}</Text>?
                        </Text>

                        <View style={settingsPagesStyle.modalDataSummaryBox}>
                            <Text style={settingsPagesStyle.modalDataSummaryTitle}>
                                All associated data will be removed:
                            </Text>
                            <View style={settingsPagesStyle.modalDataSummaryItem}>
                                <Ionicons name="close-circle" size={14} color="#DC2626" />
                                <Text style={settingsPagesStyle.modalDataSummaryItemText}>
                                    {profile?.classCount ?? 0} Classes & rosters
                                </Text>
                            </View>
                            <View style={settingsPagesStyle.modalDataSummaryItem}>
                                <Ionicons name="close-circle" size={14} color="#DC2626" />
                                <Text style={settingsPagesStyle.modalDataSummaryItemText}>
                                    {profile?.studentCount ?? 0} Students & records
                                </Text>
                            </View>
                            <View style={settingsPagesStyle.modalDataSummaryItem}>
                                <Ionicons name="close-circle" size={14} color="#DC2626" />
                                <Text style={settingsPagesStyle.modalDataSummaryItemText}>
                                    {profile?.sessionCount ?? 0} Attendance sessions & history
                                </Text>
                            </View>
                            <View style={settingsPagesStyle.modalDataSummaryItem}>
                                <Ionicons name="close-circle" size={14} color="#DC2626" />
                                <Text style={settingsPagesStyle.modalDataSummaryItemText}>
                                    {profile?.assessmentCount ?? 0} Assessments, weights & grades
                                </Text>
                            </View>
                        </View>

                        <View style={settingsPagesStyle.modalActionsRow}>
                            <Pressable
                                disabled={isDeleting}
                                style={({ pressed }) => [
                                    settingsPagesStyle.cancelButton,
                                    pressed && settingsPagesStyle.cancelButtonPressed,
                                ]}
                                onPress={() => setIsConfirmModalOpen(false)}
                            >
                                <Text style={settingsPagesStyle.cancelButtonText}>Cancel</Text>
                            </Pressable>

                            <Pressable
                                disabled={isDeleting}
                                style={({ pressed }) => [
                                    settingsPagesStyle.confirmDeleteButton,
                                    pressed && settingsPagesStyle.confirmDeleteButtonPressed,
                                ]}
                                onPress={handleConfirmDelete}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={settingsPagesStyle.confirmDeleteButtonText}>
                                        Yes, Delete All
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Notification Dialog */}
            <DialogMessage
                visible={dialog.visible}
                type={dialog.type}
                title={dialog.title}
                message={dialog.message}
                onClose={() => {
                    const cb = dialog.onDismiss;
                    setDialog((prev) => ({ ...prev, visible: false }));
                    if (cb) {
                        cb();
                    }
                }}
            />

            <BottomNavBar activeTab="settings" onTabPress={handleTabPress} />
        </View>
    );
}
