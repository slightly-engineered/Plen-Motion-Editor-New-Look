# -*- coding: utf-8 -*-

'''
@file  protocol.py
@brief Provide PLEN's protocol converter.
'''

__author__    = 'Kazuyuki TAKASE'
__copyright__ = 'PLEN Project Company, and all authors.'
__license__   = 'The MIT License'


from ctypes import c_ushort


class Protocol(object):
    def __init__(self, device_map):
        self._DEVICE_MAP = device_map
        self._values     = [0 for _ in range(24)]

    # ------------------------------------------------------------
    # Direct servo commands
    # ------------------------------------------------------------
    def applyDiff(self, device, value):
        return ('$AD%02x%03x' %
                (self._DEVICE_MAP[device], (c_ushort(value).value & 0xFFF))
               ).encode('ascii')

    def apply(self, device, value):
        return ('$AN%02x%03x' %
                (self._DEVICE_MAP[device], (c_ushort(value).value & 0xFFF))
               ).encode('ascii')

    def homePosition(self):
        return b'$HP'

    def playMotion(self, slot):
        return ('$PM%02x' % slot).encode('ascii')

    def stopMotion(self):
        return b'$SM'

    # ------------------------------------------------------------
    # Interpreter codes
    # ------------------------------------------------------------
    def popCode(self):
        return b'#PO'

    def pushCode(self, slot, loop_count):
        return ('#PU%02x%02x' % (slot, loop_count)).encode('ascii')

    def resetInterpreter(self):
        return b'#RI'

    # ------------------------------------------------------------
    # Joint settings
    # ------------------------------------------------------------
    def setHome(self, device, value):
        return ('>HO%02x%03x' %
                (self._DEVICE_MAP[device], (c_ushort(value).value & 0xFFF))
               ).encode('ascii')

    def setJointSettings(self):
        return b'>JS'

    def setMax(self, device, value):
        return ('>MA%02x%03x' %
                (self._DEVICE_MAP[device], (c_ushort(value).value & 0xFFF))
               ).encode('ascii')

    def setMin(self, device, value):
        return ('>MI%02x%03x' %
                (self._DEVICE_MAP[device], (c_ushort(value).value & 0xFFF))
               ).encode('ascii')

    def getJointSettings(self):
        return b'<JS'

    # ------------------------------------------------------------
    # Motion read/write
    # ------------------------------------------------------------
    def getMotion(self, slot):
        return ('<MO%02x' % slot).encode('ascii')

    def getVersionInformation(self):
        return b'<VI'

    # ------------------------------------------------------------
    # Motion install (updated for new Anim8 JSON format)
    # ------------------------------------------------------------
    def install(self, motion):
        """
        motion = {
            "slot": 4,
            "name": "Plen",
            "codes": [...],
            "frames": [
                {
                    "transition_time_ms": 1050,
                    "outputs": [
                        { "device": "right_shoulder_pitch", "value": 0 },
                        ...
                    ]
                },
                ...
            ]
        }
        """

        # Number of frames
        frame_count = len(motion['frames'])

        # Build header
        cmd = self.setMotionHeader(motion['slot'], motion['name'],
                                   motion['codes'], frame_count)

        # Build each frame
        for index, frame in enumerate(motion['frames']):
            cmd += self.setMotionFrame(motion['slot'], index, frame)

        return cmd  # bytes

    # ------------------------------------------------------------
    # Header builder (updated)
    # ------------------------------------------------------------
    def setMotionHeader(self, slot, name, codes, frame_count):
        cmd  = '>MH'
        cmd += '%02x' % slot
        cmd += name.ljust(20)[:20]

        protocol_codes = [
            '0000000',  # loop
            '000',      # jump
            '0'         # extra
        ]

        for code in codes:
            if code['method'] == 'loop':
                protocol_codes[0] = '1{:02x}{:02x}{:02x}'.format(
                    *code['arguments'][:3]
                )

            if code['method'] == 'jump':
                protocol_codes[1] = '1{:02x}'.format(code['arguments'][0])

        cmd += ''.join(protocol_codes)
        cmd += '%02x' % frame_count

        return cmd.encode('ascii')

    # ------------------------------------------------------------
    # Frame builder (updated)
    # ------------------------------------------------------------
    def setMotionFrame(self, slot, index, frame):
        cmd  = '>MF'
        cmd += '%02x' % slot
        cmd += '%02x' % index
        cmd += '%04x' % frame['transition_time_ms']

        # Reset and fill servo values
        for i in range(24):
            self._values[i] = 0

        for output in frame['outputs']:
            servo_index = self._DEVICE_MAP[output['device']]
            self._values[servo_index] = c_ushort(output['value']).value

        cmd += ''.join('%04x' % v for v in self._values)

        return cmd.encode('ascii')
