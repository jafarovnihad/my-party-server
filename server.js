const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Configure Socket.io with CORS and Heartbeat settings for Render stability
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

io.on('connection', (socket) => {
    console.log(`[CONNECT] New device connected: ${socket.id}`);

    // --- 1. JOIN ROOM ---
    socket.on('join', (data) => {
        const { room, user } = data;
        
        socket.join(room);
        socket.currentRoom = room;
        socket.userName = user;

        console.log(`[JOIN] ${user} entered room: ${room}`);

        // Broadcast to everyone in the room that a new user joined
        io.in(room).emit('receive_message', { 
            text: `${user} joined the room`, 
            isSystem: true 
        });
    });

    // --- 2. VIDEO SYNC (Play/Pause/Seek) ---
    socket.on('video_event', (data) => {
        if (socket.currentRoom) {
            console.log(`[SYNC] ${data.user} ${data.type} at ${data.time} in ${socket.currentRoom}`);
            // Send to everyone except the person who triggered the event
            socket.to(socket.currentRoom).emit('sync_video', data);
        }
    });

    // --- 3. URL SYNC (Next Episode) ---
    socket.on('change_url', (data) => {
        if (socket.currentRoom) {
            console.log(`https://www.change.org/ ${data.user} moved to next episode in ${socket.currentRoom}`);
            // Send the new URL to everyone else in the room
            socket.to(socket.currentRoom).emit('navigate_to', {
                url: data.url,
                user: data.user
            });
        }
    });

    // --- 4. CHAT MESSAGES ---
    socket.on('send_message', (data) => {
        if (socket.currentRoom) {
            console.log(`[CHAT] ${socket.currentRoom} | ${data.user}: ${data.text}`);
            // Broadcast the chat message to everyone
            io.in(socket.currentRoom).emit('receive_message', data);
        }
    });

    // --- 5. DISCONNECT ---
    socket.on('disconnect', () => {
        if (socket.currentRoom && socket.userName) {
            console.log(`[LEAVE] ${socket.userName} disconnected`);
            // Notify the room that the user left
            io.in(socket.currentRoom).emit('receive_message', { 
                text: `${socket.userName} disconnected`, 
                isSystem: true 
            });
        }
    });
});

// Use Render's assigned port or default to 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Watch Party Server is live on port ${PORT}`);
});
