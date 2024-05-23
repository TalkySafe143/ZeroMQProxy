const zmq = require('zeromq');
const config = require("./config");

// Función para realizar el health check
const healthCheck = async () => {
    const socket = new zmq.Request;

    try {
        await socket.connect(`tcp://${config.healt_check.ip}:${config.healt_check.port}`);
        await socket.send('Health');
        const [reply] = await socket.receive();

        if (reply.toString() !== 'ok') {
            throw new Error('El servidor principal no está disponible');
        }
        console.log('El servidor principal está operativo.');
    } catch (error) {
        console.error('Error en el health check:', error);
        startBackupServer();
    } finally {
        socket.close();
    }
};

// Ejecutar el health check periódicamente cada segundo
setInterval(healthCheck, 1000);

// Función para iniciar el servidor de respaldo
const startBackupServer = () => {
    console.log('Iniciando el servidor de respaldo...');
    // Aquí pondrías el código para iniciar tu servidor de respaldo
    // Por ejemplo:
    // const backupServer = require('./server_respaldo.js');
    // backupServer.start();
};