import zmq
import time

context = zmq.Context()

smokeDevice = context.socket(zmq.REP)
smokeDevice.bind("tcp://*:5556")

alert = smokeDevice.recv()
print("¡Se recibió una alerta de humo!")
print("Activando aspersores...")
time.sleep(5)
print("Aspersores activados")

