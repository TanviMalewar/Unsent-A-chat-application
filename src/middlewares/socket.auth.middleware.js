const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * Socket.io authentication middleware
 * Verifies JWT token from socket handshake
 * Attaches user to socket if valid
 */
const authenticateSocket = async (socket, next) => {
  try {
    // Get token from handshake auth
    const token = socket.handshake.auth.token;
    
    if (!token) {
      console.log('Socket auth: No token provided');
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.log('Socket auth: User not found');
      return next(new Error('User not found'));
    }

    // Attach user to socket
    socket.user = user;
    socket.userId = user._id;
    
    console.log(`Socket auth: ${user.username} (${user._id}) authenticated`);
    next();
    
  } catch (error) {
    console.error('Socket auth error:', error.message);
    
    // Differentiate between token errors
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    }
    
    next(new Error('Authentication failed'));
  }
};

module.exports = { authenticateSocket };