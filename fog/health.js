const zmq = require("zeromq");
const config = require("./config");
const ip = require("ip")
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

const awaitTimeout = (delay, reason) =>
    new Promise((resolve, reject) =>
    setTimeout(
        () => (reason === undefined ? resolve() : reject(reason)),
        delay
    )
);

const wrapPromise = (promise, delay, reason) =>
    Promise.race([promise, awaitTimeout(delay, reason)]);


(async function() {

    const sock = new zmq.Request
    sock.connect(`tcp://${config.proxy.ip}:${config.proxy.port}`);

    while (1) {
        await sleep(1000);
        try {
            await sock.send("ok")
            const [msg] = await wrapPromise(sock.receive(), 1000, "Proxy failed!");
            console.log(`El proxy sigue ${msg.toString()}`);
        } catch (e) {
            console.log(e)
            break;
        }
    }

    require("./proxy");
})();