import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
    Animated,
    Easing,
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

    const [backdropAnim] = useState(() => new Animated.Value(0));
    const [cardFadeAnim] = useState(() => new Animated.Value(0));
    const [cardScaleAnim] = useState(() => new Animated.Value(0.92));
    const [cardTranslateY] = useState(() => new Animated.Value(10));
    const [iconScaleAnim] = useState(() => new Animated.Value(0.6));
    const isDismissingRef = useRef(false);

    const handleDismiss = useCallback(() => {
        if (isDismissingRef.current) return;
        isDismissingRef.current = true;

        Animated.parallel([
            Animated.timing(backdropAnim, {
                toValue: 0,
                duration: 190,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.timing(cardFadeAnim, {
                toValue: 0,
                duration: 190,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(cardScaleAnim, {
                toValue: 0.94,
                duration: 190,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(cardTranslateY, {
                toValue: 6,
                duration: 190,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    }, [backdropAnim, cardFadeAnim, cardScaleAnim, cardTranslateY, onClose]);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;

        if (visible) {
            isDismissingRef.current = false;
            backdropAnim.setValue(0);
            cardFadeAnim.setValue(0);
            cardScaleAnim.setValue(0.92);
            cardTranslateY.setValue(10);
            iconScaleAnim.setValue(0.6);

            Animated.parallel([
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 220,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(cardFadeAnim, {
                    toValue: 1,
                    duration: 200,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.spring(cardScaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 65,
                    useNativeDriver: true,
                }),
                Animated.spring(cardTranslateY, {
                    toValue: 0,
                    friction: 8,
                    tension: 65,
                    useNativeDriver: true,
                }),
                Animated.sequence([
                    Animated.delay(40),
                    Animated.spring(iconScaleAnim, {
                        toValue: 1,
                        friction: 6,
                        tension: 70,
                        useNativeDriver: true,
                    }),
                ]),
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
    }, [
        visible,
        isSuccess,
        autoHideDuration,
        backdropAnim,
        cardFadeAnim,
        cardScaleAnim,
        cardTranslateY,
        iconScaleAnim,
        handleDismiss,
    ]);

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleDismiss}
            statusBarTranslucent
        >
            <View style={styles.overlayWrapper}>
                {/* Backdrop pressable to dismiss immediately if tapped */}
                <Animated.View
                    style={[
                        styles.backdrop,
                        { opacity: backdropAnim },
                    ]}
                >
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={handleDismiss}
                        accessibilityRole="button"
                        accessibilityLabel="Dismiss dialog"
                    />
                </Animated.View>

                {/* Dialog Content */}
                <Animated.View
                    needsOffscreenAlphaCompositing
                    style={[
                        styles.container,
                        {
                            opacity: cardFadeAnim,
                            transform: [
                                { scale: cardScaleAnim },
                                { translateY: cardTranslateY },
                            ],
                        },
                    ]}
                >
                    <Animated.View
                        style={[
                            styles.iconCircle,
                            isSuccess ? styles.iconSuccess : styles.iconError,
                            {
                                transform: [{ scale: iconScaleAnim }],
                            },
                        ]}
                    >
                        <Ionicons
                            name={isSuccess ? "checkmark" : "close"}
                            size={30}
                            color={isSuccess ? "#16A34A" : "#DC2626"}
                        />
                    </Animated.View>

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
            </View>
        </Modal>
    );
}
