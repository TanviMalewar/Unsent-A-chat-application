const ChatApp = {
    socket: null,
    currentRoom: null,
    currentUser: null,
    rooms: [],
    unreadCounts: {},
    lastDateGroup: null,
    typingTimeout: null,

    init: function() {
        // Check authentication
        if (!Utils.isAuthenticated()) {
            window.location.href = '/login.html';
            return;
        }

        this.currentUser = Utils.getUser();
        if (!this.currentUser) {
            Utils.removeToken();
            window.location.href = '/login.html';
            return;
        }

        // Set globals
        window.currentRoom = null;
        window.unreadCounts = this.unreadCounts;
        window.lastDateGroup = null;
        window.ChatApp = this;
        window.switchRoom = this.switchRoom.bind(this);
        window.currentUser = this.currentUser;

        // Update UI
        document.getElementById('userBadge').textContent = this.currentUser.name;

        // Setup events
        this.setupEvents();

        // Load data
        this.loadRooms();
        this.connectSocket();

        // Auto-join first room
        setTimeout(() => {
            if (this.rooms.length > 0) {
                this.switchRoom(this.rooms[0]._id);
            }
        }, 500);
    },

    setupEvents: function() {
        // Send message
        document.getElementById('sendBtn').onclick = () => this.sendMessage();

        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Typing
        const input = document.getElementById('messageInput');
        input.addEventListener('input', () => {
            if (!this.socket || !this.currentRoom) return;
            this.socket.emit('typing', { roomId: this.currentRoom });
            clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout(() => {
                this.socket.emit('stopTyping', { roomId: this.currentRoom });
            }, 2000);
        });

        // Create room
        document.getElementById('createRoomBtn').onclick = () => {
            document.getElementById('createRoomModal').style.display = 'flex';
        };

        document.getElementById('createRoomForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createRoom();
        });

        // Logout
        document.getElementById('logoutBtn').onclick = () => {
            Utils.removeToken();
            Utils.removeUser();
            if (this.socket) this.socket.disconnect();
            window.location.href = '/login.html';
        };

        // Close modal
        document.getElementById('createRoomModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeModal();
        });
    },

    loadRooms: async function() {
        try {
            const data = await Utils.api('/rooms');
            this.rooms = data.rooms || [];
            renderRooms(this.rooms, this.currentRoom, this.unreadCounts);
        } catch (error) {
            document.getElementById('roomList').innerHTML = `
                <div class="loading-text">Failed to load rooms. 
                    <button onclick="ChatApp.loadRooms()">Retry</button>
                </div>
            `;
        }
    },

    switchRoom: function(roomId) {
        if (roomId === this.currentRoom) return;

        if (this.socket && this.currentRoom) {
            this.socket.emit('leaveRoom', { roomId: this.currentRoom });
        }

        this.currentRoom = roomId;
        window.currentRoom = roomId;
        this.unreadCounts[roomId] = 0;
        window.lastDateGroup = null;

        document.getElementById('messages').innerHTML = '<div class="loading-text">Loading messages...</div>';
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('messageInput').focus();

        renderRooms(this.rooms, roomId, this.unreadCounts);

        if (this.socket) {
            this.socket.emit('joinRoom', { roomId });
        }
    },

sendMessage: function() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();

    if (!content || !this.socket || !this.currentRoom) return;

    this.socket.emit('sendMessage', {
        roomId: this.currentRoom,
        content: content,
        replyTo: replyingTo || null
    });

    input.value = '';
    input.focus();

    if (replyingTo) {
        cancelReply();
    }
},

    createRoom: async function() {
        const name = document.getElementById('roomName').value.trim();
        const type = document.getElementById('roomType').value;
        const participants = document.getElementById('participantsInput').value
            .split(',').map(p => p.trim()).filter(p => p);

        if (!name) {
            alert('Room name required');
            return;
        }

        if (type === 'direct' && participants.length !== 1) {
            alert('Direct messages need exactly 1 participant');
            return;
        }

        try {
            const data = await Utils.api('/rooms', 'POST', { name, type, participants });
            this.closeModal();
            document.getElementById('createRoomForm').reset();
            await this.loadRooms();
            if (data.room) this.switchRoom(data.room._id);
        } catch (error) {
            alert(error.message || 'Failed to create room');
        }
    },

    closeModal: function() {
        document.getElementById('createRoomModal').style.display = 'none';
    },

    connectSocket: function() {
        const token = Utils.getToken();
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        this.socket = connectSocket(token, this.currentRoom, this.currentUser);
    }
};

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
    ChatApp.init();
});