import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, Text, View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import AccelerometerVisualization from './src/components/AccelerometerVisualization';
import WebSocket from 'react-native-websocket';
import React, { useState, useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

export default function App() {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [accZ, setAccZ] = useState(0);
  const [timestamp, setTimestamp] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Rozłączony');
  const [rawData, setRawData] = useState('');
  const [wsUrl, setWsUrl] = useState('ws://192.168.2.213:81');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Sprawdzamy uprawnienia sieciowe przy starcie
    checkNetworkPermissions();
  }, []);

  const checkNetworkPermissions = async () => {
    try {
      // W wersji produkcyjnej Android wymaga uprawnień
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.INTERNET,
          {
            title: 'Uprawnienia sieciowe',
            message: 'Aplikacja wymaga dostępu do sieci',
            buttonNeutral: 'Zapytaj później',
            buttonNegative: 'Anuluj',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Przyznano uprawnienia sieciowe');
        } else {
          console.log('Odmówiono uprawnień sieciowych');
        }
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const handleConnect = () => {
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setConnectionStatus('Rozłączony');
  };

  const processMessage = (message) => {
    try {
      console.log('Otrzymane dane:', message);
      setRawData(JSON.stringify(message, null, 2));

      if (typeof message === 'object' && message.data) {
        try {
          const sensorData = JSON.parse(message.data);

          if (sensorData.type === 'sensorData') {
            console.log('Pomyślnie sparsowano dane:', sensorData);
            const angleX = sensorData.angleX * (Math.PI / 180);
            const angleY = sensorData.angleY * (Math.PI / 180);

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />

      {!isConnected ? (
        <View style={styles.connectionForm}>
          <Text style={styles.title}>Konfiguracja połączenia</Text>
          <TextInput
            style={styles.input}
            value={wsUrl}
            onChangeText={setWsUrl}
            placeholder="Adres WebSocket"
          />
          <TouchableOpacity style={styles.button} onPress={handleConnect}>
            <Text style={styles.buttonText}>Połącz</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <WebSocket
            url={wsUrl}
            onMessage={processMessage}
            onOpen={() => {
              console.log('Połączono z WebSocket');
              setConnectionStatus('Połączony');
            }}
            onError={(error) => {
              console.error('Błąd WebSocket:', error);
              setConnectionStatus('Błąd połączenia');
              handleDisconnect();
            }}
            onClose={() => {
              console.log('Rozłączono z WebSocket');
              handleDisconnect();
            }}
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
            <TouchableOpacity style={styles.button} onPress={handleDisconnect}>
              <Text style={styles.buttonText}>Rozłącz</Text>
            </TouchableOpacity>
          </View>

          <AccelerometerVisualization x={x} y={y} />
        </>
      )}
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
  connectionForm: {
    width: '90%',
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
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
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
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
});
