import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Bluetooth from 'expo-bluetooth';

interface BluetoothConnectionProps {
    onDataReceived: (data: string) => void;
}

export default function BluetoothConnection({ onDataReceived }: BluetoothConnectionProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [devices, setDevices] = useState<Bluetooth.Device[]>([]);
    const [connectedDevice, setConnectedDevice] = useState<Bluetooth.Device | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        checkBluetoothPermissions();
        return () => {
            if (connectedDevice) {
                Bluetooth.disconnectFromDevice(connectedDevice.id);
            }
        };
    }, []);

    const checkBluetoothPermissions = async () => {
        const { status } = await Bluetooth.requestPermissionsAsync();
        if (status !== 'granted') {
            setError('Brak uprawnień do Bluetooth');
        }
    };

    const scanForDevices = async () => {
        try {
            setIsScanning(true);
            setError(null);
            const { devices } = await Bluetooth.scanForDevicesAsync();
            setDevices(devices);
        } catch (err) {
            setError('Błąd podczas skanowania urządzeń');
        } finally {
            setIsScanning(false);
        }
    };

    const connectToDevice = async (device: Bluetooth.Device) => {
        try {
            setError(null);
            const connected = await Bluetooth.connectToDeviceAsync(device.id);
            setConnectedDevice(connected);

            // Rozpocznij nasłuchiwanie danych
            Bluetooth.startObservingDevice(device.id, (data) => {
                onDataReceived(data);
            });
        } catch (err) {
            setError('Błąd podczas łączenia z urządzeniem');
        }
    };

    const disconnectFromDevice = async () => {
        if (connectedDevice) {
            try {
                await Bluetooth.disconnectFromDevice(connectedDevice.id);
                setConnectedDevice(null);
            } catch (err) {
                setError('Błąd podczas rozłączania');
            }
        }
    };

    return (
        <View style={styles.container}>
            {error && <Text style={styles.error}>{error}</Text>}

            {!connectedDevice ? (
                <>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={scanForDevices}
                        disabled={isScanning}
                    >
                        {isScanning ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Skanuj urządzenia</Text>
                        )}
                    </TouchableOpacity>

                    {devices.map((device) => (
                        <TouchableOpacity
                            key={device.id}
                            style={styles.deviceButton}
                            onPress={() => connectToDevice(device)}
                        >
                            <Text style={styles.deviceText}>{device.name || 'Nieznane urządzenie'}</Text>
                        </TouchableOpacity>
                    ))}
                </>
            ) : (
                <View>
                    <Text style={styles.connectedText}>
                        Połączono z: {connectedDevice.name || 'Nieznane urządzenie'}
                    </Text>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={disconnectFromDevice}
                    >
                        <Text style={styles.buttonText}>Rozłącz</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    deviceButton: {
        backgroundColor: '#f0f0f0',
        padding: 15,
        borderRadius: 8,
        marginBottom: 5,
    },
    deviceText: {
        fontSize: 16,
    },
    connectedText: {
        fontSize: 16,
        marginBottom: 10,
        textAlign: 'center',
    },
    error: {
        color: 'red',
        marginBottom: 10,
        textAlign: 'center',
    },
}); 