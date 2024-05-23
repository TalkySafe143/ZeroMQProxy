import datetime
import dotenv
import zmq

dotenv.load_dotenv()

def generate_response(content):
    return {
        'content': content,
        'timestamp': datetime.datetime.now().strftime("%m/%d/%Y, %H:%M:%S")
    }

context = zmq.Context()

qualitySystem = context.socket(zmq.REP)
qualitySystem.bind("tcp://*:5559")

while True:
    alert = qualitySystem.recv()
    qualitySystem.send_json(generate_response("ok"))
    print("SISTEMA DE CALIDAD FOG: ¡Se recibió una alerta de temperatura!")
