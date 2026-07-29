const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Serve the static files from the 'public' folder
app.use(express.static('public'));

const players = {};

io.on('connection', (socket) => {
    console.log('Player connected: ' + socket.id);
    
    // Assign team based on player count
    const team = Object.keys(players).length % 2 === 0 ? 'blue' : 'red';
    
    // Create new player state
    players[socket.id] = {
        x: team === 'blue' ? -30 : 30,
        y: 2,
        z: (Math.random() - 0.5) * 10,
        team: team,
        hp: 100
    };

    // Tell the new player about all existing players
    socket.emit('currentPlayers', players);
    
    // Tell everyone else a new player joined
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // Handle movement updates
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].z = movementData.z;
            // Broadcast the movement to everyone EXCEPT the sender
            socket.broadcast.emit('playerMoved', { id: socket.id, position: players[socket.id] });
        }
    });

    // Handle shooting
    socket.on('shoot', (data) => {
        // Broadcast the bullet to everyone else so they see the tracer
        socket.broadcast.emit('enemyShoot', { id: socket.id, dir: data.dir, origin: data.origin });
    });

    // Handle disconnections
    socket.on('disconnect', () => {
        console.log('Player disconnected: ' + socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
