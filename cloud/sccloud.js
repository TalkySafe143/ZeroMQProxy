require("dotenv").config({
    path: "build/.env"
});

const zmq = require("zeromq");

(async function () {
    const connection = new zmq.Reply;
    await connection.bind("tcp://*:5561");
    for await (const [msg] of connection) {
        console.log(JSON.parse(msg.toString()))
        await connection.send("ok");
    }
})();