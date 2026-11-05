import { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Modal,
    ActivityIndicator,
    TextInput,
    KeyboardAvoidingView,
    Platform,
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
    updateUserProfile,
    updateUserPassword,
    deleteUserAccount,
    type UserProfileInfo,
} from "../services/pages/SettingsPages";

export function SettingsPages() {
    const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>();
    const route = useRoute<RouteProp<RootParamList, "settings">>();
    const { username } = route.params;

    const [currentUsername, setCurrentUsername] = useState(username);
    const [profile, setProfile] = useState<UserProfileInfo | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    // Personal Information Form State
    const [editUsername, setEditUsername] = useState(username);
    const [editEmail, setEditEmail] = useState("");
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Credentials / Password Form State
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    // Input focus state
    const [focusedInput, setFocusedInput] = useState<string | null>(null);

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
                const info = await getUserProfile(currentUsername);
                if (isMounted && info) {
                    setProfile(info);
                    setEditUsername(info.username);
                    setEditEmail(info.email);
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
    }, [currentUsername]);

    const handleTabPress = (tab: NavTab) => {
        if (tab !== "settings") {
            navigation.navigate(tab, { username: currentUsername });
        }
    };

    const handleLogout = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: "login" }],
        });
    };

    const handleSaveProfile = async () => {
        if (isSavingProfile) return;

        const trimmedUsername = editUsername.trim();
        const trimmedEmail = editEmail.trim();

        if (!trimmedUsername) {
            setDialog({
                visible: true,
                type: "error",
                title: "Validation Error",
                message: "Username cannot be empty.",
            });
            return;
        }

        if (!trimmedEmail) {
            setDialog({
                visible: true,
                type: "error",
                title: "Validation Error",
                message: "Email address cannot be empty.",
            });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            setDialog({
                visible: true,
                type: "error",
                title: "Invalid Email",
                message: "Please enter a valid email address.",
            });
            return;
        }

        setIsSavingProfile(true);
        try {
            const result = await updateUserProfile(currentUsername, {
                username: trimmedUsername,
                email: trimmedEmail,
            });

            if (result.success) {
                if (result.newUsername) {
                    const updatedUsername = result.newUsername;
                    const updatedEmail = result.newEmail || trimmedEmail;
                    setCurrentUsername(updatedUsername);
                    setEditUsername(updatedUsername);
                    setEditEmail(updatedEmail);
                    setProfile((prev) =>
                        prev ? { ...prev, username: updatedUsername, email: updatedEmail } : null
                    );
                    navigation.setParams({ username: updatedUsername });
                }
                setDialog({
                    visible: true,
                    type: "success",
                    title: "Profile Updated",
                    message: result.message,
                });
            } else {
                setDialog({
                    visible: true,
                    type: "error",
                    title: "Update Failed",
                    message: result.message,
                });
            }
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (isUpdatingPassword) return;

        if (!currentPassword.trim()) {
            setDialog({
                visible: true,
                type: "error",
                title: "Missing Field",
                message: "Please enter your current password.",
            });
            return;
        }

        if (!newPassword || newPassword.length < 6) {
            setDialog({
                visible: true,
                type: "error",
                title: "Weak Password",
                message: "New password must be at least 6 characters long.",
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            setDialog({
                visible: true,
                type: "error",
                title: "Passwords Do Not Match",
                message: "New password and confirmation do not match.",
            });
            return;
        }

        if (newPassword === currentPassword) {
            setDialog({
                visible: true,
                type: "error",
                title: "Identical Password",
                message: "New password must be different from your current password.",
            });
            return;
        }

        setIsUpdatingPassword(true);
        try {
            const result = await updateUserPassword(currentUsername, {
                currentPassword,
                newPassword,
                confirmPassword,
            });

            if (result.success) {
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setDialog({
                    visible: true,
                    type: "success",
                    title: "Password Updated",
                    message: result.message,
                });
            } else {
                setDialog({
                    visible: true,
                    type: "error",
                    title: "Update Failed",
                    message: result.message,
                });
            }
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (isDeleting) return;

        setIsDeleting(true);
        try {
            const result = await deleteUserAccount(currentUsername);
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

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    contentContainerStyle={settingsPagesStyle.scrollView}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={settingsPagesStyle.header}>
                        <View style={settingsPagesStyle.headerTitleRow}>
                            <Ionicons name="settings-outline" size={26} color="#4F46E5" />
                            <Text style={settingsPagesStyle.greeting}>Settings</Text>
                        </View>
                        <Text style={settingsPagesStyle.subtitle}>
                            Account, personal details, and credentials
                        </Text>
                    </View>

                    {/* Account Profile Card */}
                    <View style={settingsPagesStyle.section}>
                        <Text style={settingsPagesStyle.sectionTitle}>Account Profile</Text>
                        <View style={settingsPagesStyle.profileCard}>
                            <View style={settingsPagesStyle.avatarBox}>
                                <Ionicons name="person" size={36} color="#4F46E5" />
                            </View>
                            <Text style={settingsPagesStyle.profileUsername}>{currentUsername}</Text>
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

                    {/* Personal Information Section */}
                    <View style={settingsPagesStyle.section}>
                        <View style={settingsPagesStyle.sectionHeaderRow}>
                            <Ionicons name="person-circle-outline" size={22} color="#4F46E5" />
                            <Text style={[settingsPagesStyle.sectionTitle, { marginBottom: 0 }]}>
                                Personal Information
                            </Text>
                        </View>

                        <View style={settingsPagesStyle.formCard}>
                            <Text style={settingsPagesStyle.cardDescription}>
                                Update your account name and email address for system identification and communications.
                            </Text>

                            {/* Username Field */}
                            <View style={settingsPagesStyle.formGroup}>
                                <Text style={settingsPagesStyle.formLabel}>Username</Text>
                                <View
                                    style={[
                                        settingsPagesStyle.inputContainer,
                                        focusedInput === "username" && settingsPagesStyle.inputContainerFocused,
                                    ]}
                                >
                                    <Ionicons
                                        name="person-outline"
                                        size={18}
                                        color={focusedInput === "username" ? "#4F46E5" : "#94A3B8"}
                                        style={settingsPagesStyle.inputIconLeft}
                                    />
                                    <TextInput
                                        style={settingsPagesStyle.input}
                                        placeholder="Enter username"
                                        placeholderTextColor="#94A3B8"
                                        value={editUsername}
                                        onChangeText={setEditUsername}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        onFocus={() => setFocusedInput("username")}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                </View>
                            </View>

                            {/* Email Field */}
                            <View style={settingsPagesStyle.formGroup}>
                                <Text style={settingsPagesStyle.formLabel}>Email Address</Text>
                                <View
                                    style={[
                                        settingsPagesStyle.inputContainer,
                                        focusedInput === "email" && settingsPagesStyle.inputContainerFocused,
                                    ]}
                                >
                                    <Ionicons
                                        name="mail-outline"
                                        size={18}
                                        color={focusedInput === "email" ? "#4F46E5" : "#94A3B8"}
                                        style={settingsPagesStyle.inputIconLeft}
                                    />
                                    <TextInput
                                        style={settingsPagesStyle.input}
                                        placeholder="Enter email address"
                                        placeholderTextColor="#94A3B8"
                                        value={editEmail}
                                        onChangeText={setEditEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        onFocus={() => setFocusedInput("email")}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                </View>
                            </View>

                            {/* Save Personal Info Button */}
                            <Pressable
                                disabled={isSavingProfile}
                                style={({ pressed }) => [
                                    settingsPagesStyle.saveButton,
                                    pressed && settingsPagesStyle.saveButtonPressed,
                                    isSavingProfile && settingsPagesStyle.saveButtonDisabled,
                                ]}
                                onPress={handleSaveProfile}
                            >
                                {isSavingProfile ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                                        <Text style={settingsPagesStyle.saveButtonText}>
                                            Save Personal Info
                                        </Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                    </View>

                    {/* Account Credentials / Password Section */}
                    <View style={settingsPagesStyle.section}>
                        <View style={settingsPagesStyle.sectionHeaderRow}>
                            <Ionicons name="shield-checkmark-outline" size={22} color="#4F46E5" />
                            <Text style={[settingsPagesStyle.sectionTitle, { marginBottom: 0 }]}>
                                Account Credentials
                            </Text>
                        </View>

                        <View style={settingsPagesStyle.formCard}>
                            <Text style={settingsPagesStyle.cardDescription}>
                                Ensure your account is protected with a secure password containing at least 6 characters.
                            </Text>

                            {/* Current Password Field */}
                            <View style={settingsPagesStyle.formGroup}>
                                <Text style={settingsPagesStyle.formLabel}>Current Password</Text>
                                <View
                                    style={[
                                        settingsPagesStyle.inputContainer,
                                        focusedInput === "currentPassword" && settingsPagesStyle.inputContainerFocused,
                                    ]}
                                >
                                    <Ionicons
                                        name="lock-closed-outline"
                                        size={18}
                                        color={focusedInput === "currentPassword" ? "#4F46E5" : "#94A3B8"}
                                        style={settingsPagesStyle.inputIconLeft}
                                    />
                                    <TextInput
                                        style={settingsPagesStyle.input}
                                        placeholder="Enter current password"
                                        placeholderTextColor="#94A3B8"
                                        value={currentPassword}
                                        onChangeText={setCurrentPassword}
                                        secureTextEntry={!showCurrentPassword}
                                        autoCapitalize="none"
                                        onFocus={() => setFocusedInput("currentPassword")}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                    <Pressable
                                        onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                                        style={settingsPagesStyle.inputEyeButton}
                                        hitSlop={8}
                                    >
                                        <Ionicons
                                            name={showCurrentPassword ? "eye-off-outline" : "eye-outline"}
                                            size={18}
                                            color="#94A3B8"
                                        />
                                    </Pressable>
                                </View>
                            </View>

                            {/* New Password Field */}
                            <View style={settingsPagesStyle.formGroup}>
                                <Text style={settingsPagesStyle.formLabel}>New Password</Text>
                                <View
                                    style={[
                                        settingsPagesStyle.inputContainer,
                                        focusedInput === "newPassword" && settingsPagesStyle.inputContainerFocused,
                                    ]}
                                >
                                    <Ionicons
                                        name="lock-closed-outline"
                                        size={18}
                                        color={focusedInput === "newPassword" ? "#4F46E5" : "#94A3B8"}
                                        style={settingsPagesStyle.inputIconLeft}
                                    />
                                    <TextInput
                                        style={settingsPagesStyle.input}
                                        placeholder="Enter new password (min. 6 chars)"
                                        placeholderTextColor="#94A3B8"
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        secureTextEntry={!showNewPassword}
                                        autoCapitalize="none"
                                        onFocus={() => setFocusedInput("newPassword")}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                    <Pressable
                                        onPress={() => setShowNewPassword(!showNewPassword)}
                                        style={settingsPagesStyle.inputEyeButton}
                                        hitSlop={8}
                                    >
                                        <Ionicons
                                            name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                                            size={18}
                                            color="#94A3B8"
                                        />
                                    </Pressable>
                                </View>
                                <Text style={settingsPagesStyle.formHelpText}>
                                    Must be at least 6 characters long
                                </Text>
                            </View>

                            {/* Confirm New Password Field */}
                            <View style={settingsPagesStyle.formGroup}>
                                <Text style={settingsPagesStyle.formLabel}>Confirm New Password</Text>
                                <View
                                    style={[
                                        settingsPagesStyle.inputContainer,
                                        focusedInput === "confirmPassword" && settingsPagesStyle.inputContainerFocused,
                                    ]}
                                >
                                    <Ionicons
                                        name="lock-closed-outline"
                                        size={18}
                                        color={focusedInput === "confirmPassword" ? "#4F46E5" : "#94A3B8"}
                                        style={settingsPagesStyle.inputIconLeft}
                                    />
                                    <TextInput
                                        style={settingsPagesStyle.input}
                                        placeholder="Re-enter new password"
                                        placeholderTextColor="#94A3B8"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry={!showConfirmPassword}
                                        autoCapitalize="none"
                                        onFocus={() => setFocusedInput("confirmPassword")}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                    <Pressable
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={settingsPagesStyle.inputEyeButton}
                                        hitSlop={8}
                                    >
                                        <Ionicons
                                            name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                                            size={18}
                                            color="#94A3B8"
                                        />
                                    </Pressable>
                                </View>
                            </View>

                            {/* Update Password Button */}
                            <Pressable
                                disabled={isUpdatingPassword}
                                style={({ pressed }) => [
                                    settingsPagesStyle.saveButton,
                                    pressed && settingsPagesStyle.saveButtonPressed,
                                    isUpdatingPassword && settingsPagesStyle.saveButtonDisabled,
                                ]}
                                onPress={handleUpdatePassword}
                            >
                                {isUpdatingPassword ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Ionicons name="key-outline" size={18} color="#FFFFFF" />
                                        <Text style={settingsPagesStyle.saveButtonText}>
                                            Update Password
                                        </Text>
                                    </>
                                )}
                            </Pressable>
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
            </KeyboardAvoidingView>

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
                            <Text style={{ fontWeight: "700", color: "#0F172A" }}>@{currentUsername}</Text>?
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
