const zmq = require("zeromq");
const config = require("./config");
require("dotenv").config();
const Mutex = require("async-mutex").Mutex;
const mutex = new Mutex();

const fogSocket = new zmq.Request();
fogSocket.connect(`tcp://${config.fogLayer.ip}:${config.fogLayer.port}`);

const cloudSocket = new zmq.Request();
cloudSocket.connect(`tcp://${config.cloudLayer.ip}:${config.cloudLayer.port}`);

const healtSocket = new zmq.Reply();
healtSocket.connect(`tcp://${config.healt_check.ip}:${config.healt_check.port}`);

(async function () {
    for await (const [msg] of healtSocket) {
        console.log("Recibida solicitud de health check.");
        await healtSocket.send("ok");
        console.log("Respuesta de la capa de salud: ok");
    }
})();

// Validar datos de sensores
const validateSensorData = (sensorType, data) => {
    if (data === null || data === undefined) {
        return false;
    }

    switch (sensorType) {
        case "Temperature":
            return data > -1;
        case "Humidity":
            return data > -1;
        case "Smoke":
            return data != -1;
        default:
            return false;
    }
};

// Recibir mensajes de un sensor
const recibeMessage = async (connection, sensorName) => {
    for await (const [msg] of connection) {
        console.log(`Recibido un mensaje de ${sensorName}: ${msg.toString()}`);

        try {
            const message = JSON.parse(msg.toString());
            const { content, timestamp } = message;
            const data = content;
            if (validateSensorData(sensorName, data)) {
                let fogResend = null;
                if (sensorName == "Humidity" || sensorName == "Temperature") {
                    const release = await mutex.acquire();
                    await fogSocket.send(JSON.stringify({ 
                        sensorType: sensorName, 
                        data, 
                        timestamp 
                    }));
                    const [fogReply] = await fogSocket.receive();
                    console.log("Respuesta de la capa Fog:", fogReply.toString());
                    fogResend = JSON.parse(fogReply.toString());
                    release();
                }

                if (fogResend && fogResend.data != -1) {
                    const release = await mutex.acquire();
                    let sendToCloud = {
                        type: sensorName,
                        data: {
                            average: null,
                            timestamp: Date.now()
                        }
                    };
                    
                    if (!fogResend) sendToCloud.data.average = data;
                    else sendToCloud.data.average = fogResend.data;

                    await cloudSocket.send(JSON.stringify(sendToCloud));
                    const [cloudReply] = await cloudSocket.receive();
                    console.log("Respuesta de la capa Cloud:", cloudReply.toString());
                    release();
                }
            } else {
                console.log(`Datos inválidos de ${sensorName} recibidos a las ${timestamp}: ${data}`);
            }
        } catch (error) {
            console.error("Error procesando el mensaje:", error);
        }
    }
};

(async function () {
    const smokeSensorConnection = new zmq.Pull();
    smokeSensorConnection.connect(`tcp://${config.smokeSensor.ip}:${config.smokeSensor.port}`);
    console.log("Proxy conectado al puerto " + config.smokeSensor.port);
    recibeMessage(smokeSensorConnection, 'Smoke');

    const temperatureSensorConnection = new zmq.Pull();
    temperatureSensorConnection.connect(`tcp://${config.temperatureSensor.ip}:${config.temperatureSensor.port}`);
    console.log("Proxy conectado al puerto " + config.temperatureSensor.port);
    recibeMessage(temperatureSensorConnection, 'Temperature');

    const humiditySensorConnection = new zmq.Pull();
    humiditySensorConnection.connect(`tcp://${config.humiditySensor.ip}:${config.humiditySensor.port}`);
    console.log("Proxy conectado al puerto " + config.humiditySensor.port);
    recibeMessage(humiditySensorConnection, 'Humidity');
})();
