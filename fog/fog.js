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


const zmq = require("zeromq");
const config = require("./config");

const maxTemperatureThreshold = 29.4; // Umbral máximo de temperatura

(async function() {
    const fogReceiver = new zmq.Pull();
    fogReceiver.bind(`tcp://${config.fogLayer.ip}:${config.fogLayer.port}`);
    console.log(`Capa fog escuchando en puerto ${config.fogLayer.port}`);

    const proxyConnection = new zmq.Push();
    proxyConnection.connect(`tcp://${config.proxy.ip}:${config.proxy.port}`);
    console.log("Capa fog conectada al proxy");

    let temperatureData = [];
    let humidityData = [];

    const calculateAverageTemperature = () => {
        if (temperatureData.length === 0) return;
        const totalTemperature = temperatureData.reduce((acc, reading) => acc + reading.value, 0);
        const averageTemperature = totalTemperature / temperatureData.length;
        console.log(`Temperatura promedio: ${averageTemperature.toFixed(2)}°C`);
        temperatureData = [];
        
        if (averageTemperature > maxTemperatureThreshold) {
            console.log('Temperatura excede el límite, enviando alerta...');
            proxyConnection.send(JSON.stringify({ alert: 'La temperatura excede el límite', timestamp: new Date() }));
        }
        
        proxyConnection.send(JSON.stringify({ type: 'temperature', average: averageTemperature, timestamp: new Date() }));
    };

    const calculateAverageHumidity = () => {
        if (humidityData.length === 0) return;
        const totalHumidity = humidityData.reduce((acc, reading) => acc + reading.value, 0);
        const averageHumidity = totalHumidity / humidityData.length;
        console.log(`Humedad promedio: ${averageHumidity.toFixed(2)}%`);
        humidityData = [];
        
        proxyConnection.send(JSON.stringify({ type: 'humidity', average: averageHumidity, timestamp: new Date() }));
    };

    setInterval(calculateAverageTemperature, 5000); // Calcular cada 5 segundos
    setInterval(calculateAverageHumidity, 5000); // Calcular cada 5 segundos

    for await (const [msg] of fogReceiver) {
        const sensorData = JSON.parse(msg.toString());

        if (sensorData.type === 'temperature') {
            temperatureData.push(sensorData);
        } else if (sensorData.type === 'humidity') {
            humidityData.push(sensorData);
        } else if (sensorData.type === 'smoke') {
            console.log(`Smoke data received: ${JSON.stringify(sensorData)}`);
        }
    }
})();
