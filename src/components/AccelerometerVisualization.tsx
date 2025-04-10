import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

const { width } = Dimensions.get('window');
const SIZE = width * 0.8;
const CENTER = SIZE / 2;
const BALL_RADIUS = 15;
const CIRCLE_RADIUS = [SIZE * 0.2, SIZE * 0.4, SIZE * 0.6];

interface AccelerometerVisualizationProps {
    x: number;
    y: number;
}

const AccelerometerVisualization: React.FC<AccelerometerVisualizationProps> = ({ x, y }) => {
    // Normalizacja wartości do zakresu -1 do 1
    const normalizedX = Math.max(-1, Math.min(1, x / 2));
    const normalizedY = Math.max(-1, Math.min(1, y / 2));

    // Obliczenie pozycji piłki
    const ballX = CENTER + normalizedX * CENTER;
    const ballY = CENTER + normalizedY * CENTER;

    return (
        <View style={styles.container}>
            <Svg width={SIZE} height={SIZE}>
                {/* Koncentryczne okręgi */}
                <Circle
                    cx={CENTER}
                    cy={CENTER}
                    r={CIRCLE_RADIUS[0]}
                    stroke="green"
                    strokeWidth="2"
                    fill="none"
                />
                <Circle
                    cx={CENTER}
                    cy={CENTER}
                    r={CIRCLE_RADIUS[1]}
                    stroke="yellow"
                    strokeWidth="2"
                    fill="none"
                />
                <Circle
                    cx={CENTER}
                    cy={CENTER}
                    r={CIRCLE_RADIUS[2]}
                    stroke="red"
                    strokeWidth="2"
                    fill="none"
                />

                {/* Krzyż osi */}
                <Line
                    x1={0}
                    y1={CENTER}
                    x2={SIZE}
                    y2={CENTER}
                    stroke="black"
                    strokeWidth="1"
                />
                <Line
                    x1={CENTER}
                    y1={0}
                    x2={CENTER}
                    y2={SIZE}
                    stroke="black"
                    strokeWidth="1"
                />

                {/* Piłka */}
                <Circle
                    cx={ballX}
                    cy={ballY}
                    r={BALL_RADIUS}
                    fill="red"
                />
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
});

export default AccelerometerVisualization; 