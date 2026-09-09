const Message = require('../models/message.model');
const Room = require('../models/room.model');
const { authenticateSocket } = require('../middlewares/socket.auth.middleware');

// In-memory store: userId -> Set of socketIds
const onlineUsers = new Map();

function getUserSockets(userId) {
    return onlineUsers.get(userId) || new Set();
}

function isUserOnline(userId) {
    const sockets = onlineUsers.get(userId);
    return sockets && sockets.size > 0;
}

// Get unique online users in a specific room
function getOnlineUsersInRoom(roomId, io) {
    const users = [];
    const seen = new Set();

    const roomSockets = io.sockets.adapter.rooms.get(roomId);

    if (!roomSockets) {
        return users;
    }

    for (const socketId of roomSockets) {
        const socket = io.sockets.sockets.get(socketId);

        if (socket && socket.userId) {
            const userId = socket.userId.toString();

            if (!seen.has(userId) && isUserOnline(userId)) {
                seen.add(userId);

                users.push({
                    userId: userId,
                    username: socket.user?.name || 'Unknown'
                });
            }
        }
    }

    return users;
}

const setupSocketHandlers = (io) => {
    io.use(authenticateSocket);

    io.on('connection', (socket) => {

        const userId = socket.userId.toString();
        const username = socket.user.name;

        console.log(`User connected: ${username} (${socket.id})`);

        // -----------------------------
        // Track online user
        // -----------------------------

        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }

        onlineUsers.get(userId).add(socket.id);

        console.log(
            `User ${username} now has ${onlineUsers.get(userId).size} active connection(s)`
        );

        // Send logged-in user's information
        socket.emit('userInfo', {
            _id: socket.user._id,
            name: socket.user.name,
            email: socket.user.email
        });

        // -----------------------------
        // JOIN ROOM
        // -----------------------------

        socket.on('joinRoom', async ({ roomId }) => {
            try {
                if (!roomId) {
                    socket.emit('error', {
                        message: 'Room ID is required'
                    });
                    return;
                }

                const room = await Room.findOne({
                    _id: roomId,
                    participants: socket.userId
                });

                if (!room) {
                    socket.emit('error', {
                        message: 'Room not found or you are not a participant'
                    });
                    return;
                }

                const roomIdString = room._id.toString();

                // Join the Socket.IO room FIRST
                socket.join(roomIdString);

                console.log(
                    `${username} joined room: ${roomIdString} (${room.name})`
                );

                // Get everyone currently online in this room
                const users = getOnlineUsersInRoom(roomIdString, io);

                // Send updated online list to everyone in the room
                io.to(roomIdString).emit('roomUsers', {
                    roomId: roomIdString,
                    users
                });

                // Notify other users
                socket.to(roomIdString).emit('userOnline', {
                    userId: userId,
                    username: username,
                    message: `${username} is online`
                });

                // Fetch last 50 messages
                const messages = await Message.find({
                    room: room._id
                })
                    .populate('sender', 'name email')
                    .sort({ createdAt: -1 })
                    .limit(50);

                // Send history to joining user
                socket.emit('roomHistory', {
                    roomId: roomIdString,
                    roomName: room.name,
                    messages: messages.reverse()
                });

            } catch (error) {
                console.error('Join room error:', error);

                socket.emit('error', {
                    message: 'Failed to join room: ' + error.message
                });
            }
        });

        // -----------------------------
        // LEAVE ROOM
        // -----------------------------

        socket.on('leaveRoom', ({ roomId }) => {
            try {
                if (!roomId) {
                    socket.emit('error', {
                        message: 'Room ID is required'
                    });
                    return;
                }

                socket.leave(roomId);

                console.log(
                    `${username} left room: ${roomId}`
                );

                // Get updated users AFTER leaving
                const users = getOnlineUsersInRoom(roomId, io);

                // Update everyone remaining in room
                io.to(roomId).emit('roomUsers', {
                    roomId,
                    users
                });

                // Tell remaining users that this user left
                socket.to(roomId).emit('userOffline', {
                    userId: userId,
                    username: username,
                    message: `${username} is offline`
                });

            } catch (error) {
                console.error('Leave room error:', error);

                socket.emit('error', {
                    message: 'Failed to leave room'
                });
            }
        });

        // -----------------------------
        // SEND MESSAGE
        // -----------------------------

        socket.on('sendMessage', async ({ roomId, content }) => {
            try {
                console.log(
                    `Message from ${username} in room ${roomId}:`,
                    content
                );

                if (!roomId) {
                    socket.emit('error', {
                        message: 'Room ID is required'
                    });
                    return;
                }

                if (!content || content.trim() === '') {
                    socket.emit('error', {
                        message: 'Message content is required'
                    });
                    return;
                }

                const room = await Room.findOne({
                    _id: roomId,
                    participants: socket.userId
                });

                if (!room) {
                    socket.emit('error', {
                        message: 'Room not found or you are not a participant'
                    });
                    return;
                }

                const message = new Message({
                    room: roomId,
                    sender: socket.userId,
                    content: content.trim()
                });

                await message.save();

                // Populate sender name
                await message.populate('sender', 'name email');

                // Send message to everyone in room
                io.to(roomId).emit('newMessage', {
                    message,
                    roomId
                });

                console.log(
                    `Message from ${username} broadcasted to room ${roomId}`
                );

            } catch (error) {
                console.error('Send message error:', error);

                socket.emit('error', {
                    message: 'Failed to send message: ' + error.message
                });
            }
        });

        // -----------------------------
        // TYPING
        // -----------------------------

        socket.on('typing', ({ roomId }) => {
            if (!roomId) return;

            socket.to(roomId).emit('userTyping', {
                userId: userId,
                username: username,
                roomId: roomId,
                isTyping: true
            });
        });

        // -----------------------------
        // STOP TYPING
        // -----------------------------

        socket.on('stopTyping', ({ roomId }) => {
            if (!roomId) return;

            socket.to(roomId).emit('userTyping', {
                userId: userId,
                username: username,
                roomId: roomId,
                isTyping: false
            });
        });

        // -----------------------------
        // DISCONNECTING
        // -----------------------------

        socket.on('disconnecting', () => {
            console.log(
                `User disconnecting: ${username} (${socket.id})`
            );

            // Capture rooms BEFORE Socket.IO removes the socket
            const rooms = Array.from(socket.rooms).filter(
                room => room !== socket.id
            );

            // Remove socket from user's socket set
            if (onlineUsers.has(userId)) {
                const userSockets = onlineUsers.get(userId);

                userSockets.delete(socket.id);

                console.log(
                    `User ${username} now has ${userSockets.size} active connection(s)`
                );

                // User has no more active connections
                if (userSockets.size === 0) {
                    onlineUsers.delete(userId);

                    console.log(
                        `User ${username} is now completely offline`
                    );
                }
            }

            // Update every room this socket was in
            for (const roomId of rooms) {

                // socket is still technically in the room during
                // disconnecting, so get the remaining users manually
                const roomSockets = io.sockets.adapter.rooms.get(roomId);
                const users = [];
                const seen = new Set();

                if (roomSockets) {
                    for (const socketId of roomSockets) {
                        if (socketId === socket.id) continue;

                        const otherSocket =
                            io.sockets.sockets.get(socketId);

                        if (
                            otherSocket &&
                            otherSocket.userId
                        ) {
                            const otherUserId =
                                otherSocket.userId.toString();

                            if (!seen.has(otherUserId)) {
                                seen.add(otherUserId);

                                users.push({
                                    userId: otherUserId,
                                    username:
                                        otherSocket.user?.name ||
                                        'Unknown'
                                });
                            }
                        }
                    }
                }

                // Update online list
                socket.to(roomId).emit('roomUsers', {
                    roomId,
                    users
                });

                // Notify room if this user has no other connection
                const remainingUserSockets =
                    getUserSockets(userId);

                if (remainingUserSockets.size === 0) {
                    socket.to(roomId).emit('userOffline', {
                        userId: userId,
                        username: username,
                        message: `${username} is offline`
                    });
                }
            }
        });
    });
};

module.exports = { setupSocketHandlers };