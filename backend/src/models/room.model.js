const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['direct', 'group'],
    default: 'group'
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

roomSchema.pre('save', function(next) {
  if (this.type === 'direct' && this.participants.length !== 2) {
    return next(new Error('Direct message room must have exactly 2 participants'));
  }
  if (this.type === 'group' && this.participants.length < 2) {
    return next(new Error('Group room must have at least 2 participants'));
  }
  //next();
});

roomSchema.index({ participants: 1 });
roomSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Room', roomSchema);