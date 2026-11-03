import {
    Text,
    View,
    Image,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { registerPagesStyle } from "../styles/index";
import { RootParamList } from "../types/RootParamList";
import { Button, InputGroup } from "../components/index";

export function RegisterPages() {
    const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>();

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

                        <InputGroup label="Enter username" placeholder="username" />
                        <InputGroup label="Enter email" placeholder="email@example.com" />
                        <InputGroup label="Enter password" placeholder="password" secureText={true} />
                        <InputGroup label="Confirm password" placeholder="confirm password" secureText={true} />

                        <Button label="Create account" />

                        <View style={registerPagesStyle.Footer}>
                            <Text style={registerPagesStyle.FooterText}>Already have an account?</Text>
                            <Pressable onPress={() => navigation.navigate("login")} hitSlop={8}>
                                <Text style={registerPagesStyle.FooterLink}>Sign in</Text>
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    )
}
