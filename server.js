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
    console.log('A friend joined! ID:', socket.id);

    // 1. Logic for Joining a Room
    socket.on('join', (roomName) => {
        socket.join(roomName);
        socket.currentRoom = roomName;
        console.log(`User joined room: ${roomName}`);
    });

    // 2. Logic for Video Syncing (Play/Pause/Seek)
    socket.on('video_event', (data) => {
        if (socket.currentRoom) {
            socket.to(socket.currentRoom).emit('sync_video', data);
        }
    });

    // 3. Logic for the Chat Messages
    socket.on('send_message', (data) => {
        if (socket.currentRoom) {
            // This sends the message to everyone in the room
            io.in(socket.currentRoom).emit('receive_message', {
                user: data.user,
                text: data.text
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('A friend left.');
    });
});
// --- END OF THE CONNECTION BLOCK ---

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});