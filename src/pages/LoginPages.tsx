import {
    View,
    Text,
    Image,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { useState, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { loginPagesStyle } from "../styles/index";
import { Button, InputGroup, DialogMessage } from "../components/index";
import { RootParamList } from "../types/RootParamList";
import { UserCredentialProp } from "../types/users";
import { handleLogin } from "../services/pages/LoginPages";
import type { DialogType } from "../components/ui/DialogMessage";

export function LoginPages() {
    const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>();
    const [isLoading, setIsLoading] = useState(false);
    const [userCredential, setUserCredential] = useState<UserCredentialProp>({
        username: "",
        password: ""
    });

    const loggedInUsernameRef = useRef("");

    const [dialog, setDialog] = useState({
        visible: false,
        type: "success" as DialogType,
        title: "",
        message: "",
    });

    const setCredential = (name: keyof UserCredentialProp, value: string) => {
        setUserCredential((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const showDialog = (type: DialogType, title: string, message: string) => {
        setDialog({ visible: true, type, title, message });
    };

    const onCloseDialog = () => {
        setDialog((prev) => ({ ...prev, visible: false }));

        if (dialog.type === "success" && loggedInUsernameRef.current) {
            navigation.reset({
                index: 0,
                routes: [{ name: "dashboard", params: { username: loggedInUsernameRef.current } }],
            });
        }
    };

    const onLogin = async () => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            const result = await handleLogin(userCredential);

            if (result.success && result.username) {
                loggedInUsernameRef.current = result.username;
                showDialog("success", "Welcome back!", result.message);
            } else {
                showDialog("error", "Login Failed", result.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={loginPagesStyle.container}>
            <View style={loginPagesStyle.backgroundAccent} pointerEvents="none" />
            <View style={loginPagesStyle.backgroundAccentBottom} pointerEvents="none" />

            <KeyboardAvoidingView
                style={loginPagesStyle.KeyboardAvoidingView}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    contentContainerStyle={loginPagesStyle.ScrollView}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={loginPagesStyle.LoginContainer}>
                        <View style={loginPagesStyle.Header}>
                            <Image
                                source={require("../../assets/app_logo.png")}
                                style={loginPagesStyle.LogoImage}
                                resizeMode="contain"
                            />
                            <Text style={loginPagesStyle.Title}>Welcome back</Text>
                            <Text style={loginPagesStyle.Subtitle}>Sign in to continue to Klaseta</Text>
                        </View>

                        <InputGroup
                            label="Enter username"
                            placeholder="username"
                            value={userCredential.username}
                            onChangeText={(value) => setCredential('username', value)}
                        />

                        <InputGroup
                            label="Enter password"
                            placeholder="password"
                            value={userCredential.password}
                            onChangeText={(value) => setCredential('password', value)}
                            secureText={true}
                        />

                        <Button
                            label={isLoading ? "Signing in..." : "Login"}
                            onPress={onLogin}
                        />

                        <View style={loginPagesStyle.Footer}>
                            <Text style={loginPagesStyle.FooterText}>{"Don't have an account?"}</Text>
                            <Pressable onPress={() => navigation.navigate("register")} hitSlop={8}>
                                <Text style={loginPagesStyle.FooterLink}>Sign up</Text>
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
