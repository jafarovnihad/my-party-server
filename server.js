const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingTimeout: 60000,
    pingInterval: 25000
});

// --- Room Data Storage ---
const roomUsers = {}; 

function updateRoomStats(room) {
    if (!room) return;
    
    // Get all unique usernames currently in the room
    const sockets = io.sockets.adapter.rooms.get(room);
    const uniqueNames = new Set();
    
    if (sockets) {
        sockets.forEach(socketId => {
            const s = io.sockets.sockets.get(socketId);
            if (s && s.userName) uniqueNames.add(s.userName);
        });
    }

    const userList = Array.from(uniqueNames);
    io.in(room).emit('room_stats', { 
        count: userList.length,
        users: userList 
    });
}

io.on('connection', (socket) => {
    // --- Room Entry ---
    socket.on('join', (data) => {
        const { room, user } = data;
        
        socket.join(room);
        socket.currentRoom = room;
        socket.userName = user;

        io.in(room).emit('receive_message', { text: `${user} joined`, isSystem: true });
        updateRoomStats(room);
    });

    // --- Sync Logic ---
    socket.on('video_event', (data) => {
        if (socket.currentRoom) socket.to(socket.currentRoom).emit('sync_video', data);
    });

    socket.on('change_url', (data) => {
        if (socket.currentRoom) {
            socket.to(socket.currentRoom).emit('navigate_to', { url: data.url, user: data.user });
        }
    });

    // --- Chat System ---
    socket.on('send_message', (data) => {
        if (socket.currentRoom) io.in(socket.currentRoom).emit('receive_message', data);
    });

    // --- Disconnect Handler ---
    socket.on('disconnect', () => {
        if (socket.currentRoom) {
            updateRoomStats(socket.currentRoom);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server live on ${PORT}`));
