import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, Text, View } from 'react-native';
import AccelerometerVisualization from './src/components/AccelerometerVisualization';
import WebSocket from 'react-native-websocket';
import React, { useState } from 'react';

export default function App() {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [accZ, setAccZ] = useState(0);
  const [timestamp, setTimestamp] = useState('');

  const handleMessage = (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Otrzymane dane:', data);
      setX(data.x);
      setY(data.y);
      setAccZ(data.accZ);
      setTimestamp(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Błąd parsowania danych:', error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <StatusBar style="auto" />
      <WebSocket
        url="ws://192.168.1.100:81"
        onMessage={handleMessage}
        reconnect={true}
      />
      <AccelerometerVisualization x={x} y={y} />
      <View style={{ marginTop: 20 }}>
        <Text>X: {x.toFixed(2)}</Text>
        <Text>Y: {y.toFixed(2)}</Text>
        <Text>AccZ: {accZ.toFixed(2)}</Text>
        <Text>Czas: {timestamp}</Text>
      </View>
    </SafeAreaView>
  );
}
