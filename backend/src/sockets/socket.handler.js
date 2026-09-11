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
                    name: socket.user?.name || 'Unknown'
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
        const name = socket.user.name;

        console.log(`User connected: ${name} (${socket.id})`);

        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }

        onlineUsers.get(userId).add(socket.id);

        console.log(
            `User ${name} now has ${onlineUsers.get(userId).size} active connection(s)`
        );

        // Send logged-in user's information
        socket.emit('userInfo', {
            _id: socket.user._id,
            name: socket.user.name,
            email: socket.user.email
        });

        socket.on('joinRoom', async ({ roomId }) => {
            try {
                if (!roomId) {
                    socket.emit('error', {
                        message: 'Room ID is required'
                    });
                    return;
                }

                // Check that the user belongs to this room
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
                    `${name} joined room: ${roomIdString} (${room.name})`
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
                    name: name,
                    message: `${name} is online`
                });

                // FETCH LATEST 50 MESSAGES
                const messages = await Message.find({
                    room: room._id
                })
                .populate('sender', 'name email')
                .populate({
                path: 'replyTo',
                populate: {
                    path: 'sender',
                    select: 'name email'
                }
            })
            .sort({ createdAt: -1, _id: -1 })
            .limit(50);

        // If we received exactly 50 messages,
        // there may be older messages available.
            const hasMore = messages.length === 50;

        // Send messages oldest → newest to frontend
            socket.emit('roomHistory', {
                    roomId: roomIdString,
                    roomName: room.name,
                    messages: messages.reverse(),
                    hasMore
            });

            } catch (error) {
                console.error('Join room error:', error);

                socket.emit('error', {
                    message: 'Failed to join room: ' + error.message
                });
            }
        });

        socket.on('loadOlderMessages', async ({ roomId, oldestMessageId }) => {
            try {
                if (!roomId || !oldestMessageId) {
                    socket.emit('error', {
                        message: 'Room ID and oldest message ID are required'
                    });
                    return;
               }

               // Verify that the user is a participant of this room
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

               // Find the oldest message currently loaded on the client
               const oldestMessage = await Message.findOne({
                   _id: oldestMessageId,
                   room: roomId
               });

               if (!oldestMessage) {
                   socket.emit('error', {
                       message: 'Oldest message not found'
                   });
                   return;
               }

               // Fetch 50 messages older than the oldest loaded message
               const messages = await Message.find({
                   room: roomId,
                   $or: [
                       {
                           createdAt: {
                               $lt: oldestMessage.createdAt
                           }
                       },
                       {
                           createdAt: oldestMessage.createdAt,
                           _id: {
                               $lt: oldestMessage._id
                           }
                       }
                   ]
               })
                   .populate('sender', 'name email')
                   .populate({
                       path: 'replyTo',
                       populate: {
                           path: 'sender',
                           select: 'name email'
                       }
                   })
                   .sort({ createdAt: -1, _id: -1 })
                   .limit(50);

               const hasMore = messages.length === 50;

               // Send oldest → newest
               socket.emit('olderMessages', {
                   roomId: roomId,
                   messages: messages.reverse(),
                   hasMore
               });

           } catch (error) {
               console.error('Load older messages error:', error);

               socket.emit('error', {
                   message: 'Failed to load older messages: ' + error.message
               });
           }
}       );

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
                    `${name} left room: ${roomId}`
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
                    uname: name,
                    message: `${name} is offline`
                });

            } catch (error) {
                console.error('Leave room error:', error);

                socket.emit('error', {
                    message: 'Failed to leave room'
                });
            }
        });

        socket.on('sendMessage', async ({ roomId, content, replyTo }) => {
    try {
        console.log('=== SEND MESSAGE DEBUG ===');
        console.log('socket.userId:', socket.userId);
        console.log('socket.user._id:', socket.user._id);
        console.log('socket.user.name:', socket.user.name);
        console.log('sender value used:', socket.userId);
        console.log('replyTo:', replyTo);

        if (!roomId) {
            socket.emit('error', { message: 'Room ID is required' });
            return;
        }

        if (!content || content.trim() === '') {
            socket.emit('error', { message: 'Message content is required' });
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
            content: content.trim(),
            replyTo: replyTo || null
        });

        await message.save();

        await message.populate([
            {
                path: 'sender',
                select: 'name email'
            },
            {
                path: 'replyTo',
                populate: {
                    path: 'sender',
                    select: 'name email'
                }
            }
        ]);

        io.to(roomId).emit('newMessage', {
            message,
            roomId
        });

        console.log(`Message from ${name} broadcasted to room ${roomId}`);

    } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', {
            message: 'Failed to send message: ' + error.message
        });
    }
        });

        socket.on('typing', ({ roomId }) => {
            if (!roomId) return;

            socket.to(roomId).emit('userTyping', {
                userId: userId,
                name: name,
                roomId: roomId,
                isTyping: true
            });
        });

        socket.on('stopTyping', ({ roomId }) => {
            if (!roomId) return;

            socket.to(roomId).emit('userTyping', {
                userId: userId,
                name: name,
                roomId: roomId,
                isTyping: false
            });
        });

        socket.on('disconnecting', () => {
            console.log(
                `User disconnecting: ${name} (${socket.id})`
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
                    `User ${name} now has ${userSockets.size} active connection(s)`
                );

                // User has no more active connections
                if (userSockets.size === 0) {
                    onlineUsers.delete(userId);

                    console.log(
                        `User ${name} is now completely offline`
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
                                    name:
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
                        name: name,
                        message: `${name} is offline`
                    });
                }
            }
        });

        // Edit message via socket
        socket.on('editMessage', async ({ roomId, messageId, content }) => {
            try {
                if (!roomId || !messageId || !content || content.trim() === '') {
                    socket.emit('error', { message: 'Invalid edit request' });
                    return;
                }

                const message = await Message.findById(messageId);

                if (!message) {
                    socket.emit('error', { message: 'Message not found' });
                    return;
                }

                // Authorization: only sender can edit
                if (message.sender.toString() !== socket.userId.toString()) {
                    socket.emit('error', { message: 'You can only edit your own messages' });
                    return;
                }

                if (message.isDeleted) {
                    socket.emit('error', { message: 'Cannot edit deleted message' });
                    return;
                }

                // Update message
                message.content = content.trim();
                message.isEdited = true;
                await message.save();
                await message.populate('sender', 'name email');

                // Broadcast to room
                io.to(roomId).emit('messageEdited', {
                    messageId: message._id,
                    content: message.content,
                    isEdited: message.isEdited
                });

                console.log(`Message edited by ${socket.user.name}`);

            } catch (error) {
                console.error('Edit message error:', error);
                socket.emit('error', { message: 'Failed to edit message' });
            }
        });

        // Delete message via socket
        socket.on('deleteMessage', async ({ roomId, messageId }) => {
            try {
                if (!roomId || !messageId) {
                    socket.emit('error', { message: 'Invalid delete request' });
                    return;
                }

                const message = await Message.findById(messageId);

                if (!message) {
                    socket.emit('error', { message: 'Message not found' });
                    return;
                }

                // Authorization: only sender can delete
                if (message.sender.toString() !== socket.userId.toString()) {
                    socket.emit('error', { message: 'You can only delete your own messages' });
                    return;
                }

                if (message.isDeleted) {
                    socket.emit('error', { message: 'Message already deleted' });
                    return;
                }

                // Soft delete
                message.isDeleted = true;
                message.content = 'This message was deleted';
                await message.save();

                // Broadcast to room
                io.to(roomId).emit('messageDeleted', {
                    messageId: message._id
                });

                console.log(`Message deleted by ${socket.user.name}`);

            } catch (error) {
                console.error('Delete message error:', error);
                socket.emit('error', { message: 'Failed to delete message' });
            }
        }); 
    });
};

module.exports = { setupSocketHandlers };