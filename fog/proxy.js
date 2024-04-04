// Debe ser pull
const zmq = require("zeromq");

(async function(){
   const edgeLayer = new zmq.Pull;
   edgeLayer.connect("tcp://localhost:5555");
   console.log("Proxy conectado al puerto 5555");

   while (true) {
       for await (const [msg] of edgeLayer) {
           console.log("Recibido un buffer")
           console.log(msg.toString())
       }
   }
})()