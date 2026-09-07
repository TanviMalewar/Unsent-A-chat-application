const Message = require('../models/message.model');
const Room = require('../models/room.model');
const { authenticateSocket } = require('../middlewares/socket.auth.middleware');

// In-memory store for online users
// Structure: userId -> Set of socketIds
const onlineUsers = new Map(); // userId -> Set(socketId)

// Helper to get socket ids for a user
function getUserSockets(userId) {
    return onlineUsers.get(userId) || new Set();
}

// Helper to check if user is online
function isUserOnline(userId) {
    const sockets = onlineUsers.get(userId);
    return sockets && sockets.size > 0;
}

// Helper to get online users in a specific room
function getOnlineUsersInRoom(roomId, io) {
    const users = [];
    const roomSockets = io.sockets.adapter.rooms.get(roomId);
    
    if (!roomSockets) {
        return users;
    }

    // Get all socket IDs in this room
    const socketIds = Array.from(roomSockets);
    
    // For each socket in the room, find if the user is online
    for (const socketId of socketIds) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket && socket.userId) {
            // Check if user has any active connections (should be true since socket is active)
            if (isUserOnline(socket.userId)) {
                users.push({
                    userId: socket.userId,
                    username: socket.user?.username || 'Unknown'
                });
            }
        }
    }
    
    return users;
}

const setupSocketHandlers = (io) => {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`);

    // Track user online - add this socket to user's socket set
    const userId = socket.userId.toString();
    if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);
    
    console.log(`User ${socket.user.username} now has ${onlineUsers.get(userId).size} active connection(s)`);

    socket.on('joinRoom', async ({ roomId }) => {
      try {
        if (!roomId) {
          socket.emit('error', { message: 'Room ID is required' });
          return;
        }

        const room = await Room.findOne({
          _id: roomId,
          participants: socket.userId
        });

        if (!room) {
          socket.emit('error', { message: 'Room not found or you are not a participant' });
          return;
        }

        const roomIdString = room._id.toString();
        socket.join(roomIdString);
        console.log(`${socket.user.username} joined room: ${roomIdString} (${room.name})`);

        // Get online users in this room (only those in this room)
        const onlineUsersInRoom = getOnlineUsersInRoom(roomIdString, io);
        
        // Send online users to the joining user
        socket.emit('roomUsers', {
          roomId: roomIdString,
          users: onlineUsersInRoom
        });

        // Notify others in the room about new user
        socket.to(roomIdString).emit('userOnline', {
          userId: socket.userId,
          username: socket.user.username,
          message: `${socket.user.username} is online`
        });

        // Fetch last 50 messages
        const messages = await Message.find({ room: room._id })
          .populate('sender', 'username email')
          .sort({ createdAt: -1 })
          .limit(50);

        socket.emit('roomHistory', {
          roomId: roomIdString,
          roomName: room.name,
          messages: messages.reverse()
        });

      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room: ' + error.message });
      }
    });

    socket.on('leaveRoom', ({ roomId }) => {
      try {
        if (!roomId) {
          socket.emit('error', { message: 'Room ID is required' });
          return;
        }

        socket.leave(roomId);
        console.log(`${socket.user.username} left room: ${roomId}`);
        
        // Check if user still has other sockets in this room before sending offline event
        // Get all sockets in this room
        const roomSockets = io.sockets.adapter.rooms.get(roomId);
        if (roomSockets) {
            // Check if any other socket from this user is still in the room
            let hasOtherSocketInRoom = false;
            for (const socketId of roomSockets) {
                const otherSocket = io.sockets.sockets.get(socketId);
                if (otherSocket && otherSocket.userId && otherSocket.userId.toString() === userId) {
                    hasOtherSocketInRoom = true;
                    break;
                }
            }
            
            // Only notify offline if no other sockets from this user are in the room
            if (!hasOtherSocketInRoom) {
                socket.to(roomId).emit('userOffline', {
                    userId: socket.userId,
                    username: socket.user.username,
                    message: `${socket.user.username} is offline`
                });
            }
        }

      } catch (error) {
        console.error('Leave room error:', error);
        socket.emit('error', { message: 'Failed to leave room' });
      }
    });

    socket.on('sendMessage', async ({ roomId, content }) => {
      try {
        console.log(`Message from ${socket.user.username} in room ${roomId}:`, content);

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
          socket.emit('error', { message: 'Room not found or you are not a participant' });
          return;
        }

        const message = new Message({
          room: roomId,
          sender: socket.userId,
          content: content.trim()
        });

        await message.save();
        await message.populate('sender', 'username email');

        io.to(roomId).emit('newMessage', {
          message,
          roomId
        });

        console.log(`Message from ${socket.user.username} broadcasted to room ${roomId}`);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message: ' + error.message });
      }
    });

    // Typing indicator events
    socket.on('typing', ({ roomId }) => {
      if (!roomId) return;
      socket.to(roomId).emit('userTyping', {
        userId: socket.userId,
        username: socket.user.username,
        roomId: roomId,
        isTyping: true
      });
    });

    socket.on('stopTyping', ({ roomId }) => {
      if (!roomId) return;
      socket.to(roomId).emit('userTyping', {
        userId: socket.userId,
        username: socket.user.username,
        roomId: roomId,
        isTyping: false
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user?.username || 'Unknown'} (${socket.id})`);
      
      // Remove this socket from user's socket set
      const userId = socket.userId?.toString();
      if (userId && onlineUsers.has(userId)) {
        const userSockets = onlineUsers.get(userId);
        userSockets.delete(socket.id);
        
        console.log(`User ${socket.user?.username} now has ${userSockets.size} active connection(s)`);
        
        // If no more sockets, remove user from onlineUsers
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          console.log(`User ${socket.user?.username} is now completely offline`);
          
          // Notify all rooms that this user is offline
          // We need to find all rooms this user was in and emit userOffline
          // This is done by checking all rooms
          for (const [roomId, roomSockets] of io.sockets.adapter.rooms) {
            // Check if this user's socket was in this room
            // Since we're in disconnect, we check if any other socket from this user is in the room
            let hasOtherSocketInRoom = false;
            for (const socketId of roomSockets) {
              const otherSocket = io.sockets.sockets.get(socketId);
              if (otherSocket && otherSocket.userId && otherSocket.userId.toString() === userId) {
                hasOtherSocketInRoom = true;
                break;
              }
            }
            
            if (!hasOtherSocketInRoom) {
              // This room no longer has any sockets from this user
              io.to(roomId).emit('userOffline', {
                userId: socket.userId,
                username: socket.user.username,
                message: `${socket.user.username} is offline`
              });
            }
          }
        }
      }
    });
  });
};

module.exports = { setupSocketHandlers };