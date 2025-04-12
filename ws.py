import websocket
import json
import time

def on_message(ws, message):
    print("Otrzymano:", message)

def on_error(ws, error):
    print("Błąd:", error)

def on_close(ws, close_status_code, close_msg):
    print("Połączenie zamknięte")

def on_open(ws):
    print("Połączono z WebSocket")
    # Wysyłamy komendę kalibracji
    ws.send(json.dumps({"command": "calibrate"}))

if __name__ == "__main__":
    websocket.enableTrace(True)
    ws = websocket.WebSocketApp("ws://192.168.2.213:81",
                              on_message=on_message,
                              on_error=on_error,
                              on_close=on_close,
                              on_open=on_open)
    
    ws.run_forever()