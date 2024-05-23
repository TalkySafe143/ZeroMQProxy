const zmq = require("zeromq");
const config = require("./config");
require("dotenv").config();

// Validar datos de sensores
const validateSensorData = (sensorType, data) => {
    if (data === null || data === undefined) {
        return false;
    }

    switch (sensorType) {
        case "Temperature":
            return data >= 11 && data <= 29.4;
        case "Humidity":
            return data >= 70 && data <= 100;
        case "Smoke":
            return data === true || data === false;
        default:
            return false;
    }
};

// Recibir mensajes de un sensor
const recibeMessage = async (connection, sensorName) => {
    for await (const [msg] of connection) {
        console.log(`Recibido un mensaje de ${sensorName}: ${msg.toString()}`)
        try {
            const message = JSON.parse(msg.toString());
            const { content: data, timestamp } = message;

            if (validateSensorData(sensorName, data)) {
                //console.log(`Datos válidos de ${sensorName} recibidos a las ${timestamp}: ${data}`);
                
                // Enviar datos a la capa Fog
                let fogResend = null;
                if (sensorName == "Humidity" || sensorName == "Temperature") {
                    const fogSocket = new zmq.Request();
                    fogSocket.connect(`tcp://${config.fogLayer.ip}:${config.fogLayer.port}`);
                    await fogSocket.send(JSON.stringify({ 
                        sensorType: sensorName, 
                        data, 
                        timestamp 
                    }));
                    const [fogReply] = await fogSocket.receive();
                    console.log("Respuesta de la capa Fog:", fogReply.toString());
                    fogSocket.close();
                    fogResend = JSON.parse(fogReply.toString());
                }

                
                if (fogResend.data != -1) {
                    const cloudSocket = new zmq.Request();
                    cloudSocket.connect(`tcp://${config.cloudLayer.ip}:${config.cloudLayer.port}`);

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
                    cloudSocket.close();
                    console.log("Respuesta de la capa Cloud:", cloudReply.toString());
                }

                // Ok to sensor
                await connection.send(JSON.stringify({ status: "ok", data: message }));
            } else {
                console.log(`Datos inválidos de ${sensorName} recibidos a las ${timestamp}: ${data}`);
                await connection.send(JSON.stringify({ status: "error", error: "Datos inválidos" }));
            }
        } catch (error) {
            console.error("Error procesando el mensaje:", error);
            await connection.send(JSON.stringify({ status: "error", error: "Error procesando el mensaje" }));
        }
    }
};

(async function () {
    // Configurar conexiones con los sensores
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
