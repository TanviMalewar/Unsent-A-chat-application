// src/middlewares/socket.auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      console.log('Socket auth: No token provided');
      return next(new Error('Authentication required'));
    }

    console.log('Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);

    // IMPORTANT: Check what field names your token uses
    // Your token has "id" not "userId"
    let userId = decoded.id || decoded.userId || decoded._id || decoded.user_id;
    
    if (!userId) {
      console.log('No user ID found in token. Available fields:', Object.keys(decoded));
      return next(new Error('Invalid token structure'));
    }

    console.log('👤 Looking for user with ID:', userId);
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      console.log('User not found with ID:', userId);
      return next(new Error('User not found'));
    }

    console.log(`Socket auth: ${user.username} (${user._id}) authenticated`);
    socket.user = user;
    socket.userId = user._id;
    next();
    
  } catch (error) {
    console.error('Socket auth error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    }
    
    next(new Error('Authentication failed: ' + error.message));
  }
};

module.exports = { authenticateSocket };