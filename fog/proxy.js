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
                    console.log(`Valid ${sensorName} data received at ${timestamp}: ${data}`);
                    
                    if (sensorName === "Humidity") {
                        humidityData.push({ value: data, timestamp });
                    }
                    
                    await sock.send(JSON.stringify({ status: "ok", data: message }));

                    // Verificar condiciones de alerta
                    if (sensorName === "Temperature" && (data < 11 || data > 29.4)) {
                        console.log(`Temperatura fuera del rango, valor: ${data}`);
                        await sendAlert(`Temperatura fuera del rango: ${data}`, timestamp);
                    }
                } else {
                    console.log(`Datos inválidos recibidos de ${sensorName} at ${timestamp}: ${data}`);
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

    // Enviar datos de humedad a capa cloud
    setInterval(async () => {
        const humidityData = await calculateHumidity();
        const cloudSocket = new zmq.Request();
        await cloudSocket.connect(`tcp://${config.cloud.ip}:${config.cloud.port}`);
        await cloudSocket.send(JSON.stringify({ type: "Humidity", data: humidityData }));
        const [reply] = await cloudSocket.receive();
        console.log("Respuesta cloud:", reply.toString());
    }, 5000);

    // Calcular humedad
    const calculateHumidity = () => {
        if (humidityData.length === 0) return;
        const totalHumidity = humidityData.reduce((acc, reading) => acc + reading.value, 0);
        const averageHumidity = totalHumidity / humidityData.length;
        console.log(`Humedad promedio: ${averageHumidity.toFixed(2)}%`);
        humidityData = [];
        return { average: averageHumidity, timestamp: new Date() };
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
