const zmq = require("zeromq");
const config = require("./config");

(async function() {
    const fogReceiver = new zmq.Pull();
    fogReceiver.bind(`tcp://${config.fogLayer.ip}:${config.fogLayer.port}`);
    console.log(`Capa fog escuchando en puerto ${config.fogLayer.port}`);

    const cloudSender = new zmq.Push();
    cloudSender.connect(`tcp://${config.cloudLayer.ip}:${config.cloudLayer.port}`);
    console.log("Capa fog conectada a capa cloud");

    let humidityData = [];

    const calculateAverageHumidity = () => {
        if (humidityData.length === 0) return;
        const totalHumidity = humidityData.reduce((acc, reading) => acc + reading.value, 0);
        const averageHumidity = totalHumidity / humidityData.length;
        console.log(`Humedad promedio: ${averageHumidity.toFixed(2)}%`);
        cloudSender.send(JSON.stringify({ type: 'humidity', average: averageHumidity, timestamp: new Date() }));
        humidityData = [];
    };

    setInterval(calculateAverageHumidity, 5000); // Calcular cada 5 segundos

    for await (const [msg] of fogReceiver) {
        const sensorData = JSON.parse(msg.toString());
        if (sensorData.type === 'humidity') {
            humidityData.push(...sensorData.values);
        }
    }
})();
