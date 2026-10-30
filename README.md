# PLEN Motion Editor: New Look

A refreshed software kit for the **PLEN 1.4** humanoid robot:

- **Anim8**: a new 3D motion editor (Three.js) that talks to the robot over USB from Chrome or Edge.
- **Control server**: the PLEN control server ported to Python 3, with the PLEN Utils calibration page built in.
- **Updated firmware** for PLEN's Arduino Micro.
- **New head board**: an ESP32-C3 + RS-485 bridge that replaces the original head board.
- **Motions**: the 90 stock PLEN 1.4 motions plus a few custom ones.

Everything adds a 19th servo: **Neck Yaw on servo rail #9**.

---

> [!WARNING]
> **This only works on a modified PLEN 1.4. Read this before flashing anything.**
>
> This kit assumes your robot has **all** of these changes:
>
> 1. **Modified firmware.** The Arduino Micro runs the firmware in [`firmware/updated_firmware`](firmware/updated_firmware), **not** the stock firmware from PLEN Project Company's GitHub. The stock firmware has no neck servo and does not read commands from the new head board.
> 2. **New head board.** The original head board is removed and replaced with an **ESP32-C3 SuperMini + MAX3485 RS-485 transceiver** running [`head-board/ESP32_MAX3485`](head-board/ESP32_MAX3485). See [Head board wiring](#head-board-wiring).
> 3. **Neck servo (optional).** A servo plugged into **servo rail #9** turns the head. Without it, everything else works and neck commands simply do nothing.
>
> **Stock PLEN 1.4 or PLEN2?** Use the official software from PLEN Project Company instead. This kit is untested on unmodified robots.
>
> Flashing firmware always carries some risk. Keep the stock firmware handy so you can go back.

---

## What's in this repository

| Folder | What it is | Runs on |
|---|---|---|
| [`anim8/`](anim8) | Anim8 motion editor (3D model, timeline, live control over USB) | Chrome or Edge on your PC |
| [`control-server/control_server/`](control-server/control_server) | PLEN control server, Python 3 | Your PC (port 17264) |
| [`control-server/control_server_gui/`](control-server/control_server_gui) | PLEN Utils page (calibration, motion install), served by the control server | Your browser |
| [`control-server/sdk/`](control-server/sdk) | Original PLEN SDK files, kept for reference | Windows |
| [`firmware/updated_firmware/`](firmware/updated_firmware) | Updated PLEN firmware v1.4.1 (PLEN 1.4 target, 19 servos) | PLEN's Arduino Micro |
| [`head-board/ESP32_MAX3485/`](head-board/ESP32_MAX3485) | Bluetooth LE to RS-485 bridge for the new head board | ESP32-C3 SuperMini |
| [`motions/`](motions) | `motion-plen1.4/` (90 stock motions) and `Custom Movements/` | Load into Anim8 or the Utils page |
| [`setup.ps1`](setup.ps1) | Installs everything this repository needs on Windows | PowerShell |

## Quick start (Windows)

### 1. Get the files

Click **Code > Download ZIP** on GitHub and unzip it, or clone it:

```powershell
git clone https://github.com/slightly-engineered/Plen-Motion-Editor-New-Look.git
cd Plen-Motion-Editor-New-Look
```

### 2. Install the prerequisites

Open PowerShell in the repository folder and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

It checks for each item and asks before installing anything:

- Arduino IDE 2
- Arduino AVR boards (for the Arduino Micro) and ESP32 boards (for the head board)
- Python 3.9 or newer
- A private Python environment (`.venv`) inside `control-server/control_server` with bottle, gevent, gevent-websocket and pyserial

Useful options:

| Command | What it does |
|---|---|
| `.\setup.ps1 -CheckOnly` | Only reports what is missing. Installs nothing. |
| `.\setup.ps1 -Yes` | Installs everything required without asking. |

Run it again at any time. Anything already installed is skipped.

The `.venv` folder keeps the control server's Python packages separate from the rest of your PC. Deleting the folder removes them, and `setup.ps1` can recreate it.

### 3. Flash PLEN's Arduino Micro

1. Plug PLEN into your PC with USB.
2. In Arduino IDE, open `firmware/updated_firmware/updated_firmware.ino`.
3. Select **Tools > Board > Arduino AVR Boards > Arduino Micro** and PLEN's COM port.
4. Click **Upload**.

### 4. Flash the head board (ESP32-C3)

1. In Arduino IDE, open `head-board/ESP32_MAX3485/ESP32_MAX3485.ino`.
2. Select **Tools > Board > esp32 > ESP32C3 Dev Module** and set **USB CDC On Boot** to **Enabled**.
3. Select the ESP32-C3's COM port and click **Upload**.

It advertises over Bluetooth LE as **PLEN**.

### 5. Calibrate with the Utils page

1. Double-click `control-server/control_server/launch.bat`. It starts the server and opens <http://localhost:17264/>.
2. Click **Connect**.
3. Click a joint on the robot diagram (including **Neck Yaw**), set the angle, then use **Home**, **Min** and **Max** to save calibration.

Keep the server window open while you use the page. Close it to stop the server.

### 6. Make motions with Anim8

1. Close the control server first. Only one program can use PLEN's COM port at a time.
2. Double-click `anim8/launch.bat`. It serves Anim8 at <http://localhost:8000> and opens it.
3. Use **Chrome or Edge** (Web Serial is required). Connect, pick PLEN's COM port, and pose the robot.
4. Load motions from `motions/` to edit or play them.

## Differences from the original PLEN software

| Part | Original (PLEN Project Company) | This repository |
|---|---|---|
| Control server | Python 2.7 | Python 3 (byte-string serial protocol) |
| Utils page | Separate GUI project | Served by the control server at `http://localhost:17264/` |
| Servos | 18 | 19: adds **Neck Yaw** (`neck_yaw` maps to servo **9** in `device_map.json`) |
| Utils joint diagram | No neck | **Neck Yaw** is selectable |
| Server logs | Fails if `logs/` is missing | `logs/` is created automatically |
| `launch.bat` | Uses system Python and Chrome | Uses `.venv` if present, opens your default browser |
| Firmware | Stock PLEN2 firmware | v1.4.1, PLEN 1.4 target, `NECK_YAW = 9`, reads commands arriving over RS-485 from the new head board |
| Head board | Original head board | ESP32-C3 SuperMini + MAX3485 (Bluetooth LE to RS-485) |
| Motion editor | AngularJS editor | Anim8: Three.js 3D editor, direct USB (Web Serial, 115200 baud), 19 servos |

## Head board wiring

| ESP32-C3 SuperMini | MAX3485 | Purpose |
|---|---|---|
| GPIO 6 | DI | RS-485 transmit |
| GPIO 5 | RO | RS-485 receive |
| GPIO 4 | DE and RE (tied together) | High = transmit, low = receive |
| 3V3 | VCC | 3.3 V supply |
| GND | GND | Common ground with PLEN |

Connect the MAX3485 **A** and **B** lines to the RS-485 lines where the original head board connected.

How it works: a Bluetooth LE app or web page writes text to the Nordic UART service (RX characteristic `6e400002-b5a3-f393-e0a9-e50e24dcca9e`). The ESP32-C3 echoes it back on the TX characteristic and forwards it to the Arduino Micro over RS-485 at 115200 baud. Transmit mode is held for 2 seconds after each write.

## Neck servo (rail #9): test status

| Check | Result |
|---|---|
| Neck Yaw appears in the Utils joint diagram | Verified |
| Selecting it sets **Joint Name: Neck Yaw** | Verified |
| Server turns a Neck Yaw command into a device-9 packet (`$AN09…`) | Verified |
| Firmware defines `NECK_YAW = 9` | Verified |
| A servo on rail #9 physically moves | **Not yet tested on hardware** |

## Troubleshooting

| Problem | Fix |
|---|---|
| "running scripts is disabled on this system" | Use the full command from step 2 (`-ExecutionPolicy Bypass`). It only applies to that run. |
| Utils page shows "The control-server hasn't run." | Start `control-server/control_server/launch.bat` and keep its window open. |
| "USB connection has been disconnected!" | PLEN isn't plugged in, or another program (Anim8, Arduino IDE serial monitor) has the COM port. Close it and click **Connect** again. |
| "Firmware version of your PLEN is old" | Flash `firmware/updated_firmware` (step 3). |
| Anim8 can't find a serial port | Use Chrome or Edge. Firefox and Safari don't support Web Serial. |
| Anim8's head doesn't move in 3D | Known issue: the `head` object is missing from `anim8/assets/glb/robot_v2.glb`. Rename the head object to exactly `head` in Blender and re-export. |
| Firmware install from the server fails | `control-server/control_server/config.json` points to `C:/workdir/app/Arduino/arduino.exe`. Change it to your Arduino install, or flash with Arduino IDE (step 3). |

## Credits and license

The control server, the Utils page, the SDK and the firmware are based on the open-source PLEN software by **Kazuyuki TAKASE and PLEN Project Company Inc.**, released under the MIT License. Anim8 is a rewrite inspired by their motion editor. See [NOTICE.md](NOTICE.md).

Changes and new parts in this repository are released under the [MIT License](LICENSE).
