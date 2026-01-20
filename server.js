const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// --- Utility Functions ---
function updateRoomCount(room) {
    if (!room) return;
    const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
    io.in(room).emit('room_count', { count: roomSize });
}

io.on('connection', (socket) => {
    console.log(`[CONNECT] ${socket.id}`);

    // --- Room Entry ---
    socket.on('join', (data) => {
        const { room, user } = data;
        
        socket.join(room);
        socket.currentRoom = room;
        socket.userName = user;

        console.log(`[JOIN] ${user} -> ${room}`);

        io.in(room).emit('receive_message', { 
            text: `${user} joined the room`, 
            isSystem: true 
        });

        updateRoomCount(room);
    });

    // --- Video Sync Logic ---
    socket.on('video_event', (data) => {
        if (socket.currentRoom) {
            socket.to(socket.currentRoom).emit('sync_video', data);
        }
    });

    // --- Episode / URL Change ---
    socket.on('change_url', (data) => {
        if (socket.currentRoom) {
            console.log(`https://www.change.org/ ${socket.currentRoom} | ${data.user} | ${data.url}`);
            
            socket.to(socket.currentRoom).emit('navigate_to', {
                url: data.url,
                user: data.user
            });
        }
    });

    // --- Chat System ---
    socket.on('send_message', (data) => {
        if (socket.currentRoom) {
            io.in(socket.currentRoom).emit('receive_message', data);
        }
    });

    // --- Disconnect Handler ---
    socket.on('disconnect', () => {
        if (socket.currentRoom && socket.userName) {
            console.log(`[LEAVE] ${socket.userName}`);
            
            io.in(socket.currentRoom).emit('receive_message', { 
                text: `${socket.userName} disconnected`, 
                isSystem: true 
            });

            updateRoomCount(socket.currentRoom);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server live on port ${PORT}`);
});
