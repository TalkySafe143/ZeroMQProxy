require("dotenv").config();

module.exports = {
    smokeSensor: {
        ip: process.env.SMOKE_IP,
        port: process.env.SMOKE_PORT
    },
    temperatureSensor: {
        ip: process.env.TEMP_IP,
        port: process.env.TEMP_PORT
    },
    humiditySensor: {
        ip: process.env.HUM_IP,
        port: process.env.HUM_PORT
    },
    fogLayer: {
        ip: process.env.FOG_IP,
        port: process.env.FOG_PORT
    },
    cloudLayer: {
        ip: process.env.CLOUD_IP,
        port: process.env.CLOUD_PORT
    },
    alertSystem: {
        ip: process.env.SCFog_IP,
        port: process.env.SCFog_PORT
    },
    proxy: {
        ip: process.env.PROXY_IP,
    }
};
