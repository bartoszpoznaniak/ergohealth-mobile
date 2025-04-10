import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import WebSocket from 'react-native-websocket';
import AccelerometerVisualization from './components/AccelerometerVisualization';

export default function App() {
    const [x, setX] = useState(0);
    const [y, setY] = useState(0);
    const [accZ, setAccZ] = useState(0);
    const [timestamp, setTimestamp] = useState('');

    const handleMessage = (message: string) => {
        try {
            const data = JSON.parse(message);
            setX(data.x);
            setY(data.y);
            setAccZ(data.accZ);
            setTimestamp(new Date().toLocaleTimeString());
        } catch (error) {
            console.error('Błąd parsowania danych:', error);
        }
    };

    return (
        <View style={styles.container}>
            <WebSocket
                url="ws://192.168.1.100:81"
                onMessage={handleMessage}
                reconnect={true}
            />

            <AccelerometerVisualization x={x} y={y} />

            <View style={styles.dataContainer}>
                <Text style={styles.text}>X: {x.toFixed(2)}</Text>
                <Text style={styles.text}>Y: {y.toFixed(2)}</Text>
                <Text style={styles.text}>AccZ: {accZ.toFixed(2)}</Text>
                <Text style={styles.text}>Czas: {timestamp}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dataContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    text: {
        fontSize: 16,
        marginVertical: 5,
    },
}); 