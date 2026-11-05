import { Pressable, Text } from "react-native";
import { styles } from "../../styles/components/ui/Button";

interface ButtonProps {
    label: string;
    onPress?: () => void;
}

export function Button({ label, onPress }: ButtonProps) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
            <Text style={styles.label}>{label}</Text>
        </Pressable>
    );
}
