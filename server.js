const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

function updateRoomStats(room) {
    if (!room) return;
    const sockets = io.sockets.adapter.rooms.get(room);
    const uniqueNames = new Set();
    if (sockets) {
        sockets.forEach(id => {
            const s = io.sockets.sockets.get(id);
            if (s && s.userName && s.hasJoined) uniqueNames.add(s.userName);
        });
    }
    const userList = Array.from(uniqueNames);
    io.in(room).emit('room_stats', { count: userList.length, users: userList });
}

io.on('connection', (socket) => {
    socket.hasJoined = false;
    
    socket.on('join', (data) => {
        if (!socket.currentRoom) {
            socket.join(data.room);
            socket.currentRoom = data.room;
            socket.userName = data.user;
            console.log(`[JOIN] ${data.user} -> ${data.room}`);
        }
        
        if (data.activate) {
            socket.hasJoined = true;
            console.log(`[ACTIVATED] ${data.user} in ${data.room}`);
            updateRoomStats(socket.currentRoom);
        }
    });
    
    socket.on('video_event', (data) => {
        console.log(`[VIDEO] ${socket.userName || 'anon'} | ${data.type}`);
        if (socket.hasJoined && socket.currentRoom) {
            socket.to(socket.currentRoom).emit('sync_video', data);
        }
    });
    
    socket.on('change_url', (data) => {
        console.log(`[CHANGE] ${socket.currentRoom || 'none'} | ${data.user} | ${data.url}`);
        if (socket.hasJoined && socket.currentRoom) {
            socket.to(socket.currentRoom).emit('navigate_to', { url: data.url, user: data.user });
        }
    });
    
    socket.on('send_message', (data) => {
        console.log(`[CHAT] ${socket.currentRoom || 'none'} | ${data.user}: ${data.text}`);
        if (socket.hasJoined && socket.currentRoom) {
            io.in(socket.currentRoom).emit('receive_message', data);
        }
    });
    
    socket.on('disconnect', () => {
        if (socket.currentRoom) {
            console.log(`[LEAVE] ${socket.userName || 'anon'}`);
            if (socket.hasJoined) {
                updateRoomStats(socket.currentRoom);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server live on ${PORT}`));
