import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator
} from 'react-native';
import { useWebSocket } from '../hooks/useWebSocket';
import { CONNECTION_STATES } from '../services/websocket/WebSocketService';

export const ESP32Monitor = () => {
    console.log('=== ESP32Monitor component rendering ===');
    const [ipAddress, setIpAddress] = useState('192.168.2.213');
    const [maxAngle, setMaxAngle] = useState('15');
    const [samplingRate, setSamplingRate] = useState('100');
    const [isInitialized, setIsInitialized] = useState(false);

    console.log('Current state:', {
        ipAddress,
        maxAngle,
        samplingRate,
        isInitialized
    });

    const {
        connectionState,
        sensorData,
        error,
        sendConfiguration,
        sendCalibration
    } = useWebSocket(ipAddress);

    console.log('WebSocket state:', {
        connectionState,
        hasSensorData: !!sensorData,
        error
    });

    // Inicjalizacja komponentu
    useEffect(() => {
        console.log('=== ESP32Monitor useEffect ===');
        console.log('Component mounted');
        console.log('Current state:', {
            ipAddress,
            isInitialized,
            maxAngle,
            samplingRate
        });

        let initTimeout;
        if (!isInitialized) {
            console.log('Component not initialized, setting up initialization timer');
            initTimeout = setTimeout(() => {
                console.log('Initialization timer fired');
                if (!isInitialized) {
                    console.log('Setting isInitialized to true');
                    setIsInitialized(true);
                }
            }, 2000);
        }

        return () => {
            console.log('=== ESP32Monitor cleanup ===');
            console.log('Cleaning up initialization timer');
            if (initTimeout) {
                clearTimeout(initTimeout);
            }
        };
    }, [isInitialized]);

    // Obsługa stanu połączenia
    useEffect(() => {
        console.log('=== Connection state effect ===');
        console.log('Current connection state:', connectionState);
        console.log('Is initialized:', isInitialized);

        if (isInitialized) {
            console.log('Component is initialized, checking connection state');
            switch (connectionState) {
                case CONNECTION_STATES.CONNECTED:
                    console.log('Connected to ESP32');
                    break;
                case CONNECTION_STATES.CONNECTING:
                    console.log('Connecting to ESP32...');
                    break;
                case CONNECTION_STATES.ERROR:
                    console.log('Connection error occurred');
                    break;
                case CONNECTION_STATES.DISCONNECTED:
                    console.log('Disconnected from ESP32');
                    break;
                default:
                    console.log('Unknown connection state:', connectionState);
            }
        }
    }, [connectionState, isInitialized]);

    // Obsługa konfiguracji
    const handleConfigure = () => {
        if (!isInitialized) {
            console.log('Component not initialized yet');
            return;
        }

        console.log('Configure button pressed');
        console.log('Current connection state:', connectionState);
        console.log('Current IP address:', ipAddress);
        console.log('Current max angle:', maxAngle);
        console.log('Current sampling rate:', samplingRate);

        try {
            const angleNum = parseFloat(maxAngle);
            const rateNum = parseInt(samplingRate);

            if (isNaN(angleNum) || angleNum < 1 || angleNum > 15) {
                const errorMsg = `Nieprawidłowy kąt: ${maxAngle}. Kąt musi być między 1 a 15 stopni`;
                console.error(errorMsg);
                Alert.alert('Błąd', errorMsg);
                return;
            }

            if (isNaN(rateNum) || rateNum < 50) {
                const errorMsg = `Nieprawidłowa częstotliwość próbkowania: ${samplingRate}. Musi być większa niż 50ms`;
                console.error(errorMsg);
                Alert.alert('Błąd', errorMsg);
                return;
            }

            console.log('Sending configuration:', { maxAngle: angleNum, samplingRate: rateNum });
            sendConfiguration(angleNum, rateNum);
        } catch (error) {
            const errorMsg = `Błąd podczas konfiguracji: ${error.message}`;
            console.error(errorMsg);
            Alert.alert('Błąd', errorMsg);
        }
    };

    // Dodajmy więcej logów dla debugowania
    useEffect(() => {
        console.log('Connection state changed:', connectionState);
        if (connectionState === CONNECTION_STATES.ERROR) {
            console.error('Connection error occurred');
        }
    }, [connectionState]);

    useEffect(() => {
        if (error) {
            console.error('Error occurred:', error);
        }
    }, [error]);

    useEffect(() => {
        if (sensorData) {
            console.log('Sensor data received:', sensorData);
        }
    }, [sensorData]);

    // Mapowanie stanów połączenia na kolory
    const getStatusColor = () => {
        switch (connectionState) {
            case CONNECTION_STATES.CONNECTED:
                return '#4CAF50'; // zielony
            case CONNECTION_STATES.CONNECTING:
                return '#FFC107'; // żółty
            case CONNECTION_STATES.ERROR:
                return '#F44336'; // czerwony
            default:
                return '#9E9E9E'; // szary
        }
    };

    if (!isInitialized) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Inicjalizacja...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Status połączenia */}
            <View style={styles.statusContainer}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                <Text style={styles.statusText}>Status: {connectionState}</Text>
            </View>

            {/* Konfiguracja IP */}
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Adres IP:</Text>
                <TextInput
                    style={styles.input}
                    value={ipAddress}
                    onChangeText={(text) => {
                        console.log('IP address changed to:', text);
                        setIpAddress(text);
                    }}
                    placeholder="np. 192.168.4.1"
                    editable={connectionState === CONNECTION_STATES.DISCONNECTED}
                />
            </View>

            {/* Konfiguracja parametrów */}
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Maksymalny kąt (1-15°):</Text>
                <TextInput
                    style={styles.input}
                    value={maxAngle}
                    onChangeText={(text) => {
                        console.log('Max angle changed to:', text);
                        setMaxAngle(text);
                    }}
                    keyboardType="numeric"
                    editable={connectionState === CONNECTION_STATES.CONNECTED}
                />
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Częstotliwość próbkowania (ms):</Text>
                <TextInput
                    style={styles.input}
                    value={samplingRate}
                    onChangeText={(text) => {
                        console.log('Sampling rate changed to:', text);
                        setSamplingRate(text);
                    }}
                    keyboardType="numeric"
                    editable={connectionState === CONNECTION_STATES.CONNECTED}
                />
            </View>

            {/* Przyciski akcji */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, connectionState !== CONNECTION_STATES.CONNECTED && styles.buttonDisabled]}
                    onPress={handleConfigure}
                    disabled={connectionState !== CONNECTION_STATES.CONNECTED}
                >
                    <Text style={styles.buttonText}>Konfiguruj</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, connectionState !== CONNECTION_STATES.CONNECTED && styles.buttonDisabled]}
                    onPress={() => {
                        console.log('Calibration button pressed');
                        sendCalibration();
                    }}
                    disabled={connectionState !== CONNECTION_STATES.CONNECTED}
                >
                    <Text style={styles.buttonText}>Kalibruj</Text>
                </TouchableOpacity>
            </View>

            {/* Wyświetlanie danych z czujnika */}
            {connectionState === CONNECTION_STATES.CONNECTED && sensorData && (
                <View style={styles.dataContainer}>
                    <Text style={styles.dataText}>Kąt X: {sensorData.angleX?.toFixed(2) ?? 'N/A'}°</Text>
                    <Text style={styles.dataText}>Kąt Y: {sensorData.angleY?.toFixed(2) ?? 'N/A'}°</Text>
                    <Text style={styles.dataText}>Przysp. X: {sensorData.accX?.toFixed(2) ?? 'N/A'}g</Text>
                    <Text style={styles.dataText}>Przysp. Y: {sensorData.accY?.toFixed(2) ?? 'N/A'}g</Text>
                    <Text style={styles.dataText}>Przysp. Z: {sensorData.accZ?.toFixed(2) ?? 'N/A'}g</Text>
                </View>
            )}

            {/* Wyświetlanie błędów */}
            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    statusText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    inputContainer: {
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        marginBottom: 5,
        color: '#666',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        padding: 8,
        fontSize: 16,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 20,
    },
    button: {
        backgroundColor: '#2196F3',
        padding: 12,
        borderRadius: 4,
        minWidth: 120,
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#cccccc',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    dataContainer: {
        backgroundColor: '#f5f5f5',
        padding: 15,
        borderRadius: 4,
        marginTop: 20,
    },
    dataText: {
        fontSize: 14,
        marginBottom: 5,
    },
    errorContainer: {
        backgroundColor: '#ffebee',
        padding: 10,
        borderRadius: 4,
        marginTop: 20,
    },
    errorText: {
        color: '#F44336',
        fontSize: 14,
    },
}); 