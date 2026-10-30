/*
    Copyright (c) 2015,
    - Kazuyuki TAKASE - https://github.com/Guvalif
    - PLEN Project Company Inc. - https://plen.jp

    This software is released under the MIT License.
    (See also : http://opensource.org/licenses/mit-license.php)
*/

#define DEBUG false

#include <Arduino.h>

#include "Pin.h"
#include "System.h"

#if DEBUG
    #include "Profiler.h"
#endif


#define PLEN2_SYSTEM_USBSERIAL Serial
#define PLEN2_SYSTEM_BLESERIAL Serial1   // repurposed for RS485 UART


void PLEN2::System::begin()
{
    // REMOVE BLE initialization (BLE module no longer present)
    // PLEN2_SYSTEM_BLESERIAL.begin(BLESERIAL_BAUDRATE);

    // USB debug serial stays the same
    PLEN2_SYSTEM_USBSERIAL.begin(USBSERIAL_BAUDRATE);

    // === NEW: Initialize RS485 UART ===
    // Serial1 is now the RS485 UART (TX=PD3, RX=PD2)
    Serial1.begin(115200);   // adjust later if needed

    pinMode(Pin::RS485_TXD, OUTPUT);   // DE/RE direction pin
    pinMode(Pin::LED_OUT,   OUTPUT);

    digitalWrite(Pin::RS485_TXD, LOW);   // RS485 receive mode
    digitalWrite(Pin::LED_OUT,   LOW);

    randomSeed( analogRead(Pin::RANDOM_DEVICE_IN) );
}


Stream& PLEN2::System::USBSerial()
{
    return PLEN2_SYSTEM_USBSERIAL;
}


Stream& PLEN2::System::BLESerial()
{
    // This now returns Serial1, which is our RS485 UART
    return PLEN2_SYSTEM_BLESERIAL;
}


Stream& PLEN2::System::inputSerial()
{
    // Input now comes from RS485 (Serial1)
    return PLEN2_SYSTEM_BLESERIAL;
}


Stream& PLEN2::System::outputSerial()
{
    return PLEN2_SYSTEM_USBSERIAL;
}

Stream& PLEN2::System::debugSerial()
{
    return PLEN2_SYSTEM_USBSERIAL;
}


void PLEN2::System::dump()
{
    #if DEBUG
        PROFILING("System::dump()");
    #endif

    outputSerial().println(F("{"));

    outputSerial().print(F("\t\"device\": \""));
    outputSerial().print(DEVICE());
    outputSerial().println(F("\","));

    outputSerial().print(F("\t\"codename\": \""));
    outputSerial().print(CODENAME());
    outputSerial().println(F("\","));

    outputSerial().print(F("\t\"version\": \""));
    outputSerial().print(VERSION());
    outputSerial().println(F("\""));

    outputSerial().println(F("}"));
}


void PLEN2::System::welcome()
{
    #if DEBUG
        PROFILING("System::welcome()");
    #endif

    outputSerial().println(
        F("Hello, I am PLEN! My system is up and running ver." FIRMWARE_VERSION ", Let me walk :)")
    );
}
