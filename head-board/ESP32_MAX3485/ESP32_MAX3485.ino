#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ===============================
// Nordic UART Service UUIDs (NUS)
// ===============================
#define SERVICE_UUID            "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID_RX  "6e400002-b5a3-f393-e0a9-e50e24dcca9e"  // Web → ESP32
#define CHARACTERISTIC_UUID_TX  "6e400003-b5a3-f393-e0a9-e50e24dcca9e"  // ESP32 → Web

BLECharacteristic* txChar;

// ===============================
// RS‑485 PINS (ESP32‑C3 Super Mini)
// ===============================
#define RS485_TX_PIN  6   // DI → MAX485 DI
#define RS485_RX_PIN  5   // RO → MAX485 RO
#define RS485_EN_PIN  4   // DE+RE tied together

// ===============================
// BLE Server Callbacks
// ===============================
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* server) override {
    Serial.println("BLE Connected");
  }

  void onDisconnect(BLEServer* server) override {
    Serial.println("BLE Disconnected — restarting advertising");

    // Put RS‑485 back to receive / safe state
    digitalWrite(RS485_EN_PIN, LOW);

    delay(200);  // small debounce for Bluefy / iOS

    // Restart advertising so the device shows up again in the scanner
    BLEDevice::startAdvertising();
  }
};

// ===============================
// BLE RX Callback
// ===============================
class RXCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* characteristic) override {
    String value = characteristic->getValue();

    if (value.length() > 0) {
      Serial.print("BLE Received: ");
      Serial.println(value);

      // Echo back to browser
      txChar->setValue(value);
      txChar->notify();

      // Debug
      Serial.print("RS485 TX: ");
      Serial.println(value);

      // ===============================
      // RS‑485 TRANSMIT WINDOW
      // Hold DE/RE HIGH for 2 seconds
      // ===============================
      digitalWrite(RS485_EN_PIN, HIGH);
      Serial.println("RS485_EN_PIN = HIGH (TX MODE)");

      // Send data
      Serial1.print(value);
      Serial1.flush();

      // Keep TX enabled long enough for your wiring / MAX485 behavior
      delay(2000);

      digitalWrite(RS485_EN_PIN, LOW);
      Serial.println("RS485_EN_PIN = LOW (RX MODE)");
    }
  }
};

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("=== ESP32‑C3 BLE UART (PLEN) + RS485 ===");

  // ===============================
  // RS‑485 UART Setup
  // ===============================
  pinMode(RS485_EN_PIN, OUTPUT);
  digitalWrite(RS485_EN_PIN, LOW);  // default to receive

  Serial1.begin(115200, SERIAL_8N1, RS485_RX_PIN, RS485_TX_PIN);

  // ===============================
  // BLE Setup
  // ===============================
  BLEDevice::init("PLEN");

  BLEServer* server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService* service = server->createService(SERVICE_UUID);

  // RX characteristic (Web → ESP32)
  BLECharacteristic* rxChar = service->createCharacteristic(
    CHARACTERISTIC_UUID_RX,
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_WRITE_NR
  );
  rxChar->setCallbacks(new RXCallback());

  // TX characteristic (ESP32 → Web)
  txChar = service->createCharacteristic(
    CHARACTERISTIC_UUID_TX,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  txChar->addDescriptor(new BLE2902());

  service->start();

  // Start advertising
  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->setScanResponse(true);
  adv->setMinPreferred(0x06);
  adv->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("BLE advertising as 'PLEN'");
}

void loop() {
  // BLE is event-driven — nothing needed here
}
