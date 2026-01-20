const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Enable CORS so the extension can talk to the server
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    // 1. LOG: A connection is established
    console.log(`[CONNECT] New device connected: ${socket.id}`);

    // 2. JOIN: Handle room joining
    socket.on('join', (data) => {
        const { room, user } = data;
        
        socket.join(room);
        socket.currentRoom = room;
        socket.userName = user;

        // LOG: View in Render dashboard
        console.log(`[JOIN] ${user} entered room: ${room}`);

        // Notify others in the room
        io.in(room).emit('user_joined', user);
    });

    // 3. CHAT: Handle incoming messages
    socket.on('send_message', (data) => {
        if (socket.currentRoom) {
            // LOG: Monitor the chat content
            console.log(`[CHAT] ${socket.currentRoom} | ${data.user}: ${data.text}`);
            
            // Broadcast message to the entire room
            io.in(socket.currentRoom).emit('receive_message', data);
        }
    });

    // 4. SYNC: Handle video events (play, pause, seek)
    socket.on('video_event', (data) => {
        if (socket.currentRoom) {
            // LOG: Monitor sync actions (e.g., "Guest paused at 00:05:12")
            console.log(`[SYNC] ${data.user} ${data.type} at ${data.time} in ${socket.currentRoom}`);
            
            // Send to everyone in the room except the sender
            socket.to(socket.currentRoom).emit('sync_video', data);
        }
    });

    // 5. DISCONNECT: Handle user leaving
    socket.on('disconnect', () => {
        const user = socket.userName || "Unknown user";
        const room = socket.currentRoom || "no room";
        console.log(`[LEAVE] ${user} left ${room}`);
    });
});

// Use Render's assigned port or default to 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is live on port ${PORT}`);
});
