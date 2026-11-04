import {
    Text,
    View,
    Image,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { registerPagesStyle } from "../styles/index";
import { RootParamList } from "../types/RootParamList";
import { Button, InputGroup, DialogMessage } from "../components/index";
import type { DialogType } from "../components/ui/DialogMessage";
import { UserRegisterProp } from "../types/users";
import { handleRegister } from "../services/pages/RegisterPages";

export function RegisterPages() {
    const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>();
    const [isLoading, setIsLoading] = useState(false);
    const [form, setForm] = useState<UserRegisterProp>({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const [dialog, setDialog] = useState({
        visible: false,
        type: "success" as DialogType,
        title: "",
        message: "",
    });

    const setField = (name: keyof UserRegisterProp, value: string) => {
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const showDialog = (type: DialogType, title: string, message: string) => {
        setDialog({ visible: true, type, title, message });
    };

    const onCloseDialog = () => {
        setDialog((prev) => ({ ...prev, visible: false }));

        if (dialog.type === "success") {
            navigation.navigate("login");
        }
    };

    const onRegister = async () => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            const result = await handleRegister(form);

            if (result.success) {
                showDialog("success", "Registration Successful", result.message);
            } else {
                showDialog("error", "Registration Failed", result.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={registerPagesStyle.container}>
            <View style={registerPagesStyle.backgroundAccent} pointerEvents="none" />
            <View style={registerPagesStyle.backgroundAccentBottom} pointerEvents="none" />

            <KeyboardAvoidingView
                style={registerPagesStyle.KeyboardAvoidingView}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    contentContainerStyle={registerPagesStyle.ScrollView}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={registerPagesStyle.RegisterContainer}>
                        <View style={registerPagesStyle.Header}>
                            <Image
                                source={require("../../assets/app_logo.png")}
                                style={registerPagesStyle.LogoImage}
                                resizeMode="contain"
                            />
                            <Text style={registerPagesStyle.Title}>Create account</Text>
                            <Text style={registerPagesStyle.Subtitle}>Join Klaseta today</Text>
                        </View>

                        <InputGroup
                            label="Enter username"
                            placeholder="username"
                            value={form.username}
                            onChangeText={(value) => setField("username", value)}
                        />
                        <InputGroup
                            label="Enter email"
                            placeholder="email@example.com"
                            value={form.email}
                            onChangeText={(value) => setField("email", value)}
                        />
                        <InputGroup
                            label="Enter password"
                            placeholder="password"
                            value={form.password}
                            onChangeText={(value) => setField("password", value)}
                            secureText={true}
                        />
                        <InputGroup
                            label="Confirm password"
                            placeholder="confirm password"
                            value={form.confirmPassword}
                            onChangeText={(value) => setField("confirmPassword", value)}
                            secureText={true}
                        />

                        <Button
                            label={isLoading ? "Creating account..." : "Create account"}
                            onPress={onRegister}
                        />

                        <View style={registerPagesStyle.Footer}>
                            <Text style={registerPagesStyle.FooterText}>Already have an account?</Text>
                            <Pressable onPress={() => navigation.navigate("login")} hitSlop={8}>
                                <Text style={registerPagesStyle.FooterLink}>Sign in</Text>
                            </Pressable>
                        </View>

                        <View style={[registerPagesStyle.Footer, { marginTop: 14 }]}>
                            <Pressable
                                onPress={() => navigation.navigate("landing")}
                                hitSlop={8}
                                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                            >
                                <Ionicons name="arrow-back" size={14} color="#64748B" />
                                <Text style={[registerPagesStyle.FooterText, { color: "#64748B" }]}>
                                    Back to Home
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <DialogMessage
                visible={dialog.visible}
                type={dialog.type}
                title={dialog.title}
                message={dialog.message}
                onClose={onCloseDialog}
            />
        </View>
    );
}
