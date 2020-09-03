'use strict';

const os = require('os');
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const socketIO = require('socket.io');

const app = express();
const http = require('http').createServer(app)

app.set('trust proxy', 1) ;

app.use(cors({origin: "https://cdn.openfin.co", credentials: true}));

app.use(
  session({
    resave: true,
    saveUninitialized: true,
    secret: "OpenFinWebRtc",
    cookie: { secure: true, sameSite: "none" }
  })
);

app.get("/app.json", (req, res) => {
  const appjson = require('./appjson').appjson;
  let protocol = req.hostname === 'localhost' ? 'http' : 'https';
  let room = "openfin";
  if (req.query.room) {
    room = req.query.room;
  }

  appjson.startup_app.url = `${protocol}://${req.get("host")}/index.html#${room}`;
  res.json(appjson)
});

app.use("/", express.static("."));

var io = socketIO(http);
io.sockets.on('connection', function(socket) {

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('message', function(message) {
    log('Client said: ', message);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit('message', message);
  });

  socket.on('create or join', function(room) {
    log('Received request to create or join room ' + room);

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 0) {
      socket.join(room);
      log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);
    } else if (numClients === 1) {
      log('Client ID ' + socket.id + ' joined room ' + room);
      // io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      io.sockets.in(room).emit('ready', room);
      socket.broadcast.emit('ready', room);
    } else { // max two clients
      socket.emit('full', room);
    }
  });

  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('disconnect', function(reason) {
    console.log(`Peer or server disconnected. Reason: ${reason}.`);
    socket.broadcast.emit('bye');
  });

  socket.on('bye', function(room) {
    console.log(`Peer said bye on room ${room}.`);
  });
});

http.listen(8080, () => {
  console.log('listening on *:8080');
});
