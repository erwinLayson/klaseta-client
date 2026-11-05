import { useState } from "react";
import { Text, View, TextInput, type KeyboardTypeOptions } from "react-native";
import { styles } from "../../styles/components/ui/InputGroup";

interface InputGroupProps {
    label: string;
    value?: string;
    placeholder: string;
    onChangeText?: (value: string) => void;
    secureText?: boolean;
    keyboardType?: KeyboardTypeOptions;
}

export function InputGroup({
    label,
    placeholder,
    value,
    onChangeText,
    secureText,
    keyboardType,
}: InputGroupProps) {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.group}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={[styles.input, isFocused && styles.inputFocused]}
                placeholder={placeholder}
                placeholderTextColor="#94A3B8"
                value={value}
                onChangeText={onChangeText ? (v) => onChangeText(v) : undefined}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                secureTextEntry={secureText}
                selectionColor="#4F46E5"
                keyboardType={keyboardType}
            />
        </View>
    );
}
