require("dotenv").config();

const zmq = require("zeromq");

(async function () {
    const sock = new zmq.Reply

    await sock.bind("tcp://*:5560");

    for await (const [msg] of sock) {
        console.log(msg.toString())
        await sock.send("ok");
    }
})()