import datetime
import sys
import json
import zmq
import threading
import time
import random


def generate_response(content):
    return {
        'content': content,
        'timestamp': datetime.datetime.now().strftime("%m/%d/%Y, %H:%M:%S")
    }

context = zmq.Context()

# Conectar con el servidor Fog
fogLayer = context.socket(zmq.PUSH)
fogLayer.bind("tcp://*:5555")

class Sensor:
    timesToSleep = {
        'smoke': 3,
        'temperature': 6,
        'humidity': 5
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

    def start(self):


        while True:
            time.sleep(self.timesToSleep[self.type])
            metric = \
                random.choices(self.sensorValues[self.type]['values'], self.sensorValues[self.type]['probability'])[0]
            # Generar y Enviar a Fog computing
            fogLayer.send_json(generate_response(metric))

            if self.type == "smoke" and isinstance(metric, bool):
                if metric:
                    sprinkContext = zmq.Context()
                    # Conectar con el aspersor
                    sprinklerDevice = sprinkContext.socket(zmq.REQ)
                    sprinklerDevice.connect("tcp://localhost:5556")
                    sprinklerDevice.send_json(generate_response(metric))
                    sprinklerDevice.recv()
                    sprinklerDevice.close()
            # Falta el sistema de calidad


if len(sys.argv) != 3 or sys.argv[1] not in ["smoke", "temperature", "humidity"]:
    print("Ups, los argumentos estan incorrectos")
    print("Recuerde que: python3 sensor.py <tipo> <archivo>")
    exit(0)

sensor = Sensor(sys.argv[1], sys.argv[2])
# Hacer las 10 instancias de los sensores
for _ in range(10):
    x = threading.Thread(target=sensor.start, args=())
    x.start()
