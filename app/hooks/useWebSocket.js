import { useState, useEffect, useCallback } from 'react';
import WebSocketService, { CONNECTION_STATES } from '../services/websocket/WebSocketService';

export const useWebSocket = (ipAddress) => {
    console.log('=== useWebSocket hook called ===');
    console.log('IP Address:', ipAddress);

    const [connectionState, setConnectionState] = useState(CONNECTION_STATES.DISCONNECTED);
    const [sensorData, setSensorData] = useState(null);
    const [error, setError] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);

    console.log('Initial state:', {
        connectionState,
        hasSensorData: !!sensorData,
        error,
        isInitialized
    });

    // Obsługa wiadomości przychodzących
    const handleMessage = useCallback((data) => {
        console.log('=== handleMessage called ===');
        console.log('Received data:', data);

        try {
            if (!data || typeof data !== 'object') {
                console.error('Nieprawidłowe dane:', data);
                return;
            }

            if (data.type === 'sensorData') {
                console.log('Processing sensor data');
                // Sprawdź, czy wszystkie wymagane pola istnieją
                const requiredFields = ['angleX', 'angleY', 'accX', 'accY', 'accZ'];
                const missingFields = requiredFields.filter(field => !(field in data));

                if (missingFields.length > 0) {
                    console.error('Brakujące pola w danych:', missingFields);
                    return;
                }

                setSensorData(data);
                console.log('Sensor data updated');
            } else if (data.type === 'calibration') {
                console.log('Calibration status:', data.status);
            }
        } catch (err) {
            console.error('Błąd podczas przetwarzania wiadomości:', err);
            setError('Błąd podczas przetwarzania danych z czujnika');
        }
    }, []);

    // Obsługa zmiany stanu połączenia
    const handleStateChange = useCallback((newState) => {
        console.log('=== handleStateChange called ===');
        console.log('New state:', newState);
        console.log('Previous state:', connectionState);

        setConnectionState(newState);
        if (newState === CONNECTION_STATES.ERROR) {
            console.error('Connection error occurred');
            setError('Błąd połączenia WebSocket');
        } else {
            setError(null);
        }
    }, [connectionState]);

    // Efekt do inicjalizacji połączenia
    useEffect(() => {
        console.log('=== useWebSocket useEffect ===');
        console.log('IP Address in effect:', ipAddress);

        if (!ipAddress) {
            console.log('No IP address provided, skipping initialization');
            return;
        }

        let initTimer;
        let isMounted = true;

        const initializeConnection = () => {
            if (!isMounted) {
                console.log('Component unmounted, skipping initialization');
                return;
            }

            console.log('Initializing WebSocket connection');
            WebSocketService.onMessage(handleMessage);
            WebSocketService.onStateChange(handleStateChange);
            WebSocketService.connect(ipAddress);
            setIsInitialized(true);
        };

        console.log('Starting initialization timer');
        initTimer = setTimeout(initializeConnection, 2000);

        return () => {
            console.log('=== useWebSocket cleanup ===');
            isMounted = false;
            clearTimeout(initTimer);

            // Nie niszczymy serwisu od razu, tylko gdy komponent jest faktycznie odmontowywany
            if (connectionState === CONNECTION_STATES.CONNECTED) {
                console.log('Cleaning up WebSocket connection');
                WebSocketService.destroy();
            }
        };
    }, [ipAddress, handleMessage, handleStateChange, connectionState]);

    // Metody do interakcji z WebSocket
    const sendConfiguration = useCallback((maxAngle, samplingRate) => {
        if (!isInitialized) {
            console.log('WebSocket not initialized yet');
            return;
        }

        try {
            WebSocketService.sendConfiguration(maxAngle, samplingRate);
        } catch (err) {
            console.error('Error sending configuration:', err);
            setError(err.message);
        }
    }, [isInitialized]);

    const sendCalibration = useCallback(() => {
        if (!isInitialized) {
            console.log('WebSocket not initialized yet');
            return;
        }

        try {
            WebSocketService.sendCalibration();
        } catch (err) {
            console.error('Error sending calibration:', err);
            setError(err.message);
        }
    }, [isInitialized]);

    return {
        connectionState,
        sensorData,
        error,
        sendConfiguration,
        sendCalibration
    };
}; 