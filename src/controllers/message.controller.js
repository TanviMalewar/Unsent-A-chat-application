const mongoose = require('mongoose');
const Message = require('../models/message.model');
const Room = require('../models/room.model');

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const roomId = req.params.id;

    // Validate content
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Check if room exists and user is a participant
    const room = await Room.findOne({
      _id: roomId,
      participants: req.user._id
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found or you are not a participant' });
    }

    // Create message
    const message = new Message({
      room: roomId,
      sender: req.user._id,
      content: content.trim()
    });

    await message.save();
    
    // Populate sender details
    await message.populate('sender', 'username email');

    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to send message' 
    });
  }
};

// Get messages for a room (with pagination)
exports.getMessages = async (req, res) => {
  try {
    const roomId = req.params.id;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    // Check if room exists and user is a participant
    const room = await Room.findOne({
      _id: roomId,
      participants: req.user._id
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found or you are not a participant' });
    }

    // Get messages
    const messages = await Message.find({ room: roomId })
      .populate('sender', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Message.countDocuments({ room: roomId });

    res.json({
      success: true,
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch messages' 
    });
  }
};