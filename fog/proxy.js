const zmq = require("zeromq");
const config = require("./config");
require("dotenv").config();

(async function () {
    const sock = new zmq.Reply();
    const humidityData = [];

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
            try {
                const message = JSON.parse(msg.toString());
                const { data, timestamp } = message;

                if (validateSensorData(sensorName, data)) {
                    console.log(`Datos válidos de ${sensorName} recibidos a las ${timestamp}: ${data}`);
                    
                    if (sensorName === "Humidity") {
                        humidityData.push({ value: data, timestamp });
                    }
                    
                    // Enviar datos a la capa Fog
                    const fogSocket = new zmq.Request();
                    await fogSocket.connect(`tcp://${config.fog.ip}:${config.fog.port}`);
                    await fogSocket.send(JSON.stringify({ sensorType: sensorName, data, timestamp }));
                    const [fogReply] = await fogSocket.receive();
                    console.log("Respuesta de la capa Fog:", fogReply.toString());

                    const fogResult = JSON.parse(fogReply.toString());

                    // Verificar condiciones de alerta de temperatura
                    if (sensorName === "Temperature" && (data < 11 || data > 29.4)) {
                        console.log(`Temperatura fuera del rango: ${data}`);
                        await sendAlert(`Temperatura fuera del rango: ${data}`, timestamp);
                    }

                    // Enviar datos calculados de humedad a la capa Cloud
                    if (fogResult.type === "Humidity") {
                        const cloudSocket = new zmq.Request();
                        await cloudSocket.connect(`tcp://${config.cloud.ip}:${config.cloud.port}`);
                        await cloudSocket.send(JSON.stringify(fogResult));
                        const [cloudReply] = await cloudSocket.receive();
                        console.log("Respuesta de la capa Cloud:", cloudReply.toString());
                    }

                    await sock.send(JSON.stringify({ status: "ok", data: message }));
                } else {
                    console.log(`Datos inválidos de ${sensorName} recibidos a las ${timestamp}: ${data}`);
                    await sock.send(JSON.stringify({ status: "error", error: "Datos inválidos" }));
                }
            } catch (error) {
                console.error("Error procesando el mensaje:", error);
                await sock.send(JSON.stringify({ status: "error", error: "Error procesando el mensaje" }));
            }
        }
    };

    // Enviar alertas
    const sendAlert = async (alertMessage, timestamp) => {
        const alertSocket = new zmq.Request();
        await alertSocket.connect(`tcp://${config.alertSystem.ip}:${config.alertSystem.port}`);
        await alertSocket.send(JSON.stringify({ alert: alertMessage, timestamp }));
        const [reply] = await alertSocket.receive();
        console.log("Respuesta de alerta:", reply.toString());
    };

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
