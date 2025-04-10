import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, Text, View, StyleSheet } from 'react-native';
import AccelerometerVisualization from './src/components/AccelerometerVisualization';
import WebSocket from 'react-native-websocket';
import React, { useState } from 'react';

export default function App() {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [accZ, setAccZ] = useState(0);
  const [timestamp, setTimestamp] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Rozłączony');
  const [rawData, setRawData] = useState('');

  const processMessage = (message) => {
    try {
      // Logujemy surowe dane
      console.log('Otrzymane dane:', message);
      setRawData(JSON.stringify(message, null, 2));

      // Sprawdzamy, czy message jest obiektem
      if (typeof message === 'object' && message.data) {
        try {
          // Próbujemy sparsować wewnętrzny JSON
          const sensorData = JSON.parse(message.data);

          if (sensorData.type === 'sensorData') {
            console.log('Pomyślnie sparsowano dane:', sensorData);
            // Konwertujemy kąty na radiany i normalizujemy
            const angleX = sensorData.angleX * (Math.PI / 180); // konwersja na radiany
            const angleY = sensorData.angleY * (Math.PI / 180); // konwersja na radiany

            // Normalizujemy wartości do zakresu -1 do 1
            const normalizedX = Math.sin(angleX);
            const normalizedY = Math.sin(angleY);

            setX(normalizedX);
            setY(normalizedY);
            setAccZ(sensorData.accZ);
            setTimestamp(new Date(sensorData.timestamp).toLocaleTimeString());
          }
        } catch (innerError) {
          console.error('Błąd parsowania wewnętrznego JSON:', innerError);
        }
      }
    } catch (error) {
      console.error('Błąd przetwarzania wiadomości:', error);
    }
  };

  const handleMessage = (message) => {
    processMessage(message);
  };

  const handleOpen = () => {
    console.log('Połączono z WebSocket');
    setConnectionStatus('Połączony');
  };

  const handleError = (error) => {
    console.error('Błąd WebSocket:', error);
    setConnectionStatus('Błąd połączenia');
  };

  const handleClose = () => {
    console.log('Rozłączono z WebSocket');
    setConnectionStatus('Rozłączony');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <WebSocket
        url="ws://192.168.2.213:81"
        onMessage={handleMessage}
        onOpen={handleOpen}
        onError={handleError}
        onClose={handleClose}
        reconnect={true}
      />

      <View style={styles.dataContainer}>
        <Text style={styles.title}>Dane z akcelerometru:</Text>
        <Text style={styles.value}>X (kąt): {x.toFixed(4)}</Text>
        <Text style={styles.value}>Y (kąt): {y.toFixed(4)}</Text>
        <Text style={styles.value}>AccZ: {accZ.toFixed(4)}</Text>
        <Text style={styles.timestamp}>Czas: {timestamp}</Text>
        <Text style={[styles.status, { color: connectionStatus === 'Połączony' ? 'green' : 'red' }]}>
          Status: {connectionStatus}
        </Text>
        <Text style={styles.rawData}>Surowe dane: {rawData}</Text>
      </View>

      <AccelerometerVisualization x={x} y={y} />
    </SafeAreaView>
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
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    width: '90%',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  value: {
    fontSize: 16,
    marginVertical: 5,
  },
  timestamp: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  rawData: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
    fontFamily: 'monospace',
  }
});
