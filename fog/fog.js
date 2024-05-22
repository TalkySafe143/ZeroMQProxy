const zmq = require("zeromq");
const config = require("./config");
require("dotenv").config();

(async function () {
    const sock = new zmq.Reply();
    const humidityData = [];

    // Vincular la capa fog para escuchar los mensajes entrantes del proxy
    await sock.bind(`tcp://${config.fog.ip}:${config.fog.port}`);
    console.log(`Fog vinculado al puerto ${config.fog.port}`);

    // Manejar mensajes entrantes del proxy
    for await (const [msg] of sock) {
        try {
            const message = JSON.parse(msg.toString());
            const { sensorType, data, timestamp } = message;

            if (sensorType === "Humidity") {
                humidityData.push({ value: data, timestamp });
            }

            const humidityAverage = calculateHumidity();
            if (humidityAverage !== null) {
                await sock.send(JSON.stringify({ type: "Humidity", data: humidityAverage }));
            } else {
                await sock.send(JSON.stringify({ status: "ok" }));
            }
        } catch (error) {
            console.error("Error procesando el mensaje en fog:", error);
            await sock.send(JSON.stringify({ status: "error", error: "Error procesando el mensaje en fog" }));
        }
    }

    // Calcular humedad
    const calculateHumidity = () => {
        if (humidityData.length === 0) return null;
        const totalHumidity = humidityData.reduce((acc, reading) => acc + reading.value, 0);
        const averageHumidity = totalHumidity / humidityData.length;
        console.log(`Humedad promedio: ${averageHumidity.toFixed(2)}%`);
        humidityData.length = 0; // Limpiar el array para el próximo período
        return { average: averageHumidity, timestamp: new Date() };
    };
})();
