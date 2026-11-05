import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
    Animated,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { styles } from "../../styles/components/ui/DialogMessage";

export type DialogType = "success" | "error";

export interface DialogMessageProps {
    visible: boolean;
    type: DialogType;
    title: string;
    message: string;
    onClose: () => void;
    /**
     * Duration in milliseconds before a success dialog automatically fades out.
     * Defaults to 2200ms (2.2 seconds).
     */
    autoHideDuration?: number;
}

export function DialogMessage({
    visible,
    type,
    title,
    message,
    onClose,
    autoHideDuration = 2200,
}: DialogMessageProps) {
    const isSuccess = type === "success";

    const [fadeAnim] = useState(() => new Animated.Value(0));
    const [scaleAnim] = useState(() => new Animated.Value(0.92));
    const isDismissingRef = useRef(false);

    const handleDismiss = useCallback(() => {
        if (isDismissingRef.current) return;
        isDismissingRef.current = true;

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.95,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    }, [fadeAnim, scaleAnim, onClose]);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;

        if (visible) {
            isDismissingRef.current = false;
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.92);

            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 220,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 50,
                    useNativeDriver: true,
                }),
            ]).start();

            // Auto-fade success dialog after autoHideDuration
            if (isSuccess) {
                timer = setTimeout(() => {
                    handleDismiss();
                }, autoHideDuration);
            }
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [visible, isSuccess, autoHideDuration, fadeAnim, scaleAnim, handleDismiss]);

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleDismiss}
        >
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                {/* Backdrop pressable to dismiss immediately if tapped */}
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={handleDismiss}
                />

                <Animated.View
                    style={[
                        styles.container,
                        {
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    <View
                        style={[
                            styles.iconCircle,
                            isSuccess ? styles.iconSuccess : styles.iconError,
                        ]}
                    >
                        <Ionicons
                            name={isSuccess ? "checkmark" : "close"}
                            size={30}
                            color={isSuccess ? "#16A34A" : "#DC2626"}
                        />
                    </View>

                    <Text style={styles.title}>{title}</Text>
                    <Text
                        style={[
                            styles.message,
                            isSuccess ? styles.messageWithoutButton : styles.messageWithButton,
                        ]}
                    >
                        {message}
                    </Text>

                    {/* Only show OK button for errors; success dialog auto-fades without button */}
                    {!isSuccess && (
                        <Pressable
                            onPress={handleDismiss}
                            style={({ pressed }) => [
                                styles.button,
                                styles.buttonError,
                                pressed && styles.buttonPressed,
                            ]}
                        >
                            <Text style={styles.buttonLabel}>OK</Text>
                        </Pressable>
                    )}
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}
