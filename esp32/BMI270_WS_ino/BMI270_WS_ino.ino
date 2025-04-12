#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <EEPROM.h>
#include "SparkFun_BMI270_Arduino_Library.h"
#include "config.h"
#include <ArduinoJson.h>
#include <WebSocketsServer.h>

// Wersja programu
#define VERSION_MAJOR 1
#define VERSION_MINOR 1130
#define VERSION_PATCH 51

#define VERSION_BUILD "WS" // oznaczenie że to wersja z WebSocket
#define VERSION_STRING "BMI270 WebSocket v" STRINGIFY(VERSION_MAJOR) "." STRINGIFY(VERSION_MINOR) "." STRINGIFY(VERSION_PATCH) "-" VERSION_BUILD

// Helper macro do konwersji numerów na stringi
#define STRINGIFY(x) STRINGIFY2(x)
#define STRINGIFY2(x) #x

// Stałe konfiguracyjne
#define WEBSOCKET_PORT 81
#define JSON_BUFFER_SIZE 200
#define WIFI_TIMEOUT 10000 // 10 sekund na połączenie

// Inicjalizacja serwera WWW na porcie 80
WebServer server(80);

// Inicjalizacja czujnika BMI270
BMI270 imu;
uint8_t i2cAddress = BMI2_I2C_PRIM_ADDR; // 0x68

// Zmienne do przechowywania danych z czujnika
float accX = 0;
float accY = 0;
float accZ = 0;
float gyroX = 0;
float gyroY = 0;
float gyroZ = 0;

// Offset kalibracji
float offsetX = 0;
float offsetY = 0;

// Maksymalny kąt nachylenia (w stopniach)
const float MAX_ANGLE = 15.0;

// Adresy w EEPROM
const int EEPROM_SIZE = 512;
const int SSID_ADDR = 0;
const int PASS_ADDR = 32;

// Inicjalizacja WebSocket
WebSocketsServer webSocket = WebSocketsServer(WEBSOCKET_PORT);

// Stałe dla WiFi
const char *DEFAULT_SSID = "ASUS";
const char *DEFAULT_PASSWORD = "Bananysafajne123";

// Dane WiFi
char ssid[32];     // Nazwa sieci
char password[64]; // Hasło do sieci
String localIP;    // Będzie przechowywać przydzielony adres IP

// Struktura konfiguracji WiFi
struct WiFiConfig
{
    char ssid[32];
    char password[64];
};

// Struktura konfiguracji
struct DeviceConfig
{
    float sensitivity = 1.0;
    int samplingRate = 100; // ms
} config;

// HTML strony konfiguracyjnej
const char config_html[] PROGMEM = R"rawliteral(
<!DOCTYPE HTML>
<html>
<head>
    <title>Konfiguracja WiFi</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial; text-align: center; margin: 0px auto; padding-top: 30px; }
        .form-group { margin: 20px 0; }
        input { padding: 10px; width: 200px; }
        button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
    </style>
</head>
<body>
    <h2>Konfiguracja WiFi ErgoHealth</h2>
    <form action="/save" method="post">
        <div class="form-group">
            <label for="ssid">Nazwa sieci (SSID):</label><br>
            <input type="text" id="ssid" name="ssid" required>
        </div>
        <div class="form-group">
            <label for="password">Hasło:</label><br>
            <input type="password" id="password" name="password" required>
        </div>
        <button type="submit">Zapisz</button>
    </form>
</body>
</html>
)rawliteral";

// HTML strony głównej
const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE HTML>
<html>
<head>
    <title>:Poduszka ErgoHealth</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial; text-align: center; margin: 0px auto; padding-top: 30px; }
        .gauge { width: 360px; height: 360px; margin: 0 auto; position: relative; }
        .gauge-circle { 
            width: 100%; 
            height: 100%; 
            border: 3px solid #FF0000; /* czerwony */
            border-radius: 50%; 
            position: relative; 
        }
        .gauge-circle::before,
        .gauge-circle::after {
            content: '';
            position: absolute;
            border-radius: 50%;
            border: 3px solid;
        }
        .gauge-circle::before {
            top: 10%;
            left: 10%;
            right: 10%;
            bottom: 10%;
            border-color: #FFFF00; /* żółty */
        }
        .gauge-circle::after {
            top: 20%;
            left: 20%;
            right: 20%;
            bottom: 20%;
            border-color: #00FF00; /* zielony */
        }
        .gauge-cross { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%; height: 100%; }
        .gauge-cross::before, .gauge-cross::after { content: ''; position: absolute; background: #eee; }
        .gauge-cross::before { width: 2px; height: 100%; left: 50%; transform: translateX(-50%); }
        .gauge-cross::after { width: 100%; height: 2px; top: 50%; left: 0; transform: translateY(-50%); }
        .ball { width: 20px; height: 20px; background: red; border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
        .reset-btn { margin-top: 20px; padding: 10px 20px; font-size: 16px; cursor: pointer; }
        .sensitivity-controls { margin-top: 20px; }
        .sensitivity-controls label { display: block; margin-bottom: 10px; }
        .sensitivity-controls input[type="range"] { width: 200px; margin-right: 10px; }
        .sensitivity-controls input[type="number"] { width: 60px; }
    </style>
</head>
<body>
    <h2>Poduszka ErgoHealth</h2>
    <div class="gauge">
        <div class="gauge-circle">
            <div class="gauge-cross"></div>
            <div class="ball" id="ball"></div>
        </div>
    </div>
    <button class="reset-btn" onclick="resetSensor()">Resetuj czujnik</button>
    <button class="reset-btn" onclick="resetWiFi()" style="margin-left: 10px;">Konfiguracja WiFi</button>
    
    <div class="sensitivity-controls">
        <label>Czulosci: <span id="sensitivityValue">15</span> stopni</label>
        <input type="range" id="sensitivitySlider" min="1" max="15" value="15" oninput="updateSensitivity(this.value)">
        <input type="number" id="sensitivityInput" min="1" max="15" value="15" onchange="updateSensitivity(this.value)">
    </div>
    <div id="connectionStatus" style="color: red; margin-top: 10px;"></div>

    <script>
        var ball = document.getElementById('ball');
        var gauge = document.querySelector('.gauge');
        var gaugeWidth = gauge.offsetWidth;
        var maxOffset = gaugeWidth * 0.4; // 40% promienia
        let sensitivity = 15; // domyslna czulosci

        function updateSensitivity(value) {
            value = Math.min(15, Math.max(1, parseInt(value)));
            sensitivity = value;
            document.getElementById('sensitivityValue').textContent = value;
            document.getElementById('sensitivitySlider').value = value;
            document.getElementById('sensitivityInput').value = value;
        }

        function updateBallPosition() {
            fetch('/data')
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        document.getElementById('connectionStatus').textContent = data.error;
                        return;
                    }
                    document.getElementById('connectionStatus').textContent = '';
                    // Obliczanie pozycji kulki na podstawie kątów
                    var xOffset = (data.angleX / sensitivity) * maxOffset;
                    var yOffset = (data.angleY / sensitivity) * maxOffset;
                    
                    ball.style.transform = `translate(calc(-50% + ${xOffset}px), calc(-50% + ${yOffset}px))`;
                });
        }

        function resetSensor() {
            fetch('/reset')
                .then(response => response.text())
                .then(data => {
                    console.log('Czujnik zresetowany');
                });
        }

        function resetWiFi() {
            if(confirm('Czy na pewno chcesz zresetować ustawienia WiFi? Urządzenie uruchomi się w trybie konfiguracyjnym.')) {
                fetch('/resetWiFi')
                    .then(response => response.text())
                    .then(data => {
                        console.log('Resetowanie WiFi...');
                    });
            }
        }

        // Aktualizacja co 100ms
        setInterval(updateBallPosition, 100);
    </script>
</body>
</html>
)rawliteral";

// Funkcja do zapisywania danych WiFi w EEPROM
void saveWiFiConfig()
{
    WiFiConfig config;
    strncpy(config.ssid, ssid, sizeof(config.ssid));
    strncpy(config.password, password, sizeof(config.password));

    EEPROM.begin(512);
    EEPROM.put(0, config);
    EEPROM.commit();
    EEPROM.end();
}

// Funkcja do odczytywania danych WiFi z EEPROM
void loadWiFiConfig()
{
    WiFiConfig config;

    EEPROM.begin(512);
    EEPROM.get(0, config);
    EEPROM.end();

    // Debugowanie
    Serial.println("\nOdczytane dane z EEPROM:");
    Serial.print("SSID: '");
    Serial.print(config.ssid);
    Serial.println("'");
    Serial.print("Długość SSID: ");
    Serial.println(strlen(config.ssid));

    // Sprawdź czy dane są poprawne
    if (strlen(config.ssid) == 0)
    {
        Serial.println("Brak zapisanej konfiguracji WiFi, używam domyślnych wartości");
        return;
    }

    // Skopiuj wartości zamiast przypisywać wskaźniki
    strncpy(ssid, config.ssid, sizeof(ssid));
    strncpy(password, config.password, sizeof(password));

    Serial.println("\nSkopiowane wartości:");
    Serial.print("SSID: '");
    Serial.print(ssid);
    Serial.println("'");
    Serial.print("Długość SSID: ");
    Serial.println(strlen(ssid));
}

void setupWiFi()
{
    WiFi.mode(WIFI_STA); // Ustaw tryb Station

    Serial.println("\nPróba połączenia z siecią WiFi...");
    Serial.print("SSID: '");
    Serial.print(ssid);
    Serial.println("'");
    Serial.print("Długość SSID: ");
    Serial.println(strlen(ssid));

    // Jeśli SSID jest puste, użyj domyślnych wartości
    if (strlen(ssid) == 0)
    {
        strcpy(ssid, "ASUS");
        strcpy(password, "Bananysafajne123");
        Serial.println("Używam domyślnych wartości WiFi");
        Serial.print("Nowy SSID: '");
        Serial.print(ssid);
        Serial.println("'");
    }

    WiFi.begin(ssid, password); // Połącz z siecią

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20)
    {
        delay(500);
        Serial.print(".");
        attempts++;

        if (attempts % 10 == 0)
        {
            Serial.println();
            Serial.print("Status WiFi: ");
            switch (WiFi.status())
            {
            case WL_IDLE_STATUS:
                Serial.println("WL_IDLE_STATUS");
                break;
            case WL_NO_SSID_AVAIL:
                Serial.println("WL_NO_SSID_AVAIL - Nie znaleziono sieci");
                break;
            case WL_CONNECT_FAILED:
                Serial.println("WL_CONNECT_FAILED - Błąd połączenia");
                break;
            case WL_CONNECTION_LOST:
                Serial.println("WL_CONNECTION_LOST - Utracono połączenie");
                break;
            case WL_DISCONNECTED:
                Serial.println("WL_DISCONNECTED - Rozłączono");
                break;
            default:
                Serial.println("Nieznany status");
                break;
            }
        }
    }

    if (WiFi.status() == WL_CONNECTED)
    {
        localIP = WiFi.localIP().toString();
        Serial.println("\nPołączono z WiFi!");
        Serial.print("Adres IP: ");
        Serial.println(localIP);
        Serial.print("Siła sygnału (RSSI): ");
        Serial.print(WiFi.RSSI());
        Serial.println(" dBm");
    }
    else
    {
        Serial.println("\nNie udało się połączyć z WiFi!");
        Serial.println("Sprawdź:");
        Serial.println("1. Czy SSID i hasło są poprawne");
        Serial.println("2. Czy router jest w zasięgu");
        Serial.println("3. Czy router nie blokuje nowych urządzeń");
    }
}

// Funkcja do resetowania czujnika
void resetSensor()
{
    // Zerowanie offsetów do aktualnej pozycji używając surowych danych z czujnika
    if (imu.getSensorData() == BMI2_OK)
    {
        offsetX = atan2(imu.data.accelX, sqrt(imu.data.accelY * imu.data.accelY + imu.data.accelZ * imu.data.accelZ)) * 180.0 / PI;
        offsetY = -atan2(imu.data.accelY, sqrt(imu.data.accelX * imu.data.accelX + imu.data.accelZ * imu.data.accelZ)) * 180.0 / PI;
        Serial.println("Czujnik zresetowany");
    }
    else
    {
        Serial.println("Błąd resetowania czujnika");
    }
}

// Obsługa wydarzeń WebSocket
void webSocketEvent(uint8_t num, WStype_t type, uint8_t *payload, size_t length)
{
    switch (type)
    {
    case WStype_DISCONNECTED:
        Serial.printf("[%u] Disconnected!\n", num);
        break;
    case WStype_CONNECTED:
    {
        IPAddress ip = webSocket.remoteIP(num);
        Serial.printf("[%u] Connected from %d.%d.%d.%d url: %s\n", num, ip[0], ip[1], ip[2], ip[3], payload);
        // Wysyłamy potwierdzenie połączenia
        DynamicJsonDocument doc(200);
        doc["type"] = "connection";
        doc["status"] = "connected";
        String output;
        serializeJson(doc, output);
        webSocket.sendTXT(num, output);
    }
    break;
    case WStype_TEXT:
    {
        Serial.printf("[%u] get Text: %s\n", num, payload);
        // Próba parsowania JSON
        DynamicJsonDocument doc(200);
        DeserializationError error = deserializeJson(doc, payload);

        if (error)
        {
            Serial.println("Błąd parsowania JSON");
            return;
        }

        // Sprawdzamy typ komendy
        if (doc.containsKey("type"))
        {
            String commandType = doc["type"].as<String>();

            if (commandType == "setSensitivity")
            {
                int newSensitivity = doc["value"];
                Serial.printf("Nowa czułość: %d\n", newSensitivity);
                config.sensitivity = newSensitivity;
                // Wysyłanie potwierdzenia
                DynamicJsonDocument response(200);
                response["type"] = "commandResponse";
                response["command"] = "setSensitivity";
                response["status"] = "success";
                response["value"] = newSensitivity;
                String output;
                serializeJson(response, output);
                webSocket.sendTXT(num, output);
            }
            else if (commandType == "reset")
            {
                Serial.println("Resetowanie czujnika...");
                resetSensor();
                // Wysyłanie potwierdzenia
                DynamicJsonDocument response(200);
                response["type"] = "commandResponse";
                response["command"] = "reset";
                response["status"] = "success";
                String output;
                serializeJson(response, output);
                webSocket.sendTXT(num, output);
            }
        }
    }
    break;
    case WStype_BIN:
    case WStype_ERROR:
    case WStype_FRAGMENT_TEXT_START:
    case WStype_FRAGMENT_BIN_START:
    case WStype_FRAGMENT:
    case WStype_FRAGMENT_FIN:
        break;
    }
}

// Wysyłanie danych przez WebSocket
void sendSensorData()
{
    StaticJsonDocument<JSON_BUFFER_SIZE> doc;

    doc["type"] = "sensorData";
    doc["accX"] = accX + offsetX;
    doc["accY"] = accY + offsetY;
    doc["accZ"] = accZ;
    doc["gyroX"] = gyroX;
    doc["gyroY"] = gyroY;
    doc["gyroZ"] = gyroZ;
    doc["timestamp"] = millis();

    String jsonString;
    serializeJson(doc, jsonString);
    webSocket.broadcastTXT(jsonString);
}

void setup()
{
    Serial.begin(115200);
    Serial.println(VERSION_STRING);

    // Inicjalizacja danych WiFi
    strcpy(ssid, DEFAULT_SSID);
    strcpy(password, DEFAULT_PASSWORD);

    Serial.println("\nInicjalizacja WiFi:");
    Serial.print("SSID: '");
    Serial.print(ssid);
    Serial.println("'");
    Serial.print("Długość SSID: ");
    Serial.println(strlen(ssid));

    // Inicjalizacja I2C
    Wire.begin();

    // Inicjalizacja BMI270
    while (imu.beginI2C(i2cAddress) != BMI2_OK)
    {
        Serial.println("Error: BMI270 not connected, check wiring and I2C address!");
        delay(1000);
    }
    Serial.println("BMI270 connected!");

    // Inicjalizacja WiFi
    loadWiFiConfig(); // Załaduj zapisaną konfigurację WiFi
    setupWiFi();

    // Inicjalizacja WebSocket
    webSocket.begin();
    webSocket.onEvent(webSocketEvent);
    Serial.print("WebSocket Server started on ws://");
    Serial.print(localIP);
    Serial.println(":81");
}

void loop()
{
    webSocket.loop();
    server.handleClient();

    if (imu.getSensorData() == BMI2_OK)
    {
        // Przetwarzanie danych
        float rawAccX = imu.data.accelX;
        float rawAccY = imu.data.accelY;
        float rawAccZ = imu.data.accelZ;

        // Obliczanie kątów z uwzględnieniem czułości
        float angleX = (atan2(rawAccX, sqrt(rawAccY * rawAccY + rawAccZ * rawAccZ)) * 180.0 / PI - offsetX) * config.sensitivity;
        float angleY = (-atan2(rawAccY, sqrt(rawAccX * rawAccX + rawAccZ * rawAccZ)) * 180.0 / PI - offsetY) * config.sensitivity;

        // Tworzenie JSON
        DynamicJsonDocument doc(200);
        doc["type"] = "sensorData";
        doc["accX"] = rawAccX;
        doc["accY"] = rawAccY;
        doc["accZ"] = rawAccZ;
        doc["angleX"] = angleX;
        doc["angleY"] = angleY;
        doc["timestamp"] = millis();

        String output;
        serializeJson(doc, output);
        webSocket.broadcastTXT(output);
    }
    delay(100);
}

void handleConfig()
{
    server.send(200, "text/html", config_html);
}

void handleSave()
{
    String ssid = server.arg("ssid");
    String password = server.arg("password");

    saveWiFiConfig();

    server.send(200, "text/html", "Konfiguracja zapisana. Restart urządzenia...");
    delay(2000);
    ESP.restart();
}

void handleRoot()
{
    server.send(200, "text/html", index_html);
}

void handleData()
{
    if (imu.getSensorData() == BMI2_OK)
    {
        String json = "{\"angleX\":" + String(accX) + ",\"angleY\":" + String(accY) + "}";
        server.send(200, "application/json", json);
    }
    else
    {
        String json = "{\"error\": \"Brak polaczenia z czujnikiem BMI270\"}";
        server.send(200, "application/json", json);
    }
}

void handleReset()
{
    // Zerowanie offsetów do aktualnej pozycji używając surowych danych z czujnika
    offsetX = atan2(imu.data.accelX, sqrt(imu.data.accelY * imu.data.accelY + imu.data.accelZ * imu.data.accelZ)) * 180.0 / PI;
    offsetY = -atan2(imu.data.accelY, sqrt(imu.data.accelX * imu.data.accelX + imu.data.accelZ * imu.data.accelZ)) * 180.0 / PI;

    // Aktualizuj zmienne globalne na 0
    accX = 0;
    accY = 0;

    server.send(200, "text/plain", "Sensor zerowany");
}

void handleResetWiFi()
{
    // Wyczyść dane WiFi z EEPROM
    EEPROM.begin(EEPROM_SIZE);
    for (int i = 0; i < 32; i++)
    {
        EEPROM.write(SSID_ADDR + i, 0);
    }
    for (int i = 0; i < 64; i++)
    {
        EEPROM.write(PASS_ADDR + i, 0);
    }
    EEPROM.commit();

    server.send(200, "text/plain", "Resetowanie ustawień WiFi...");
    delay(2000);
    ESP.restart();
}
