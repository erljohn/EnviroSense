# EnviroSense: Offline Air Quality Monitor and Security Box

A student-developed project for a private, local-network based environmental monitor and security solution.

### **Introduction**
The **EnviroSense** is a compact, all-in-one device designed to give you real-time data about the air quality and security of a room. It operates completely offline, ensuring your data remains private and secure.

### **Features**
* **Real-Time Monitoring:** Provides live temperature and humidity readings.
* **Motion Detection:** Uses a PIR sensor to detect movement within the room.
* **Offline Web Interface:** All data is accessible via a secure, local web page without needing an internet connection.
* **Discreet Design:** Housed in a compact, 3D-printed enclosure.

### **How It Works**
The **EnviroSense** is built around an **ESP32 microcontroller**. It continuously reads data from a **DHT11** temperature and humidity sensor and a **PIR** motion sensor. This data is then hosted on a local web server running directly on the ESP32. Users can connect to the device's dedicated Wi-Fi network to access the dashboard from a web browser on any device.

### **Technical Specifications**
| Component | Specification |
| :--- | :--- |
| **Microcontroller** | ESP32 WROOM 30 pins |
| **Power Input** | 5V DC via USB-C |
| **Sensors** | DHT11 (Temp/Humid), PIR (HC-SR501) |
| **Connectivity** | Wi-Fi (AP Mode) |

### **Components Needed**
To build the EnviroSense, you will need the following components:
* ESP32 WROOM 30 pins
* DHT11 Temperature & Humidity Sensor
* PIR Sensor HC-SR501
* 3D-printed case
* USB-C cable

### **Getting Started**
1.  **Assembly:** Mount the ESP32 and sensors into the 3D-printed case.
2.  **Wiring:** Connect the sensors to the ESP32 as follows:
    * **DHT11:** VCC -> 3V3, GND -> GND, Data -> GPIO 23
    * **PIR:** VCC -> 5V, GND -> GND, OUT -> GPIO 16
3.  **Power On:** Plug the device into a 5V power source using the USB-C cable.


