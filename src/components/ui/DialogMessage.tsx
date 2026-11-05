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

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
    },
    container: {
        width: "100%",
        maxWidth: 340,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        paddingHorizontal: 28,
        paddingTop: 30,
        paddingBottom: 28,
        alignItems: "center",
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.12,
        shadowRadius: 30,
        elevation: 8,
    },
    iconCircle: {
        width: 58,
        height: 58,
        borderRadius: 29,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    iconSuccess: {
        backgroundColor: "#DCFCE7",
    },
    iconError: {
        backgroundColor: "#FEE2E2",
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#0F172A",
        marginBottom: 8,
        textAlign: "center",
        letterSpacing: -0.3,
    },
    message: {
        fontSize: 14,
        lineHeight: 21,
        color: "#64748B",
        textAlign: "center",
    },
    messageWithButton: {
        marginBottom: 22,
    },
    messageWithoutButton: {
        marginBottom: 6,
    },
    button: {
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
        paddingVertical: 14,
        marginTop: 6,
    },
    buttonError: {
        backgroundColor: "#DC2626",
    },
    buttonPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
    buttonLabel: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
});
