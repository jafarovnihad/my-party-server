const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- Room Stats ---
function updateRoomStats(room) {
    if (!room) return;
    const sockets = io.sockets.adapter.rooms.get(room);
    const uniqueNames = new Set();
    if (sockets) {
        sockets.forEach(id => {
            const s = io.sockets.sockets.get(id);
            if (s && s.userName) uniqueNames.add(s.userName);
        });
    }
    const userList = Array.from(uniqueNames);
    io.in(room).emit('room_stats', { count: userList.length, users: userList });
}

io.on('connection', (socket) => {
    // --- Room Entry ---
    socket.on('join', (data) => {
        socket.join(data.room);
        socket.currentRoom = data.room;
        socket.userName = data.user;
        console.log(`[JOIN] ${data.user} -> ${data.room}`);
        updateRoomStats(data.room);
    });

    // --- Sync Logic ---
    socket.on('video_event', (data) => {
        if (socket.currentRoom) socket.to(socket.currentRoom).emit('sync_video', data);
    });

    // --- URL Change ---
    socket.on('change_url', (data) => {
        if (socket.currentRoom) {
            console.log(`[CHANGE] ${socket.currentRoom} | ${data.user} | ${data.url}`);
            socket.to(socket.currentRoom).emit('navigate_to', { url: data.url, user: data.user });
        }
    });

    // --- Chat System ---
    socket.on('send_message', (data) => {
        if (socket.currentRoom) {
            console.log(`[CHAT] ${socket.currentRoom} | ${data.user}: ${data.text}`);
            io.in(socket.currentRoom).emit('receive_message', data);
        }
    });

    // --- Disconnect ---
    socket.on('disconnect', () => {
        if (socket.currentRoom) {
            console.log(`[LEAVE] ${socket.userName}`);
            updateRoomStats(socket.currentRoom);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server live on ${PORT}`));
