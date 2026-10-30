# -*- coding: utf-8 -*-

'''
@file  router.py
@brief Provide routing methods.
'''

__author__    = 'Kazuyuki TAKASE'
__copyright__ = 'PLEN Project Company, and all authors.'
__license__   = 'The MIT License'


import logging
import os
from bottle import Bottle, request, response, abort, static_file
from geventwebsocket import WebSocketError
from geventwebsocket.handler import WebSocketHandler
from models.empty_motion import EMPTY_MOTION


# Create module level instances.
# ==============================================================================
_LOGGER = logging.getLogger('plen-ControlServer').getChild(__name__)

_empty_motion = EMPTY_MOTION
_driver       = None

router = Bottle()

# ----------------------------------------------------------------------
# GUI STATIC FILE SERVING
# ----------------------------------------------------------------------

GUI_ROOT = os.path.abspath(os.path.join(
    os.path.dirname(__file__),
    '..',
    '..',
    'control_server_gui',
    'control_server_gui'
))

@router.route('/')
def index():
    return static_file('gui.html', root=GUI_ROOT)

@router.route('/<filepath:path>')
def server_static(filepath):
    return static_file(filepath, root=GUI_ROOT)


# ----------------------------------------------------------------------
# CORS DECORATOR
# ----------------------------------------------------------------------

def enable_cors(fn):
    def _enable_cors(*args, **kwargs):
        response.headers['Access-Control-Allow-Origin' ] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, PUT, POST, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Origin, Accept, Content-Type, X-Requested-With, X-CSRF-Token'

        if request.method != 'OPTIONS':
            return fn(*args, **kwargs)
    return _enable_cors


# ----------------------------------------------------------------------
# LEGACY STATIC ROUTES
# ----------------------------------------------------------------------

@router.route('/assets/<file_path:path>')
def assets(file_path):
    return static_file(file_path, root='./assets')

@router.route('/angularjs/<file_path:path>')
def angularjs(file_path):
    return static_file(file_path, root='./angularjs')


# ----------------------------------------------------------------------
# REAL WEBSOCKET ENDPOINT
# ----------------------------------------------------------------------

@router.route('/v2/cmdstream')
def cmdstream():
    ws = request.environ.get('wsgi.websocket')
    if not ws:
        abort(400, 'Expected WebSocket request.')

    while True:
        try:
            msg = ws.receive()
            if msg is None:
                break

            # Parse and dispatch command
            if _driver is not None and msg:
                parts = msg.split('/')
                cmd = parts[0]

                try:
                    if cmd == 'apply' and len(parts) == 3:
                        _driver.apply(parts[1], int(parts[2]))
                    elif cmd == 'applyDiff' and len(parts) == 3:
                        _driver.applyDiff(parts[1], int(parts[2]))
                    elif cmd == 'setMin' and len(parts) == 3:
                        _driver.setMin(parts[1], int(parts[2]))
                    elif cmd == 'setMax' and len(parts) == 3:
                        _driver.setMax(parts[1], int(parts[2]))
                    elif cmd == 'setHome' and len(parts) == 3:
                        _driver.setHome(parts[1], int(parts[2]))
                    elif cmd == 'resetJointSettings':
                        _driver.resetJointSettings()
                except Exception as e:
                    _LOGGER.error('WebSocket command error: %s' % str(e))

            ws.send('True')  # anything not 'False' sets state back to CONNECTED

        except WebSocketError:
            break


# ----------------------------------------------------------------------
# MOTION API
# ----------------------------------------------------------------------

@router.route('/v2/motions/<SLOT:int>', method=['OPTIONS', 'GET'])
@enable_cors
def motion_get(SLOT):
    response_json = {
        'resource': 'motions',
        'data': _driver.getMotion(SLOT)
    }
    response.content_type = 'application/json'
    return response_json


@router.route('/v2/motions/<SLOT:int>', method=['OPTIONS', 'DELETE'])
@enable_cors
def motion_delete(SLOT):
    _empty_motion['slot'] = SLOT
    result = _driver.install(_empty_motion)
    response_json = {
        'resource': 'motions',
        'data': {
            'command': 'reset',
            'result': True if result else False
        }
    }
    response.content_type = 'application/json'
    return response_json


@router.route('/v2/motions/<SLOT:int>', method=['OPTIONS', 'PUT'])
@enable_cors
def motion_put(SLOT):
    motion = request.json
    motion['slot'] = SLOT

    result = _driver.install(motion)

    response.content_type = 'application/json'
    return {
        'resource': 'motions',
        'data': {
            'command': 'install',
            'result': True if result else False
        }
    }


@router.route('/v2/motions/<SLOT:int>/play', method=['OPTIONS', 'GET'])
@enable_cors
def motion_play(SLOT):
    response_json = {
        'resource': 'motions',
        'data': {
            'command': 'play',
            'result': _driver.play(SLOT)
        }
    }
    response.content_type = 'application/json'
    return response_json


@router.route('/v2/motions/stop', method=['OPTIONS', 'GET'])
@enable_cors
def motion_stop():
    response_json = {
        'resource': 'motions',
        'data': {
            'command': 'stop',
            'result': _driver.stop()
        }
    }
    response.content_type = 'application/json'
    return response_json


# ----------------------------------------------------------------------
# VERSION + METADATA
# ----------------------------------------------------------------------

@router.route('/v2/version', method=['OPTIONS', 'GET'])
@enable_cors
def version_get():
    response_json = {
        'resource': 'version',
        'data': {
            'version': '2.0.0',
            'hardware': 'PLEN2',
            'server': '1.0.0'
        }
    }
    response.content_type = 'application/json'
    return response_json


@router.route('/v2/metadata', method=['OPTIONS', 'GET'])
@enable_cors
def metadata_get():
    response_json = {
        'resource': 'metadata',
        'data': {
            'api-version': 2,
            'required-firmware': '1.4.1~'
        }
    }
    response.content_type = 'application/json'
    return response_json


# ----------------------------------------------------------------------
# DRIVER CONNECT / DISCONNECT / UPLOAD
# ----------------------------------------------------------------------

@router.route('/v2/connect', method=['OPTIONS', 'GET'])
@enable_cors
def connect():
    result = _driver.connect()
    response_json = {
        'resource': 'driver',
        'data': {
            'command': 'connect',
            'result': result
        }
    }
    response.content_type = 'application/json'
    return response_json


@router.route('/v2/disconnect', method=['OPTIONS', 'GET'])
@enable_cors
def disconnect():
    result = _driver.disconnect()
    response_json = {
        'resource': 'driver',
        'data': {
            'command': 'disconnect',
            'result': result
        }
    }
    response.content_type = 'application/json'
    return response_json


@router.route('/v2/upload', method=['OPTIONS', 'PUT'])
@enable_cors
def upload():
    response_json = {
        'resource': 'driver',
        'data': {
            'command': 'upload',
            'result': _driver.upload(request.body.read())
        }
    }
    response.content_type = 'application/json'
    return response_json


# ----------------------------------------------------------------------
# DRIVER SETTER
# ----------------------------------------------------------------------

def set_driver(driver):
    from drivers.abstract import AbstractDriver
    if isinstance(driver, AbstractDriver):
        global _driver
        _driver = driver


# ----------------------------------------------------------------------
# SERVER WORKER (WITH WEBSOCKET SUPPORT)
# ----------------------------------------------------------------------

def server_worker(port=17264):
    from gevent import pywsgi
    from geventwebsocket.handler import WebSocketHandler

    server = pywsgi.WSGIServer(
        ('localhost', port),
        router,
        handler_class=WebSocketHandler
    )

    print('Control server listening on http://localhost:{}/'.format(port))
    server.serve_forever()


# ----------------------------------------------------------------------
# APPLICATION ENTRY POINT (DEBUG MODE ONLY)
# ----------------------------------------------------------------------

if __name__ == '__main__':
    import sys
    sys.path.append(os.pardir)

    from drivers.null.core import NullDriver
    _driver = NullDriver(None, None)
    server_worker()
