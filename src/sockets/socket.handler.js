// src/sockets/socket.handler.js
const Message = require('../models/message.model');
const Room = require('../models/room.model');

const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join a room
    socket.on('joinRoom', async ({ roomId }) => {
      try {
        // Validate roomId
        if (!roomId) {
          socket.emit('error', { message: 'Room ID is required' });
          return;
        }

        // Check if room exists
        const room = await Room.findById(roomId);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Join the Socket.IO room
        socket.join(roomId);
        console.log(`User ${socket.id} joined room: ${roomId}`);

        // Fetch last 50 messages
        const messages = await Message.find({ room: roomId })
          .populate('sender', 'username email')
          .sort({ createdAt: -1 })
          .limit(50);

        // Send room history (chronological order)
        socket.emit('roomHistory', {
          roomId,
          messages: messages.reverse()
        });

        // Notify others in the room
        socket.to(roomId).emit('userJoined', {
          socketId: socket.id,
          message: 'A user has joined the room'
        });

      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
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
        console.log(`User ${socket.id} left room: ${roomId}`);
        
        socket.to(roomId).emit('userLeft', {
          socketId: socket.id,
          message: 'A user has left the room'
        });

      } catch (error) {
        console.error('Leave room error:', error);
        socket.emit('error', { message: 'Failed to leave room' });
      }
    });

    // Send a message (REAL-TIME!)
    socket.on('sendMessage', async ({ roomId, content }) => {
      try {
        console.log(`Message received from ${socket.id} in room ${roomId}:`, content);

        // Validate roomId
        if (!roomId) {
          socket.emit('error', { message: 'Room ID is required' });
          return;
        }

        // Validate content
        if (!content || content.trim() === '') {
          socket.emit('error', { message: 'Message content is required' });
          return;
        }

        // Check if room exists
        const room = await Room.findById(roomId);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const message = new Message({
          room: roomId,
          content: content.trim()
        });

        await message.save();
        await message.populate('sender', 'username email');

        // Broadcast to EVERYONE in the room (including sender)
        io.to(roomId).emit('newMessage', {
          message,
          roomId
        });

        console.log(`Message broadcasted to room ${roomId}`);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};

module.exports = { setupSocketHandlers };