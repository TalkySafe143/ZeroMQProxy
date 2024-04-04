require("dotenv").config()

module.exports = {
    smokeSensor: {
        ip: process.env.SMOKE_IP,
        port: 5555
    },
    temperatureSensor: {
        ip: process.env.TEMP_IP,
        port: 5554
    },
    humiditySensor: {
        ip: process.env.HUM_IP,
        port: 5553
    }
}