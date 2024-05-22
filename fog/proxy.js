const zmq = require("zeromq");
const config = require("./config");

// Función para validar los datos recibidos
const validateData = (data) => {
    // Verificar que los datos no sean nulos y estén dentro de un rango aceptable
    return data && data.value !== null && !isNaN(data.value) && data.value >= 0 && data.value <= 100;
};

(async function() {
    const fogConnection = new zmq.Push();
    fogConnection.connect(`tcp://${config.fogLayer.ip}:${config.fogLayer.port}`);
    console.log("Proxy conectado a la capa Fog en el puerto " + config.fogLayer.port);

    const cloudConnection = new zmq.Push();
    cloudConnection.connect(`tcp://${config.cloudLayer.ip}:${config.cloudLayer.port}`);
    console.log("Proxy conectado a la capa Cloud en el puerto " + config.cloudLayer.port);

    const recibeMessage = async (connection, sensorName) => {
        for await (const [msg] of connection) {
            const data = JSON.parse(msg.toString());
            console.log(`Recibido un buffer del sensor ${sensorName}`);
            console.log(data);

            if (validateData(data)) {
                fogConnection.send(JSON.stringify(data));
            } else {
                console.log(`Datos inválidos recibidos del sensor ${sensorName}:`, data);
            }
        }
    };

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

    const fogMessageReceiver = new zmq.Pull();
    fogMessageReceiver.bind(`tcp://${config.proxy.ip}:${config.proxy.port}`);
    console.log("Proxy escuchando mensajes de la capa Fog en el puerto " + config.proxy.port);

    for await (const [msg] of fogMessageReceiver) {
        const message = JSON.parse(msg.toString());
        if (message.alert) {
            // Envía la alerta a la nube
            cloudConnection.send(msg);
        } else if (message.type === 'humidity' || message.type === 'temperature') {
            // Envía las medidas calculadas a la nube
            cloudConnection.send(msg);
        }
    }
})();
