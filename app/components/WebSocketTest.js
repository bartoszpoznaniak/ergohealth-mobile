import { View, Text, StyleSheet } from "react-native";
import React, { useEffect, useState } from "react";

export default function WebSocketTest() {
    const [isConnected, setIsConnected] = useState(false);
    const [serverMessage, setServerMessage] = useState("");
    const [connectionStatus, setConnectionStatus] = useState("Inicjalizacja...");
    const [logs, setLogs] = useState([]);

    const addLog = (message) => {
        console.log(message);
        setLogs(prevLogs => [...prevLogs, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    useEffect(() => {
        addLog("Rozpoczynam połączenie WebSocket...");
        const ws = new WebSocket("ws://192.168.2.213:81");

        ws.onopen = () => {
            addLog("Połączenie WebSocket otwarte");
            setIsConnected(true);
            setConnectionStatus("Połączono z ESP32");
            // Próba wysłania testowej wiadomości
            ws.send("Hello ESP32!");
        };

        ws.onmessage = (e) => {
            addLog(`Otrzymano wiadomość: ${e.data}`);
            setServerMessage(e.data);
        };

        ws.onerror = (e) => {
            addLog(`Błąd WebSocket: ${e.message}`);
            setIsConnected(false);
            setConnectionStatus("Błąd połączenia");
        };

        ws.onclose = (e) => {
            addLog(`Połączenie zamknięte. Kod: ${e.code}, Powód: ${e.reason}`);
            setIsConnected(false);
            setConnectionStatus("Rozłączono");
        };

        return () => {
            addLog("Czyszczenie połączenia WebSocket");
            ws.close();
        };
    }, []);

    return (
        <View style={styles.container}>
            <Text style={[styles.status, { color: isConnected ? 'green' : 'red' }]}>
                Status: {connectionStatus}
            </Text>

            <Text style={styles.message}>
                Ostatnia wiadomość: {serverMessage || "Brak wiadomości"}
            </Text>

            <View style={styles.logsContainer}>
                <Text style={styles.logsTitle}>Logi:</Text>
                {logs.map((log, index) => (
                    <Text key={index} style={styles.log}>
                        {log}
                    </Text>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    status: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    message: {
        fontSize: 16,
        marginBottom: 20,
    },
    logsContainer: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 5,
    },
    logsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    log: {
        fontSize: 12,
        color: '#666',
        marginBottom: 5,
    },
}); 