import {
    View,
    Text,
    Image,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { loginPagesStyle } from "../styles/index";
import { Button, InputGroup } from "../components/index";
import { RootParamList } from "../types/RootParamList";
import { UserCredentialProp } from "../types/users";
import { handleLogin } from "../services/pages/LoginPages";

export function LoginPages() {
    const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>();
    const [userCredential, setUserCredential] = useState<UserCredentialProp>({
        username: "",
        password: ""
    });

    const setCredential = (name: keyof UserCredentialProp, value: string) => {
        setUserCredential((prev) => ({
            ...prev,
            [name]: value
        }))
    }

    const onLogin = () => {
        handleLogin(userCredential)
    }

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

                        <Button label="Login" onPress={onLogin} />

                        <View style={loginPagesStyle.Footer}>
                            <Text style={loginPagesStyle.FooterText}>{"Don't have an account?"}</Text>
                            <Pressable onPress={() => navigation.navigate("register")} hitSlop={8}>
                                <Text style={loginPagesStyle.FooterLink}>Sign up</Text>
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    )
}
