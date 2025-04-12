import React from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

const { width } = Dimensions.get('window');
const SIZE = width * 0.8;
const CENTER = SIZE / 2;
const MAX_OFFSET = SIZE * 0.4; // Zwiększamy maksymalne przesunięcie

const AccelerometerVisualization = ({ x, y, isConnected, connectionStatus, handleConnect }) => {
    // Logujemy otrzymane wartości
    console.log('AccelerometerVisualization - otrzymane wartości:', { x, y });

    // Przeskalowujemy wartości do zakresu -MAX_OFFSET do MAX_OFFSET
    const scaledX = x * MAX_OFFSET;
    const scaledY = y * MAX_OFFSET;

    console.log('AccelerometerVisualization - przeskalowane wartości:', { scaledX, scaledY });

    return (
        <View style={styles.container}>
            {isConnected ? (
                <>
                    <View style={styles.visualization}>
                        <Svg width={SIZE} height={SIZE}>
                            {/* Tło - pomocniczy krąg */}
                            <Circle
                                cx={CENTER}
                                cy={CENTER}
                                r={MAX_OFFSET}
                                fill="none"
                                stroke="#ddd"
                                strokeWidth="2"
                            />

                            {/* Linie pomocnicze */}
                            <Line
                                x1={0}
                                y1={CENTER}
                                x2={SIZE}
                                y2={CENTER}
                                stroke="#eee"
                                strokeWidth="1"
                            />
                            <Line
                                x1={CENTER}
                                y1={0}
                                x2={CENTER}
                                y2={SIZE}
                                stroke="#eee"
                                strokeWidth="1"
                            />

                            {/* Ruchoma kropka */}
                            <Circle
                                cx={CENTER + scaledX}
                                cy={CENTER + scaledY}
                                r={15}
                                fill="red"
                            />
                        </Svg>
                    </View>
                    <Text style={styles.statusText}>
                        {connectionStatus}
                    </Text>
                </>
            ) : (
                <View style={styles.disconnectedContainer}>
                    <Text style={styles.disconnectedText}>
                        {connectionStatus}
                    </Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={handleConnect}
                    >
                        <Text style={styles.retryButtonText}>Spróbuj ponownie</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    visualization: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    disconnectedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    disconnectedText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#007AFF',
        padding: 10,
        borderRadius: 5,
    },
    retryButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    statusText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginTop: 10,
    },
});

export default AccelerometerVisualization; 