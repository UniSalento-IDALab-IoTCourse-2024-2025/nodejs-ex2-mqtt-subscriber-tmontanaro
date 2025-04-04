var express = require("express");
const { MongoClient } = require('mongodb');
var app = express();
const WebSocket = require('ws');
const path = require('path');


const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const dbName = 'TemperatureDB';

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

//asynchronous method to be executed to write info in the DB
async function writeToDb(temperature, timestamp, sensor) {
    // Use connect method to connect to the server
    await client.connect();
    console.log('Connected successfully to server');
    const db = client.db(dbName);
    const collection = db.collection('TemperatureDB');
    const doc = {
        value: temperature,
        timestamp: timestamp,
        sensorId: sensor,
        roomId: 'room1'
    };

    // insert the info in the database
    const insertResult = await collection.insertMany([doc]);
    console.log('Inserted documents =>', insertResult);
    return 'done.';
}

async function pushToWsClient(temperature){
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(temperature);
        }
    });
}

app.post("/temperature", (req, res, next) => {
    var temperature = req.body.temperature;
    var timestamp = req.body.timestamp;
    var sensor = req.body.sensor;
    pushToWsClient(temperature).catch();

    writeToDb(temperature, timestamp, sensor)
        .then(console.log)
        .catch(console.error)
        .finally(() => client.close());
    res.sendStatus(200);

});

//asynchronous method to be executed to write info in the DB
async function getLastTemperatureFromDB() {
    // Use connect method to connect to the server
    await client.connect();
    console.log('Connected successfully to server');
    const db = client.db(dbName);
    const collection = db.collection('TemperatureDB');
    const query = { timestamp: {$gt: 0}};
    const options = {
        // sort matched documents in descending order by timestamp
        sort: { timestamp: -1 },
    };

    //get all the documents that respect the query
    const filteredDocs = await collection.find(query, options).toArray();
    //get the first document that respect the query
    const filteredDoc = await collection.findOne(query, options);
    console.log('Found documents filtered by timestamp: {$gt: 0} =>', filteredDoc);

    return JSON.parse(JSON.stringify(filteredDoc));
}


app.get('/dashboard', async (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
})



