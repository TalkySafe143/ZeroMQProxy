import datetime
import os
import sys
import json

import dotenv
import zmq
import threading
import time
import random

dotenv.load_dotenv()

def generate_response(content, name):
    return {
        'content': content,
        'timestamp': datetime.datetime.now().strftime("%m/%d/%Y, %H:%M:%S"),
        'from': name
    }


sprinkContext = zmq.Context()
# Conectar con el aspersor
sprinklerDevice = sprinkContext.socket(zmq.REQ)
sprinklerDevice.connect(f"tcp://{os.getenv('SPRINKLER_IP')}:5556")

# Conectar con el sistema de calidad
qualityContext = zmq.Context()
qualitySystem = qualityContext.socket(zmq.REQ)
qualitySystem.connect(f"tcp://{os.getenv('QUALITY_SYSTEM_IP')}:5557")

lock = threading.Lock()


class Sensor:
    timesToSleep = { 
        'smoke': 3,
        'temperature': 6,
        'humidity': 5
    }

    zero_mq_ports = {
        'smoke': '5555',
        'temperature': '5554',
        'humidity': '5553'
    }

    sensorValues = {
        'temperature': {
            'values': [_ / 10.0 for _ in range(110, 295, 1)] +
                      [_ / 10.0 for _ in range(0, 110, 1)] +
                      [_ / 10.0 for _ in range(295, 350, 1)] +
                      [_ for _ in range(-10, 0, 1)],
            'probability': None
        },
        'smoke': {
            'values': [True, False, -1],
            'probability': None
        },
        'humidity': {
            'values': [_ / 10.0 for _ in range(7, 11, 1)] +
                      [_ / 10.0 for _ in range(0, 7, 1)] +
                      [_ / 10.0 for _ in range(11, 15, 1)] +
                      [_ for _ in range(-10, 0, 1)],
            'probability': None
        }
    }

    def __init__(self, t, config_file):
        self.type = t
        file = open(config_file)
        data = json.load(file)
        self.correct_probability = data['probabilities']['correct']
        self.out_of_range_probability = data['probabilities']['out_of_range']
        self.wrong_probability = data['probabilities']['wrong']
   

        context = zmq.Context()

        # Conectar con el servidor Fog
        self.fogLayer = context.socket(zmq.PUSH)
        self.fogLayer.bind(f"tcp://*:{self.zero_mq_ports[self.type]}")

        if self.type == "temperature":
            self.sensorValues[self.type]['probability'] = ([self.correct_probability for _ in range(110, 295, 1)] +
                                                           [self.out_of_range_probability for _ in range(0, 110, 1)] +
                                                           [self.out_of_range_probability for _ in range(295, 350, 1)] +
                                                           [self.wrong_probability for _ in range(-10, 0, 1)])
        if self.type == "smoke":
            self.sensorValues[self.type]['probability'] = [self.correct_probability, self.correct_probability,
                                                           self.wrong_probability]

        if self.type == "humidity":
            self.sensorValues[self.type]['probability'] = ([self.correct_probability for _ in range(7, 11, 1)] +
                                                           [self.out_of_range_probability for _ in range(0, 7, 1)] +
                                                           [self.out_of_range_probability for _ in range(11, 15, 1)] +
                                                           [self.wrong_probability for _ in range(-10, 0, 1)])

    def start(self, mutex):

        while True:
            time.sleep(self.timesToSleep[self.type])
            metric = \
                random.choices(self.sensorValues[self.type]['values'], self.sensorValues[self.type]['probability'])[0]
            
            # Generar y Enviar a Fog computing
            self.fogLayer.send_json(generate_response(metric, self.type))
            print("Paquetes envíados a Fog Layer")

            if self.type == "smoke" and isinstance(metric, bool):
                if metric:
                    with mutex:
                        time.sleep(1)
                    # Región critica
                    mutex.acquire()
                    sprinklerDevice.send_json(generate_response(metric, self.type))
                    sprinklerDevice.recv()
                    mutex.release()
                    
                    mutex.acquire()
                    qualitySystem.send_json(generate_response("Smoke detected", self.type))
                    qualitySystem.recv()
                    mutex.release()



                
if len(sys.argv) != 3 or sys.argv[1] not in ["smoke", "temperature", "humidity"]:
    print("Ups, los argumentos estan incorrectos")
    print("Recuerde que: python3 sensor.py <tipo> <archivo>")
    exit(0)

sensor = Sensor(sys.argv[1], sys.argv[2])
# Hacer las 10 instancias de los sensores
for _ in range(10):
    x = threading.Thread(target=sensor.start, args=(lock,))
    x.start()
