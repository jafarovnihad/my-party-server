const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Enable CORS so the extension can talk to your Render server
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    // Heartbeat settings to help keep the connection alive on free hosting
    pingTimeout: 60000,
    pingInterval: 25000
});

io.on('connection', (socket) => {
    console.log(`[CONNECT] New device: ${socket.id}`);

    // --- JOIN ROOM ---
    socket.on('join', (data) => {
        const { room, user } = data;
        
        socket.join(room);
        socket.currentRoom = room;
        socket.userName = user;

        console.log(`[JOIN] ${user} joined room: ${room}`);

        // Notify everyone in the room (including the sender)
        io.in(room).emit('receive_message', { 
            text: `${user} joined the room`, 
            isSystem: true 
        });
    });

    // --- VIDEO SYNC ---
    socket.on('video_event', (data) => {
        if (socket.currentRoom) {
            console.log(`[SYNC] ${data.user} ${data.type} at ${data.time} in ${socket.currentRoom}`);
            
            // Broadcast the sync event to everyone EXCEPT the sender
            socket.to(socket.currentRoom).emit('sync_video', data);
        }
    });

    // --- CHAT MESSAGES ---
    socket.on('send_message', (data) => {
        if (socket.currentRoom) {
            console.log(`[CHAT] ${socket.currentRoom} | ${data.user}: ${data.text}`);
            
            // Send message to everyone in the room
            io.in(socket.currentRoom).emit('receive_message', data);
        }
    });

    // --- DISCONNECT ---
    socket.on('disconnect', () => {
        if (socket.currentRoom && socket.userName) {
            console.log(`[LEAVE] ${socket.userName} disconnected`);
            
            // Notify friends that this user left
            io.in(socket.currentRoom).emit('receive_message', { 
                text: `${socket.userName} disconnected`, 
                isSystem: true 
            });
        }
    });
});

// Use Render's dynamic port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Watch Party Server is live on port ${PORT}`);
});
