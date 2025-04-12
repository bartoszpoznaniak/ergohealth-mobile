import websocket
import json

def on_message(ws, message):
    print("Otrzymano:", message)

def on_error(ws, error):
    print("Błąd:", error)

def on_close(ws):
    print("Zamknięto")

def on_open(ws):
    print("Połączono")

ws = websocket.WebSocketApp("ws://192.168.2.213:81",
                          on_message=on_message,
                          on_error=on_error,
                          on_close=on_close,
                          on_open=on_open)

print("Uruchamiam połączenie...")
ws.run_forever() 