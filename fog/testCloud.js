const zmq = require("zeromq");

(async function(){
    const cloudConnection = new zmq.Request
    cloudConnection.connect("tcp://localhost:5560");
        setInterval( async () => {
            await cloudConnection.send(JSON.stringify({
                "type": "humidity",
                "data": {
                    "average": Math.random(),
                    "timestamp": Date.now()
                }
            }));
            const [result] = await cloudConnection.receive();

            console.log(result.toString())
        }, 100)
    
})()