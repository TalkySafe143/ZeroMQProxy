// Debe ser pull
const zmq = require("zeromq");
const config = require("./config");

(async function(){

    const zeroMQConnections = [];

    // Smoke sensor
    zeroMQConnections.push(new zmq.Pull);
    zeroMQConnections[zeroMQConnections.length-1].connect(`tcp://${config.smokeSensor.ip}:${config.smokeSensor.port}`);
    console.log("Proxy conectado al puerto " + config.smokeSensor.port);


    // Temperature sensor
    zeroMQConnections.push(new zmq.Pull);
    zeroMQConnections[zeroMQConnections.length-1].connect(`tcp://${config.temperatureSensor.ip}:${config.temperatureSensor.port}`);
    console.log("Proxy conectado al puerto " + config.temperatureSensor.port);


    // Humidity sensor
    zeroMQConnections.push(new zmq.Pull);
    zeroMQConnections[zeroMQConnections.length-1].connect(`tcp://${config.humiditySensor.ip}:${config.humiditySensor.port}`);
    console.log("Proxy conectado al puerto " + config.humiditySensor.port);

   while (true) {
       for (const edgeLayer of zeroMQConnections) {
           for await (const [msg] of edgeLayer) {
               console.log("Recibido un buffer")
               console.log(JSON.parse(msg.toString()))
               break;
           }
       }
   }
})()