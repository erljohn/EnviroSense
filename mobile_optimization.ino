#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <SPIFFS.h>
#include "DHT.h"

// ====== SENSOR SETUP ======
#define DHTPIN 4
#define DHTTYPE DHT11
#define PIRPIN 5
DHT dht(DHTPIN, DHTTYPE);
bool motionDetected = false;

int animationMode = 0;        // 0 = Running, 1 = Bounce, 2 = Blink All, 3 = Alternate, 4 = Random
int direction = 1;            // For Bounce
bool blinkState = false;      // For Blink All
bool alternateState = false;  // For Alternate

unsigned long lastModeChange = 0;
const unsigned long modeInterval = 5000; // Change mode every 5 seconds


// ====== LED SETUP ======
const int ledPins[5] = {12, 13, 14, 26, 27};
const int ledCount = sizeof(ledPins) / sizeof(ledPins[0]);
int currentLED = 0;
bool runLeds = false;
unsigned long lastLedUpdate = 0;
const int ledDelay = 150;

// ====== WiFi ======
const char* ssid = "ESP32-Dashboard";
const char* password = "12345678";

// ====== Web Server ======
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// ====== SENSOR VALUES ======
float temperature = 0;
float humidity = 0;


// ==== Data Logging ====
#define MAX_LOGS 600   // keep last 600 entries (~10 minutes if 1s interval)

struct LogEntry {
  unsigned long timestamp;  
  float temperature;
  float humidity;
  bool motion;
};

LogEntry logs[MAX_LOGS];   // circular buffer
int logIndex = 0;



int getConnectedClients() {
  return WiFi.softAPgetStationNum();
}

void notifyClients() {
  int clients = getConnectedClients();
  String json = "{\"temperature\":" + String(temperature, 1) +
                ",\"humidity\":" + String(humidity, 1) +
                ",\"motion\":" + String(motionDetected ? 1 : 0) +
                ",\"clients\":" + String(clients) +
                ",\"runLeds\":" + String(runLeds ? 1 : 0) +
                ",\"mode\":" + String(animationMode) + "}";
  ws.textAll(json);
}

void onWebSocketMessage(AsyncWebSocket *server, AsyncWebSocketClient *client,
                        AwsEventType type, void *arg, uint8_t *data, size_t len) {
  if (type == WS_EVT_DATA) {
    String msg = "";
    for (size_t i = 0; i < len; i++) msg += (char)data[i];

    if (msg == "RUN_LEDS") {
      runLeds = true;
      notifyClients();   // <-- broadcast new state
    } 
    else if (msg == "STOP_LEDS") {
      runLeds = false;
      for (int i = 0; i < ledCount; i++) digitalWrite(ledPins[i], LOW);
      notifyClients();   // <-- broadcast new state
    } 
    else if (msg.startsWith("MODE_")) {
      animationMode = msg.substring(5).toInt();
      notifyClients();   // <-- broadcast new state
    }
    else if (msg == "GET_STATE") {
      // Send current state just to this client
      String json = "{\"temperature\":" + String(temperature, 1) +
                    ",\"humidity\":" + String(humidity, 1) +
                    ",\"motion\":" + String(motionDetected ? 1 : 0) +
                    ",\"clients\":" + String(getConnectedClients()) +
                    ",\"runLeds\":" + String(runLeds ? 1 : 0) +
                    ",\"mode\":" + String(animationMode) + "}";
      client->text(json);
    }
  }
}


void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client,
             AwsEventType type, void *arg, uint8_t *data, size_t len) {
  if (type == WS_EVT_CONNECT) {
    Serial.printf("Client connected: %u\n", client->id());
    // Send current state only to the new client
    onWebSocketMessage(server, client, WS_EVT_DATA, arg, (uint8_t*)"GET_STATE", 9);
  } else if (type == WS_EVT_DISCONNECT) {
    Serial.printf("Client disconnected: %u\n", client->id());
    notifyClients();
  } else if (type == WS_EVT_DATA) {
    onWebSocketMessage(server, client, type, arg, data, len);
  }
}


void setup() {
  Serial.begin(115200);
  dht.begin();
  pinMode(PIRPIN, INPUT);

  for (int i = 0; i < ledCount; i++) {
    pinMode(ledPins[i], OUTPUT);
    digitalWrite(ledPins[i], LOW);
  }

  if (!SPIFFS.begin(true)) {
    Serial.println("SPIFFS mount failed");
    return;
  }

  WiFi.softAP(ssid, password);
  Serial.print("AP IP: ");
  Serial.println(WiFi.softAPIP());

  ws.onEvent(onEvent);
  server.addHandler(&ws);
  server.serveStatic("/", SPIFFS, "/").setDefaultFile("index.html");
  server.begin();
}

unsigned long lastMotionUpdate = 0;
unsigned long lastTempHumRead = 0;
unsigned long lastNotify = 0;

void loop() {
  ws.cleanupClients();
  unsigned long now = millis();

  // Motion sensor
  if (now - lastMotionUpdate > 1000) {
    static bool lastMotion = false;
    if (digitalRead(PIRPIN) == HIGH) {
      lastMotion = true;
    }
    motionDetected = lastMotion;
    lastMotion = false;
    lastMotionUpdate = now;
  }

  // DHT sensor
  if (now - lastTempHumRead > 2000) {
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t)) temperature = t;
    if (!isnan(h)) humidity = h;
    lastTempHumRead = now;
  }

  // Notify clients
  if (now - lastNotify > 1000) {
    notifyClients();
    lastNotify = now;
  }

  // ===== LED Animation with Auto-Cycle =====
if (runLeds && now - lastLedUpdate > ledDelay) {
  for (int i = 0; i < ledCount; i++) digitalWrite(ledPins[i], LOW);

  switch (animationMode) {
    case 0: // Running
      digitalWrite(ledPins[currentLED], HIGH);
      currentLED = (currentLED + 1) % ledCount;
      break;

    case 1: // Bounce (Ping-Pong)
      digitalWrite(ledPins[currentLED], HIGH);
      currentLED += direction;
      if (currentLED == 0 || currentLED == ledCount - 1) direction = -direction;
      break;

    case 2: // Blink All
      blinkState = !blinkState;
      for (int i = 0; i < ledCount; i++) digitalWrite(ledPins[i], blinkState ? HIGH : LOW);
      break;

    case 3: // Alternate (Odd/Even)
      for (int i = 0; i < ledCount; i++) {
        if ((i % 2) == alternateState) digitalWrite(ledPins[i], HIGH);
      }
      alternateState = !alternateState;
      break;

    case 4: // Random LED Blink
      digitalWrite(ledPins[random(ledCount)], HIGH);
      break;
  }

  lastLedUpdate = now;
}

// ===== Auto-cycle animations every 5 seconds =====
if (runLeds && now - lastModeChange > modeInterval) {
  animationMode = (animationMode + 1) % 5; // Cycle through 0 to 4
  lastModeChange = now;
}
}
