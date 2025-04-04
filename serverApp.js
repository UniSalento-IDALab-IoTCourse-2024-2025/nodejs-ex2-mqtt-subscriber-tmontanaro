var express = require("express");
var app = express();
const WebSocket = require('ws');
const path = require('path');
const mqtt=require('mqtt');



app.listen(3000, () => {
    console.log("Server running on port 3000");
});

app.use(
    express.urlencoded({
        extended: true
    })
)

app.use(express.json());

const wss = new WebSocket.Server({ port: 3001 });
wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
    });
    ws.send('something');
});

var mqttClient = mqtt.connect("mqtt://mqtt.eclipseprojects.io",{clientId:"mqttjs041"});
mqttClient.on("connect",function(){
    console.log("connected");
});
mqttClient.on("error",function(error){
    console.log("Can't connect"+error);
});

async function pushToWsClient(temperature){
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(temperature);
        }
    });
}

mqttClient.on('message',function(topic, message, packet){
    console.log("message is "+ message);
    console.log("topic is "+ topic);
    var messageJSON = JSON.parse(message);
    var temperature = messageJSON.temperature;
    var timestamp = messageJSON.timestamp;
    var sensor = messageJSON.sensor;
	pushToWsClient(temperature).catch();
});

	
app.get('/dashboard', async (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
})

var topic="test-topic-handson/data";
console.log("subscribing to topic"+topic);
mqttClient.subscribe(topic); //single topic



