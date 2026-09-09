const Room = require('../models/room.model');

exports.createRoom = async (req, res) => {
  try {
    const { name, type, participants } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Room name is required' });
    }

    if (!type || !['direct', 'group'].includes(type)) {
      return res.status(400).json({ error: 'Valid room type (direct or group) is required' });
    }

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ error: 'At least one participant is required' });
    }

    // For direct messages
    if (type === 'direct') {
      // Direct messages should have exactly one other participant
      if (participants.length !== 1) {
        return res.status(400).json({ 
          error: 'Direct message requires exactly one other participant' 
        });
      }

      // Check if a direct room already exists between these two users
      const existingRoom = await Room.findOne({
        type: 'direct',
        participants: { 
          $all: [req.user._id, participants[0]],
          $size: 2
        }
      });

      if (existingRoom) {
        return res.status(400).json({ 
          error: 'Direct message room already exists between these users',
          room: existingRoom
        });
      }
    }

    // For group messages
    if (type === 'group') {
      // Groups should have at least 2 participants total (including creator)
      if (participants.length < 2) {
        return res.status(400).json({ 
          error: 'Group room requires at least 2 participants' 
        });
      }
    }

    // Create room - add creator to participants automatically
    const room = new Room({
      name: name.trim(),
      type,
      participants: [...participants, req.user._id], // Add creator as participant
      createdBy: req.user._id
    });

    await room.save();
    
    // Populate participant and creator details
    await room.populate('participants', 'username email');
    await room.populate('createdBy', 'username');

    res.status(201).json({
      success: true,
      room
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create room' 
    });
  }
};

// Get all rooms for current user
exports.getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({
      participants: req.user._id
    })
    .populate('participants', 'username email')
    .populate('createdBy', 'username')
    .sort({ updatedAt: -1 }); // Most recently active first

    // Format rooms for better display
    const formattedRooms = rooms.map(room => {
      const roomObj = room.toObject();
      
      // For direct messages, show other participant's name as display name
      if (room.type === 'direct') {
        const otherParticipant = room.participants.find(
          p => p._id.toString() !== req.user._id.toString()
        );
        roomObj.displayName = otherParticipant?.username || room.name;
      } else {
        roomObj.displayName = room.name;
      }

      return roomObj;
    });

    res.json({
      success: true,
      rooms: formattedRooms
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch rooms' 
    });
  }
};

// Get a single room by ID (only if user is a participant)
exports.getRoom = async (req, res) => {
  try {
    const room = await Room.findOne({
      _id: req.params.id,
      participants: req.user._id // Ensure user is in the room
    })
    .populate('participants', 'username email')
    .populate('createdBy', 'username');

    if (!room) {
      return res.status(404).json({ 
        error: 'Room not found or you are not a participant' 
      });
    }

    // Format response for direct messages
    const roomObj = room.toObject();
    if (room.type === 'direct') {
      const otherParticipant = room.participants.find(
        p => p._id.toString() !== req.user._id.toString()
      );
      roomObj.displayName = otherParticipant?.username || room.name;
    }

    res.json({
      success: true,
      room: roomObj
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch room' 
    });
  }
};