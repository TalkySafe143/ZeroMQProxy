import datetime

import dotenv
import zmq
import time
dotenv.load_dotenv()

def generate_response(content):
    return {
        'content': content,
        'timestamp': datetime.datetime.now().strftime("%m/%d/%Y, %H:%M:%S")
    }


context = zmq.Context()

smokeDevice = context.socket(zmq.REP)
smokeDevice.bind("tcp://*:5556")

while True:
    alert = smokeDevice.recv()
    smokeDevice.send_json(generate_response("ok"))
    print("¡Se recibió una alerta de humo!")
    print("Activando aspersores...")
    print("Aspersores activados\n")
