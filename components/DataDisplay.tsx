import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface DataDisplayProps {
    onDataReceived: (data: string) => void;
}

export default function DataDisplay({ onDataReceived }: DataDisplayProps) {
    const [rawData, setRawData] = useState<string[]>([]);

    const handleDataReceived = (data: string) => {
        setRawData(prevData => [data, ...prevData].slice(0, 50)); // Zachowaj ostatnie 50 odczytów
        onDataReceived(data);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Dane z ESP32</Text>
            <ScrollView style={styles.scrollView}>
                {rawData.map((data, index) => (
                    <View key={index} style={styles.dataItem}>
                        <Text style={styles.timestamp}>{new Date().toLocaleTimeString()}</Text>
                        <Text style={styles.rawData}>{data}</Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
    },
    dataItem: {
        backgroundColor: '#f0f0f0',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
    },
    timestamp: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10,
    },
    rawData: {
        fontSize: 16,
        color: '#333',
        fontFamily: 'monospace',
    },
}); 