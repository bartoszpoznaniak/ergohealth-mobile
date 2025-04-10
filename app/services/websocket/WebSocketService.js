import WebSocket from 'react-native-websocket';
import { CONNECTION_STATES } from './WebSocketStates';
import { fetch } from 'react-native-fetch-api';

class WebSocketService {
    constructor() {
        console.log('=== WebSocketService constructor ===');
        console.log('Initializing WebSocket service...');
        this.ws = null;
        this.connectionState = CONNECTION_STATES.DISCONNECTED;
        this.onMessageCallback = null;
        this.onStateChangeCallback = null;
        this.connectionAttempts = 0;
        this.maxAttempts = 3;
        this.connectionTimeout = 5000; // 5 sekund
        this.connectionTimer = null;
        this.isDestroyed = false;
        this.ipAddress = null;
        this.maxRetries = 3;
        this.retryDelay = 2000; // 2 sekundy
        console.log('WebSocket service initialized');
    }

    // Inicjalizacja połączenia WebSocket
    async connect(ipAddress) {
        console.log('=== WebSocketService.connect ===');
        console.log('Attempting to connect to:', ipAddress);

        if (this.isDestroyed) {
            console.error('Service is destroyed, cannot connect');
            return;
        }

        if (!ipAddress) {
            console.error('IP address is required');
            this._updateConnectionState(CONNECTION_STATES.ERROR);
            return;
        }

        // Najpierw zamknij istniejące połączenie
        if (this.ws && typeof this.ws.close === 'function') {
            console.log('Closing existing WebSocket connection');
            try {
                this.ws.close();
            } catch (error) {
                console.error('Error closing existing connection:', error);
            }
        }
        this.ws = null;

        this._updateConnectionState(CONNECTION_STATES.CONNECTING);
        this.connectionAttempts = 0;
        this.ipAddress = ipAddress;

        console.log('Starting connection attempt in 1 second...');
        // Opóźnij próbę połączenia o 1 sekundę
        setTimeout(() => {
            if (!this.isDestroyed) {
                console.log('Starting connection attempt now...');
                this._attemptConnection(1);
            }
        }, 1000);
    }

    async _testHttpConnection(ipAddress) {
        try {
            console.log('Testing HTTP connection to:', `http://${ipAddress}`);
            console.log('Current WiFi network:', 'ASUS');
            console.log('Please make sure:');
            console.log('1. You are connected to ASUS WiFi network');
            console.log('2. ESP32 is powered on and connected to ASUS network');
            console.log('3. You can see ESP32 in your network');

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`http://${ipAddress}`, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Accept': '*/*',
                    'Connection': 'keep-alive'
                }
            }).catch(error => {
                console.error('HTTP test failed with error:', error);
                console.log('Error type:', error.name);
                console.log('Error message:', error.message);
                if (error.message.includes('Network request failed')) {
                    console.log('⚠️ Please check your WiFi connection to ASUS network');
                }
                throw error;
            });

            clearTimeout(timeout);
            console.log('HTTP test response status:', response.status);
            console.log('HTTP test response headers:', response.headers);

            if (response.status !== 200) {
                console.log('HTTP test failed with status:', response.status);
                return false;
            }

            return true;
        } catch (error) {
            console.error('HTTP test failed:', error);
            if (error.name === 'AbortError') {
                console.log('⚠️ HTTP request timed out - ESP32 might be offline or not responding');
                console.log('Please check if ESP32 is powered on and connected to ASUS network');
            } else if (error.message.includes('Network request failed')) {
                console.log('⚠️ Network request failed - check WiFi connection');
                console.log('Make sure you are connected to ASUS network');
            } else {
                console.log('⚠️ Unknown error during HTTP test:', error);
            }
            return false;
        }
    }

    async _attemptConnection(attempt) {
        console.log(`=== Attempting WebSocket connection (${attempt}/${this.maxRetries}) ===`);
        console.log('Current state:', {
            isDestroyed: this.isDestroyed,
            connectionState: this.connectionState,
            ipAddress: this.ipAddress
        });

        if (this.isDestroyed) {
            console.log('Service is destroyed, aborting connection attempt');
            return;
        }

        if (!this.ipAddress) {
            console.error('No IP address available for connection');
            this._updateConnectionState(CONNECTION_STATES.ERROR);
            return;
        }

        const wsUrl = `ws://${this.ipAddress}:81`;
        console.log('Connecting to:', wsUrl);

        try {
            this.ws = new WebSocket(wsUrl);
            console.log('WebSocket instance created');

            // Zwiększ timeout do 10 sekund
            const connectionTimeout = setTimeout(() => {
                console.log('Connection timeout reached');
                if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
                    console.log('Closing timed out connection');
                    this.ws.close();
                    this.ws = null;
                    this._handleConnectionFailure(attempt);
                }
            }, 10000); // 10 sekund timeout

            this.ws.onopen = () => {
                console.log('WebSocket connection opened');
                clearTimeout(connectionTimeout);
                this._updateConnectionState(CONNECTION_STATES.CONNECTED);
                this.connectionAttempts = 0;
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket connection closed:', {
                    code: event.code,
                    reason: event.reason,
                    wasClean: event.wasClean
                });
                clearTimeout(connectionTimeout);
                this._handleConnectionFailure(attempt);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                clearTimeout(connectionTimeout);
                this._handleConnectionFailure(attempt);
            };

            this.ws.onmessage = (event) => {
                console.log('WebSocket message received:', event.data);
                if (this.onMessageCallback) {
                    this.onMessageCallback(event.data);
                }
            };
        } catch (error) {
            console.error('Error creating WebSocket:', error);
            this._handleConnectionFailure(attempt);
        }
    }

    // Wysyłanie komendy konfiguracji
    sendConfiguration(maxAngle, samplingRate) {
        console.log('sendConfiguration called:', { maxAngle, samplingRate });

        if (this.isDestroyed) {
            console.error('Service is destroyed, cannot send configuration');
            throw new Error('WebSocket service is destroyed');
        }

        if (this.connectionState !== CONNECTION_STATES.CONNECTED) {
            const error = 'WebSocket is not connected';
            console.error(error);
            throw new Error(error);
        }

        if (!this.ws || typeof this.ws.send !== 'function') {
            const error = 'WebSocket instance is not available or send method is not a function';
            console.error(error);
            throw new Error(error);
        }

        const configMessage = {
            command: 'configure',
            maxAngle: maxAngle,
            samplingRate: samplingRate
        };

        console.log('Sending message:', configMessage);
        this.ws.send(JSON.stringify(configMessage));
    }

    // Wysyłanie komendy kalibracji
    sendCalibration() {
        console.log('sendCalibration called');

        if (this.isDestroyed) {
            console.error('Service is destroyed, cannot send calibration');
            throw new Error('WebSocket service is destroyed');
        }

        if (this.connectionState !== CONNECTION_STATES.CONNECTED) {
            const error = 'WebSocket is not connected';
            console.error(error);
            throw new Error(error);
        }

        if (!this.ws || typeof this.ws.send !== 'function') {
            const error = 'WebSocket instance is not available or send method is not a function';
            console.error(error);
            throw new Error(error);
        }

        const calibrationMessage = {
            command: 'calibrate'
        };

        console.log('Sending message:', calibrationMessage);
        this.ws.send(JSON.stringify(calibrationMessage));
    }

    // Ustawienie callback'a dla otrzymywanych wiadomości
    onMessage(callback) {
        console.log('Setting message callback');
        this.onMessageCallback = callback;
    }

    // Ustawienie callback'a dla zmian stanu połączenia
    onStateChange(callback) {
        console.log('Setting state change callback');
        this.onStateChangeCallback = callback;
    }

    // Zamknięcie połączenia
    disconnect() {
        console.log('Disconnecting WebSocket');
        if (this.connectionTimer) {
            clearTimeout(this.connectionTimer);
            this.connectionTimer = null;
        }
        if (this.ws && typeof this.ws.close === 'function') {
            try {
                this.ws.close();
            } catch (error) {
                console.error('Error while closing WebSocket:', error);
            }
            this.ws = null;
        }
    }

    // Zniszczenie serwisu
    destroy() {
        console.log('=== WebSocketService destroy called ===');
        console.log('Current state before destroy:', {
            isDestroyed: this.isDestroyed,
            connectionState: this.connectionState,
            hasWebSocket: !!this.ws,
            wsType: this.ws ? typeof this.ws : 'undefined'
        });

        this.isDestroyed = true;

        if (this.ws && typeof this.ws.close === 'function') {
            console.log('Closing WebSocket connection');
            try {
                if (this.ws.readyState === WebSocket.OPEN) {
                    this.ws.close();
                }
            } catch (error) {
                console.error('Error closing WebSocket:', error);
            }
        }
        this.ws = null;

        this.onMessageCallback = null;
        this.onStateChangeCallback = null;
        console.log('WebSocket service destroyed');
    }

    // Aktualizacja stanu połączenia
    _updateConnectionState(newState) {
        console.log('Connection state changed to:', newState);
        this.connectionState = newState;
        if (this.onStateChangeCallback && !this.isDestroyed) {
            this.onStateChangeCallback(newState);
        }
    }

    // Pobranie aktualnego stanu połączenia
    getConnectionState() {
        return this.connectionState;
    }

    _handleConnectionSuccess() {
        this._updateConnectionState(CONNECTION_STATES.CONNECTED);
        this.connectionAttempts = 0;
    }

    _handleConnectionError(error) {
        this._updateConnectionState(CONNECTION_STATES.ERROR);
        if (this.onStateChangeCallback && !this.isDestroyed) {
            this.onStateChangeCallback(CONNECTION_STATES.ERROR);
        }
        if (!this.isDestroyed) {
            setTimeout(() => this._attemptConnection(1), this.retryDelay);
        }
    }

    _handleConnectionFailure(attempt) {
        this._updateConnectionState(CONNECTION_STATES.ERROR);
        if (this.onStateChangeCallback && !this.isDestroyed) {
            this.onStateChangeCallback(CONNECTION_STATES.ERROR);
        }
        if (!this.isDestroyed) {
            setTimeout(() => this._attemptConnection(attempt + 1), this.retryDelay);
        }
    }
}

// Eksport singletona
export default new WebSocketService();
export { CONNECTION_STATES }; 