import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, Text, View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import AccelerometerVisualization from './src/components/AccelerometerVisualization';
import WebSocket from 'react-native-websocket';
import React, { useState, useEffect, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Slider from '@react-native-community/slider';

export default function App() {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [accZ, setAccZ] = useState(0);
  const [timestamp, setTimestamp] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Rozłączony');
  const [rawData, setRawData] = useState('');
  const [wsUrl, setWsUrl] = useState('ws://192.168.2.213:81');
  const [isConnected, setIsConnected] = useState(false);
  const [sensitivity, setSensitivity] = useState(1);
  const wsRef = useRef(null);

  useEffect(() => {
    // Sprawdzamy uprawnienia sieciowe przy starcie
    checkNetworkPermissions();
  }, []);

  const checkNetworkPermissions = async () => {
    try {
      // W Androidzie nie ma potrzeby sprawdzania uprawnień do internetu
      if (Platform.OS === 'android') {
        console.log('Android - dostęp do internetu jest domyślnie włączony');
        return true;
      }
    } catch (err) {
      console.warn('Błąd przy sprawdzaniu uprawnień:', err);
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
      // Wykomentowane logowanie danych
      // console.log('Otrzymane dane:', message);
      setRawData(JSON.stringify(message, null, 2));

      if (typeof message === 'object' && message.data) {
        try {
          const data = JSON.parse(message.data);

          if (data.type === 'sensorData') {
            // Przywrócone przetwarzanie danych dla wizualizacji
            const angleX = data.angleX * (Math.PI / 180);
            const angleY = data.angleY * (Math.PI / 180);

            const normalizedX = Math.sin(angleX);
            const normalizedY = Math.sin(angleY);

            setX(normalizedX);
            setY(normalizedY);
            setAccZ(data.accZ);
            setTimestamp(new Date(data.timestamp).toLocaleTimeString());
          } else if (data.type === 'commandResponse') {
            console.log('Otrzymano odpowiedź na komendę:', data);
            if (data.status === 'success') {
              if (data.command === 'setSensitivity') {
                setSensitivity(data.value);
                setConnectionStatus('Czułość zaktualizowana');
              } else if (data.command === 'reset') {
                setConnectionStatus('Czujnik zresetowany');
              }
            } else {
              setConnectionStatus(`Błąd: ${data.message}`);
            }
          }
        } catch (innerError) {
          console.error('Błąd parsowania wewnętrznego JSON:', innerError);
        }
      }
    } catch (error) {
      console.error('Błąd przetwarzania wiadomości:', error);
    }
  };

  const sendCommand = (command) => {
    try {
      if (!wsRef.current) {
        console.warn('WebSocket nie jest zainicjalizowany');
        return;
      }

      if (!isConnected) {
        console.warn('Nie jesteś połączony z WebSocket');
        return;
      }

      if (wsRef.current.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket nie jest w stanie OPEN');
        return;
      }

      wsRef.current.send(JSON.stringify(command));
    } catch (error) {
      console.error('Błąd podczas wysyłania komendy:', error);
      setConnectionStatus('Błąd wysyłania');
    }
  };

  const handleSensitivityChange = (value) => {
    sendCommand({
      type: 'setSensitivity',
      value: value
    });
  };

  const handleSensitivityInput = (text) => {
    const value = parseInt(text);
    if (!isNaN(value) && value >= 1 && value <= 15) {
      setSensitivity(value);
      sendCommand({
        type: 'setSensitivity',
        value: value
      });
    }
  };

  const handleReset = () => {
    sendCommand({
      type: 'reset'
    });
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
            ref={wsRef}
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

            <View style={styles.sensitivityContainer}>
              <Text style={styles.sensitivityLabel}>Czułość:</Text>
              <View style={styles.sensitivityControls}>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={15}
                  value={sensitivity}
                  onValueChange={handleSensitivityChange}
                  step={1}
                />
                <TextInput
                  style={styles.sensitivityInput}
                  value={sensitivity.toString()}
                  onChangeText={handleSensitivityInput}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[styles.button, styles.resetButton]} onPress={handleReset}>
                <Text style={styles.buttonText}>Resetuj czujnik</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={handleDisconnect}>
                <Text style={styles.buttonText}>Rozłącz</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.status, { color: connectionStatus === 'Połączony' ? 'green' : 'red' }]}>
              Status: {connectionStatus}
            </Text>
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
  sensitivityContainer: {
    marginVertical: 15,
    width: '100%',
  },
  sensitivityLabel: {
    fontSize: 16,
    marginBottom: 5,
    textAlign: 'center',
  },
  sensitivityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slider: {
    flex: 1,
    height: 40,
    marginRight: 10,
  },
  sensitivityInput: {
    width: 50,
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    textAlign: 'center',
    fontSize: 16,
    padding: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  resetButton: {
    backgroundColor: '#FF3B30',
    marginRight: 10,
  },
});
