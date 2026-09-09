ChatApp.connectSocket = function() {
    const token = Utils.getToken();
    if (!token) {
        console.error('No token found');
        return;
    }

    this.socket = io(window.location.origin, {
        transports: ['websocket', 'polling'],
        auth: { token }
    });

    const socket = this.socket;

    socket.on('connect', () => {
        console.log('Socket connected');
        this.updateStatus(true);
        if (this.currentRoom) {
            socket.emit('joinRoom', { roomId: this.currentRoom });
        }
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
        this.updateStatus(false);
    });

    socket.on('connect_error', (error) => {
        console.error('Socket error:', error);
        this.updateStatus(false);
    });

    socket.on('userInfo', (user) => {
        console.log('User info received:', user);
    });

    socket.on('roomHistory', ({ roomId, roomName, messages }) => {
        this.messages = messages;
        this.renderMessages(messages);
        this.updateRoomName(roomName);
    });

    socket.on('newMessage', ({ message, roomId }) => {
        if (roomId === this.currentRoom) {
            this.messages.push(message);
            this.renderMessages(this.messages);
        }
    });

    socket.on('roomUsers', ({ roomId, users }) => {
        if (roomId === this.currentRoom) {
            this.updateOnlineUsers(users);
        }
    });

    socket.on('userTyping', ({ userId, username, roomId, isTyping }) => {
        if (roomId === this.currentRoom && userId !== this.currentUser?._id) {
            this.updateTypingIndicator(username, isTyping);
        }
    });

    socket.on('error', ({ message }) => {
        console.error('Socket error:', message);
        const messagesEl = document.getElementById('messages');
        Utils.showInfo(message, 'error', messagesEl);
    });
};