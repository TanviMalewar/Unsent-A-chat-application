const express = require('express');
const router = express.Router({ mergeParams: true });
const { 
    sendMessage, 
    getMessages,
    editMessage,
    deleteMessage
} = require('../controllers/message.controller');

// Send a message
router.post('/messages', sendMessage);

// Get messages (paginated)
router.get('/messages', getMessages);

// Edit a message
router.put('/messages/:messageId', editMessage);

// Delete a message
router.delete('/messages/:messageId', deleteMessage);

module.exports = router;