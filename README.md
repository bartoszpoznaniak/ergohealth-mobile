# ErgoHealth ESP32 App

## Wersje współpracujące

### ESP32
```cpp
// Wersja kodu ESP32, która współpracuje z tą wersją aplikacji
// Plik: BMI270_WS_v2_debug.ino
// Wersja: v2.0
// Data: 2024-03-20
// Funkcje:
// - Odczyt danych z czujnika BMI270
// - Komunikacja WebSocket na porcie 81
// - Obsługa komend: setSensitivity, reset
```

### React Native Expo
```javascript
// Wersja aplikacji React Native Expo
// Plik: App.js
// Wersja: v1.0
// Data: 2024-03-20
// Funkcje:
// - Wizualizacja danych z akcelerometru
// - Komunikacja WebSocket
// - Sterowanie czułością
// - Reset czujnika
```

## Konfiguracja połączenia

### Adres WebSocket
```
ws://192.168.2.213:81
```

### Format danych
```json
// Dane wysyłane z ESP32
{
    "type": "sensorData",
    "angleX": number,
    "angleY": number,
    "accX": number,
    "accY": number,
    "accZ": number,
    "timestamp": number
}

// Komendy wysyłane do ESP32
{
    "type": "setSensitivity",
    "value": number // 1-15
}
{
    "type": "reset"
}
```

## Wymagania

### ESP32
- Biblioteka WebSocket
- Biblioteka BMI270
- Konfiguracja sieci WiFi

### React Native Expo
- react-native-websocket
- @react-native-community/slider
- react-native-svg

## Znane problemy
1. Reset i zmiana czułości wymagają dodatkowej implementacji
2. WebSocket może wymagać ponownego połączenia przy utracie sygnału

## Rozwiązania
1. Dodano obsługę błędów w funkcji sendCommand
2. Dodano sprawdzanie stanu połączenia przed wysłaniem komend
3. Zaimplementowano bezpieczne zarządzanie stanem WebSocket 