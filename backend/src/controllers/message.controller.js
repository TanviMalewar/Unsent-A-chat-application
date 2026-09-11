const mongoose = require('mongoose');
const Message = require('../models/message.model');
const Room = require('../models/room.model');

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { content, replyTo } = req.body;
    const roomId = req.params.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const room = await Room.findOne({
      _id: roomId,
      participants: req.user._id
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found or you are not a participant' });
    }

    const message = new Message({
      room: roomId,
      sender: req.user._id,
      content: content.trim(),
      replyTo: replyTo || null
    });

    await message.save();
    await message.populate('sender', 'name email');
    
    if (message.replyTo) {
      await message.populate({
        path: 'replyTo',
        select: 'content sender isDeleted',
        populate: {
          path: 'sender',
          select: 'name'
        }
      });
    }

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

    const room = await Room.findOne({
      _id: roomId,
      participants: req.user._id
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found or you are not a participant' });
    }

    const messages = await Message.find({ room: roomId })
      .populate('sender', 'name email')
      .populate({
        path: 'replyTo',
        select: 'content sender isDeleted',
        populate: {
          path: 'sender',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ room: roomId });

    res.json({
      success: true,
      messages: messages.reverse(),
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

// Edit a message
exports.editMessage = async (req, res) => {
    try {
        const { content } = req.body;
        const { id: roomId, messageId } = req.params;

        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Message content is required' });
        }

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        if (message.room.toString() !== roomId) {
            return res.status(400).json({ error: 'Message does not belong to this room' });
        }

        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'You can only edit your own messages' });
        }

        if (message.isDeleted) {
            return res.status(400).json({ error: 'Cannot edit deleted message' });
        }

        message.content = content.trim();
        message.isEdited = true;
        await message.save();

        await message.populate('sender', 'name email');
        await message.populate({
            path: 'replyTo',
            select: 'content sender isDeleted',
            populate: {
                path: 'sender',
                select: 'name'
            }
        });

        res.json({
            success: true,
            message
        });
    } catch (error) {
        console.error('Edit message error:', error);
        res.status(500).json({ error: error.message || 'Failed to edit message' });
    }
};

// Delete a message
exports.deleteMessage = async (req, res) => {
    try {
        const { id: roomId, messageId } = req.params;

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        if (message.room.toString() !== roomId) {
            return res.status(400).json({ error: 'Message does not belong to this room' });
        }

        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'You can only delete your own messages' });
        }

        if (message.isDeleted) {
            return res.status(400).json({ error: 'Message already deleted' });
        }

        message.isDeleted = true;
        message.content = 'This message was deleted';
        await message.save();

        await message.populate('sender', 'name email');

        res.json({
            success: true,
            message
        });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ error: error.message || 'Failed to delete message' });
    }
};