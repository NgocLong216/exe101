import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const GREEN = process.env.EXPO_PUBLIC_GREEN_MAIN;

type LoadingIconProps = {
    size?: number;
    color?: string;
    thickness?: number;
};

export default function LoadingIcon({
    size = 36,
    color = `#${GREEN}`,
    thickness = 3,
}: LoadingIconProps) {
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

        return () => rotation.stopAnimation();
    }, [rotation]);

    const spin = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={[styles.wrapper, { width: size, height: size }]}>
            <Animated.View
                style={[
                    styles.ring,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        borderWidth: thickness,
                        borderTopColor: color,
                        borderRightColor: `${color}40`,
                        borderBottomColor: `${color}20`,
                        borderLeftColor: `${color}70`,
                        transform: [{ rotate: spin }],
                    },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    ring: {
        position: 'absolute',
    },
});