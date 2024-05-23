const zmq = require("zeromq");
const config = require("./config");
require("dotenv").config();
const Mutex = require("async-mutex").Mutex
let humidityData = [];
let temperatureData = []
const mutex = new Mutex();
// Calcular humedad diaria promedio
const calculateHumidity = () => {
    if (humidityData.length != 10) return { average: -1};
    const totalHumidity = humidityData.reduce((acc, reading) => acc + reading.value, 0);
    const averageHumidity = totalHumidity / humidityData.length;

    humidityData = [];
    return { average: averageHumidity, timestamp: Date.now() };
};

const calculateTemperature = () => {
    if (temperatureData.length != 10) return { average: -1};
    const totalTemperature = temperatureData.reduce((acc, reading) => acc + reading.data, 0);
    const averageTemperature = totalTemperature / temperatureData.length;

    console.log(`Promedio calculado de temperatura: ${averageTemperature}`);
    temperatureData.forEach((temp, idx) => {
        console.log(`Fecha de la temperatura ${idx+1}: ${temp.timestamp}`)
    })

    temperatureData = [];
    return { average: averageTemperature, timestamp: Date.now() };
}

// Enviar alertas
const sendAlert = async (alertMessage, timestamp) => {
    const release = await mutex.acquire()
    const alertSocket = new zmq.Request;
    await alertSocket.connect(`tcp://${config.alertSystem.ip}:${config.alertSystem.port}`);
    await alertSocket.send(JSON.stringify({ alert: alertMessage, timestamp }));
    const [reply] = await alertSocket.receive();
    console.log("Respuesta de alerta:", reply.toString());
    release()
};

(async function () {
    const sock = new zmq.Reply;

    // Vincular la capa fog para escuchar los mensajes entrantes del proxy
    await sock.bind(`tcp://*:${config.fogLayer.port}`);
    console.log(`Fog vinculado al puerto ${config.fogLayer.port}`);

    // Manejar mensajes entrantes del proxy
    while (1) {
        for await (const [msg] of sock) {
            try {
                const message = JSON.parse(msg.toString());
                const { sensorType, data, timestamp } = message;
    
                if (sensorType === "Humidity") {
                    humidityData.push({ value: data, timestamp });
                } else {
                    temperatureData.push({ data, timestamp });
                }
    
                const humidityAverage = calculateHumidity();
                const temperatureAverage = calculateTemperature();
                
                if (temperatureAverage.average < 11 || temperatureAverage.average > 29.4) {
                    console.log(`Temperatura fuera del rango: ${temperatureAverage.average}`);
                    await sendAlert(`Temperatura fuera del rango: ${temperatureAverage.average}`, timestamp);
                }
    
                if (sensorType == "Humidity") {
                    await sock.send(JSON.stringify({
                        sensorType,
                        data: humidityAverage.average,
                        timestamp: Date.now()
                    }));
                } else {
                    await sock.send(JSON.stringify({
                        sensorType,
                        data: temperatureAverage.average,
                        timestamp: Date.now()
                    }));
                }
            } catch (error) {
                console.error("Error procesando el mensaje en fog:", error);
                await sock.send(JSON.stringify({
                    sensorType: "Error",
                    data: -1,
                    timestamp: Date.now()
                }));
            }
        }
    }
})();