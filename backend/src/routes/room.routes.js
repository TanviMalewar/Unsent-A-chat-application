// routes/rooms.js
const express = require('express');
const router = express.Router();
const { 
  createRoom, 
  getRooms, 
  getRoom,
  getUsers
} = require('../controllers/room.controller');

// All routes require authentication (added in server.js)

// Create a new room
router.post('/', createRoom);

// Get all rooms for current user
router.get('/', getRooms);

// Get users for participant selection
router.get('/users', getUsers);

// Get a specific room by ID
router.get('/:id', getRoom);

module.exports = router;