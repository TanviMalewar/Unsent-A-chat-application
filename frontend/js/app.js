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
        const userBadge = document.getElementById('userBadge');
        if (userBadge) {
            userBadge.textContent = this.currentUser.name;
        }

        // Setup events
        this.setupEvents();

        // Load rooms
        this.loadRooms();

        // Connect socket
        this.connectSocket();

        // Auto-join first room
        setTimeout(() => {
            if (this.rooms.length > 0 && !this.currentRoom) {
                this.switchRoom(this.rooms[0]._id);
            }
        }, 500);
    },

    setupEvents: function() {
        // Send message
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.onclick = () => this.sendMessage();
        }

        // Enter to send
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });

            // Typing indicator
            messageInput.addEventListener('input', () => {
                if (!this.socket || !this.currentRoom) return;

                this.socket.emit('typing', {
                    roomId: this.currentRoom
                });

                clearTimeout(this.typingTimeout);

                this.typingTimeout = setTimeout(() => {
                    if (this.socket && this.currentRoom) {
                        this.socket.emit('stopTyping', {
                            roomId: this.currentRoom
                        });
                    }
                }, 2000);
            });
        }

        // Create room
        const createRoomBtn = document.getElementById('createRoomBtn');

        if (createRoomBtn) {
            createRoomBtn.onclick = async () => {
                document.getElementById('createRoomModal').style.display = 'flex';

                await this.loadUsers();
            };
        }

        const createRoomForm = document.getElementById('createRoomForm');

        if (createRoomForm) {
            createRoomForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.createRoom();
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');

        if (logoutBtn) {
            logoutBtn.onclick = () => {
                Utils.removeToken();
                Utils.removeUser();

                if (this.socket) {
                    this.socket.disconnect();
                }

                window.location.href = '/login.html';
            };
        }

        // Close modal when clicking outside
        const createRoomModal = document.getElementById('createRoomModal');

        if (createRoomModal) {
            createRoomModal.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    this.closeModal();
                }
            });
        }
    },

    loadRooms: async function() {
        try {
            const data = await Utils.api('/rooms');

            this.rooms = data.rooms || [];

            renderRooms(
                this.rooms,
                this.currentRoom,
                this.unreadCounts
            );

        } catch (error) {
            document.getElementById('roomList').innerHTML = `
                <div class="loading-text">
                    Failed to load rooms.
                    <button onclick="ChatApp.loadRooms()">Retry</button>
                </div>
            `;
        }
    },

    loadUsers: async function() {
    const participantsList =
        document.getElementById('participantsList');

    try {
        const data = await Utils.api('/rooms/users');

        participantsList.innerHTML = '';

        if (!data.users || data.users.length === 0) {
            participantsList.innerHTML =
                '<div class="loading-text">No other users found.</div>';
            return;
        }

        data.users.forEach(user => {
            const label = document.createElement('label');
            label.className = 'participant-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = user._id;

            const info = document.createElement('div');
            info.className = 'participant-info';

            const name = document.createElement('span');
            name.className = 'participant-name';
            name.textContent = user.username;

            const email = document.createElement('small');
            email.textContent = user.email;

            info.appendChild(name);
            info.appendChild(email);

            label.appendChild(checkbox);
            label.appendChild(info);

            participantsList.appendChild(label);
        });

    } catch (error) {
        console.error('Load users error:', error);

        participantsList.innerHTML =
            '<div class="loading-text">Failed to load users.</div>';
    }
},

    switchRoom: function(roomId) {
        if (!roomId || String(roomId) === String(this.currentRoom)) {
            return;
        }

        // Leave previous Socket.IO room
        if (this.socket && this.currentRoom) {
            this.socket.emit('leaveRoom', {
                roomId: this.currentRoom
            });
        }

        this.currentRoom = roomId;
        window.currentRoom = roomId;

        // Reset unread count
        this.unreadCounts[roomId] = 0;

        // Reset date group
        window.lastDateGroup = null;

        // Clear reply state when changing rooms
        if (typeof cancelReply === 'function') {
            cancelReply();
        }

        // Clear selected attachment when changing rooms
        window.selectedAttachment = null;

        if (fileInput) {
            fileInput.value = '';
        }

        const attachmentPreview = document.getElementById('attachmentPreview');

        if (attachmentPreview) {
            attachmentPreview.remove();
        }

        // Show loading state
        const messagesEl = document.getElementById('messages');

        if (messagesEl) {
            messagesEl.innerHTML =
                '<div class="loading-text">Loading messages...</div>';
        }

        // Enable input controls
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const attachBtn = document.getElementById('attachBtn');

        if (messageInput) {
            messageInput.disabled = false;
        }

        if (sendBtn) {
            sendBtn.disabled = false;
        }

        if (attachBtn) {
            attachBtn.disabled = false;
        }

        if (messageInput) {
            messageInput.focus();
        }

        // Update room list
        renderRooms(
            this.rooms,
            roomId,
            this.unreadCounts
        );

        // Join Socket.IO room
        if (this.socket) {
            this.socket.emit('joinRoom', {
                roomId
            });
        }
    },

    sendMessage: function() {
        const input = document.getElementById('messageInput');
        const fileInput = document.getElementById('fileInput');

        const content = input
            ? input.value.trim()
            : '';

        const attachment = window.selectedAttachment || null;

        // Don't send an empty message without an attachment
        if (
            (!content && !attachment) ||
            !this.socket ||
            !this.currentRoom
        ) {
            return;
        }

        this.socket.emit('sendMessage', {
            roomId: this.currentRoom,
            content: content || null,
            replyTo: replyingTo || null,
            attachment: attachment
        });

        input.value = '';

        if (typeof clearAttachmentPreview === 'function') {
            clearAttachmentPreview();
        }

        input.focus();

        if (replyingTo) {
            cancelReply();
        }
    },
    createRoom: async function() {
    const nameInput = document.getElementById('roomName');
    const typeInput = document.getElementById('roomType');

    const name = nameInput.value.trim();
    const type = typeInput.value;

    const selectedParticipants = [
        ...document.querySelectorAll(
            '#participantsList input[type="checkbox"]:checked'
        )
    ];

    const participants = selectedParticipants.map(
        checkbox => checkbox.value
    );

    if (!name) {
        alert('Room name required');
        return;
    }

    if (type === 'direct' && participants.length !== 1) {
        alert('Direct messages need exactly 1 participant');
        return;
    }

    if (type === 'group' && participants.length < 2) {
        alert('Group room needs at least 2 participants');
        return;
    }

    try {
        const data = await Utils.api(
            '/rooms',
            'POST',
            {
                name,
                type,
                participants
            }
        );

        this.closeModal();

        document.getElementById('createRoomForm').reset();

        await this.loadRooms();

        if (data.room) {
            this.switchRoom(data.room._id);
        }

    } catch (error) {
        alert(
            error.message ||
            'Failed to create room'
        );
    }
},

    closeModal: function() {
        const modal = document.getElementById('createRoomModal');

        if (modal) {
            modal.style.display = 'none';
        }
    },

    connectSocket: function() {
        const token = Utils.getToken();

        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        this.socket = connectSocket(
            token,
            this.currentRoom,
            this.currentUser
        );
    }


};

// ===== INITIALIZE =====

document.addEventListener('DOMContentLoaded', () => {
    ChatApp.init();
});

