import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

const GREEN = process.env.EXPO_PUBLIC_GREEN_MAIN;

export default function LoadingIcon() {
    const rotation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(rotation, {
                toValue: 1,
                duration: 900,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, [rotation]);

    const rotate = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]}>
                <View style={styles.spinnerInner} />
            </Animated.View>
            <Text style={styles.label}>Loading groups...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
    },
    spinner: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 3.5,
        borderColor: '#e2e8f0',
        borderTopColor: `#${GREEN ?? '22c55e'}`,
    },
    spinnerInner: {
        // purely decorative — the border on the Animated.View does the work
    },
    label: {
        fontSize: 14,
        color: '#94a3b8',
        fontWeight: '500',
        letterSpacing: 0.2,
    },
});