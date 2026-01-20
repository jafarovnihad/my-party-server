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
function updateRoomStats(room) {
    if (!room) return;
    
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
    // This logs every time a device connects
    console.log(`[CONNECT] Socket ID: ${socket.id}`);

    // --- Room Entry ---
    socket.on('join', (data) => {
        const { room, user } = data;
        
        socket.join(room);
        socket.currentRoom = room;
        socket.userName = user;

        // Log join event to Render
        console.log(`[JOIN] User: ${user} | Room: ${room}`);

        io.in(room).emit('receive_message', { text: `${user} joined`, isSystem: true });
        updateRoomStats(room);
    });

    // --- Sync Logic ---
    socket.on('video_event', (data) => {
        if (socket.currentRoom) {
            socket.to(socket.currentRoom).emit('sync_video', data);
        }
    });

    // --- Episode / URL Change ---
    socket.on('change_url', (data) => {
        if (socket.currentRoom) {
            // This is the line that captures the episode link in your logs
            console.log(`[EPISODE CHANGE] Room: ${socket.currentRoom} | User: ${data.user} | URL: ${data.url}`);
            
            socket.to(socket.currentRoom).emit('navigate_to', { 
                url: data.url, 
                user: data.user 
            });
        }
    });

    // --- Chat System ---
    socket.on('send_message', (data) => {
        if (socket.currentRoom) {
            // Log chat messages to Render
            console.log(`[CHAT] ${socket.currentRoom} | ${data.user}: ${data.text}`);
            io.in(socket.currentRoom).emit('receive_message', data);
        }
    });

    // --- Disconnect Handler ---
    socket.on('disconnect', () => {
        if (socket.currentRoom) {
            console.log(`[DISCONNECT] User: ${socket.userName} left Room: ${socket.currentRoom}`);
            updateRoomStats(socket.currentRoom);
        }
    });
});

// Health check to verify server is awake
app.get('/', (req, res) => {
    res.send('Server is live and logging.');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
