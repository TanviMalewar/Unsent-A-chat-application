// src/sockets/socket.handler.js
const Message = require('../models/message.model');
const Room = require('../models/room.model');
const User = require('../models/user.model');
const { authenticateSocket } = require('../middlewares/socket.auth.middleware');

const setupSocketHandlers = (io) => {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`);

    // Update user online status
    User.findByIdAndUpdate(socket.userId, { isOnline: true, lastSeen: Date.now() })
      .then(() => console.log(`socket.user.username} is now online`))
      .catch(err => console.error('Error updating online status:', err));

    // Join a room
    socket.on('joinRoom', async ({ roomId }) => {
      try {
        if (!roomId) {
          socket.emit('error', { message: 'Room ID is required' });
          return;
        }

        // Check if room exists and user is a participant
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

        // Fetch last 50 messages
        const messages = await Message.find({ room: room._id })
          .populate('sender', 'username email')
          .sort({ createdAt: -1 })
          .limit(50);

        // Send room history
        socket.emit('roomHistory', {
          roomId: roomIdString,
          roomName: room.name,
          messages: messages.reverse()
        });

        // Notify others in the room
        socket.to(roomIdString).emit('userJoined', {
          userId: socket.userId,
          username: socket.user.username,
          message: `${socket.user.username} has joined the room`
        });

      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room: ' + error.message });
      }
    });

    // Leave a room
    socket.on('leaveRoom', ({ roomId }) => {
      try {
        if (!roomId) {
          socket.emit('error', { message: 'Room ID is required' });
          return;
        }

        socket.leave(roomId);
        console.log(`${socket.user.username} left room: ${roomId}`);
        
        socket.to(roomId).emit('userLeft', {
          userId: socket.userId,
          username: socket.user.username,
          message: `${socket.user.username} has left the room`
        });

      } catch (error) {
        console.error('Leave room error:', error);
        socket.emit('error', { message: 'Failed to leave room' });
      }
    });

    // Send a message (with authentication!)
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

        // Check if room exists and user is participant
        const room = await Room.findOne({
          _id: roomId,
          participants: socket.userId
        });

        if (!room) {
          socket.emit('error', { message: 'Room not found or you are not a participant' });
          return;
        }

        // Create message WITH sender (authenticated user!)
        const message = new Message({
          room: roomId,
          sender: socket.userId,
          content: content.trim()
        });

        await message.save();
        await message.populate('sender', 'username email');

        // Broadcast to room
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

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user?.username || 'Unknown'} (${socket.id})`);
      
      // Update user offline status
      if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, { 
          isOnline: false, 
          lastSeen: Date.now() 
        });
        console.log(`${socket.user?.username} is now offline`);
      }
    });
  });
};

module.exports = { setupSocketHandlers };