import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoginPages, RegisterPages, DashboardPages } from "../pages/index";
import { RootParamList } from "../types/RootParamList";

const Stack = createNativeStackNavigator<RootParamList>();

export function RootParamNavigation() {
    return (
        <Stack.Navigator>
            <Stack.Screen name="login" component={LoginPages} options={{ headerShown: false }} />
            <Stack.Screen name="register" component={RegisterPages} options={{ headerShown: false }} />
            <Stack.Screen name="dashboard" component={DashboardPages} options={{ headerShown: false }} />
        </Stack.Navigator>
    )
}
