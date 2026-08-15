const express = require('express');
const router = express.Router({ mergeParams: true });
const { 
  sendMessage, 
  getMessages
} = require('../controllers/message.controller');

// Send a message
router.post('/messages', sendMessage);

// Get messages (paginated)
router.get('/messages', getMessages);

module.exports = router;