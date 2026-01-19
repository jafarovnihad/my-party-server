const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// This setup allows the extension to talk to the server
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// --- THIS IS THE "CONNECTION" BLOCK ---
io.on('connection', (socket) => {
    socket.on('join', (data) => {
        socket.join(data.room);
        socket.currentRoom = data.room;
        socket.userName = data.user;
        // Tell everyone in the room a new person joined
        io.in(data.room).emit('user_joined', data.user);
    });

    socket.on('video_event', (data) => {
        if (socket.currentRoom) {
            // Broadcast the event + the user who did it
            socket.to(socket.currentRoom).emit('sync_video', data);
        }
    });

    socket.on('send_message', (data) => {
        if (socket.currentRoom) {
            io.in(socket.currentRoom).emit('receive_message', data);
        }
    });
});
// --- END OF THE CONNECTION BLOCK ---

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

});
