const zmq = require("zeromq");
const config = require("./config");

(async function(){
    const zeroMQConnections = [];

    const recibeMessage = async (connection, sensorName, fogConnection) => {
        for await (const [msg] of connection) {
            console.log(`Recibido un buffer del sensor ${sensorName}`);
            console.log(JSON.parse(msg.toString()));
            fogConnection.send(msg);
        }
    };

    const fogConnection = new zmq.Push();
    fogConnection.connect(`tcp://${config.fogLayer.ip}:${config.fogLayer.port}`);
    console.log("Proxy conectado a la capa Fog en el puerto " + config.fogLayer.port);

    const smokeSensorConnection = new zmq.Pull();
    smokeSensorConnection.connect(`tcp://${config.smokeSensor.ip}:${config.smokeSensor.port}`);
    console.log("Proxy conectado al puerto " + config.smokeSensor.port);
    recibeMessage(smokeSensorConnection, 'Smoke', fogConnection);

    const temperatureSensorConnection = new zmq.Pull();
    temperatureSensorConnection.connect(`tcp://${config.temperatureSensor.ip}:${config.temperatureSensor.port}`);
    console.log("Proxy conectado al puerto " + config.temperatureSensor.port);
    recibeMessage(temperatureSensorConnection, 'Temperature', fogConnection);

    const humiditySensorConnection = new zmq.Pull();
    humiditySensorConnection.connect(`tcp://${config.humiditySensor.ip}:${config.humiditySensor.port}`);
    console.log("Proxy conectado al puerto " + config.humiditySensor.port);
    recibeMessage(humiditySensorConnection, 'Humidity', fogConnection);
})();
