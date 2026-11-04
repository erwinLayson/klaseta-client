import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
    LoginPages,
    RegisterPages,
    DashboardPages,
    MyClassPages,
    AttendancePages,
    GradebookPages,
    SettingsPages,
} from "../pages/index";
import { RootParamList } from "../types/RootParamList";

const Stack = createNativeStackNavigator<RootParamList>();

export function RootParamNavigation() {
    return (
        <Stack.Navigator>
            <Stack.Screen name="login" component={LoginPages} options={{ headerShown: false }} />
            <Stack.Screen name="register" component={RegisterPages} options={{ headerShown: false }} />
            <Stack.Screen
                name="dashboard"
                component={DashboardPages}
                options={{ headerShown: false, animation: "none" }}
            />
            <Stack.Screen
                name="myclass"
                component={MyClassPages}
                options={{ headerShown: false, animation: "none" }}
            />
            <Stack.Screen
                name="attendance"
                component={AttendancePages}
                options={{ headerShown: false, animation: "none" }}
            />
            <Stack.Screen
                name="gradebook"
                component={GradebookPages}
                options={{ headerShown: false, animation: "none" }}
            />
            <Stack.Screen
                name="settings"
                component={SettingsPages}
                options={{ headerShown: false, animation: "none" }}
            />
        </Stack.Navigator>
    );
}
