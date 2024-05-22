const zmq = require("zeromq");
const config = require("./config");

(async function() {
    const fogReceiver = new zmq.Pull();
    fogReceiver.bind(`tcp://${config.fogLayer.ip}:${config.fogLayer.port}`);
    console.log(`Capa fog - puerto ${config.fogLayer.port}`);

    const cloudSender = new zmq.Push();
    cloudSender.connect(`tcp://${config.cloudLayer.ip}:${config.cloudLayer.port}`);
    console.log("Capa fog conectada a capa cloud");

    function processTemperatureData(data) {
        const temperatures = data.map(d => d.value);
        const averageTemp = temperatures.reduce((acc, temp) => acc + temp, 0) / temperatures.length;
        console.log(`Temperatura promedio: ${averageTemp.toFixed(2)}°C`);

        if (averageTemp > 29.4) {
            console.log('La temperatura excede el límite, enviando alerta...');
            cloudSender.send(JSON.stringify({ alert: 'Temperatura excede el límite' }));
        }
    }

    function processHumidityData(data) {
        const humidities = data.map(d => d.value);
        const averageHumidity = humidities.reduce((acc, humidity) => acc + humidity, 0) / humidities.length;
        console.log(`Humedad promedio: ${averageHumidity.toFixed(2)}%`);

        if (averageHumidity < 70) {
            console.log('Humedad por debajo del límite, enviando alerta');
            cloudSender.send(JSON.stringify({ alert: 'Humedad por debajo del límite' }));
        }

        cloudSender.send(JSON.stringify({ type: 'humidity', values: data }));
    }

    for await (const [msg] of fogReceiver) {
        const sensorData = JSON.parse(msg.toString());

        if (sensorData.type === 'temperature') {
            processTemperatureData(sensorData.values);
        } else if (sensorData.type === 'humidity') {
            processHumidityData(sensorData.values);
        } else if (sensorData.type === 'smoke') {
            console.log(`Datos de sensor de humo recibidos: ${JSON.stringify(sensorData.values)}`);
        }
    }
})();
