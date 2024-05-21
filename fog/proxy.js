const zmq = require("zeromq");
const config = require("./config");

(async function(){

    const zeroMQConnections = [];

    // Función para recibir los mensajes de un sensor
    const recibeMessage = async (connection, sensorName) => {
        for await (const [msg] of connection) {
            console.log(`Recibido un buffer del sensor ${sensorName}`);
            console.log(JSON.parse(msg.toString()));
        }
    };

    // Smoke sensor
    const smokeSensorConnection = new zmq.Pull();
    smokeSensorConnection.connect(`tcp://${config.smokeSensor.ip}:${config.smokeSensor.port}`);
    console.log("Proxy conectado al puerto " + config.smokeSensor.port);
    recibeMessage(smokeSensorConnection, 'Smoke');

    // Temperature sensor
    const temperatureSensorConnection = new zmq.Pull();
    temperatureSensorConnection.connect(`tcp://${config.temperatureSensor.ip}:${config.temperatureSensor.port}`);
    console.log("Proxy conectado al puerto " + config.temperatureSensor.port);
    recibeMessage(temperatureSensorConnection, 'Temperature');

    // Humidity sensor
    const humiditySensorConnection = new zmq.Pull();
    humiditySensorConnection.connect(`tcp://${config.humiditySensor.ip}:${config.humiditySensor.port}`);
    console.log("Proxy conectado al puerto " + config.humiditySensor.port);
    recibeMessage(humiditySensorConnection, 'Humidity');

})();
