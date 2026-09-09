const ChatApp = {
    socket: null,
    currentRoom: null,
    currentUser: null,
    rooms: [],
    messages: [],
    onlineUsers: [],
    typingUsers: [],

    init: function() {
        console.log('Initializing ChatApp...');
        
        if (!Utils.isAuthenticated()) {
            console.log('Not authenticated, redirecting to login');
            window.location.href = '/login.html';
            return;
        }

        this.currentUser = Utils.getUser();
        if (!this.currentUser || !this.currentUser._id) {
            console.log('No user data found, redirecting to login');
            Utils.removeToken();
            Utils.removeUser();
            window.location.href = '/login.html';
            return;
        }

        console.log('User authenticated:', this.currentUser.username);
        this.updateUserUI();
        this.setupEventListeners();
        this.loadRooms();
        this.connectSocket();

        const lastRoom = sessionStorage.getItem('lastRoom');
        if (lastRoom) {
            console.log('Restoring last room:', lastRoom);
            setTimeout(() => this.switchRoom(lastRoom), 500);
        }
    },

    setupEventListeners: function() {
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }

        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }

        const createRoomBtn = document.getElementById('createRoomBtn');
        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', () => {
                document.getElementById('createRoomModal').style.display = 'flex';
            });
        }

        const createRoomForm = document.getElementById('createRoomForm');
        if (createRoomForm) {
            createRoomForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createRoom();
            });
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                console.log('Logging out...');
                Utils.removeToken();
                Utils.removeUser();
                if (this.socket) {
                    this.socket.disconnect();
                }
                window.location.href = '/login.html';
            });
        }
    },

    updateUserUI: function() {
        const badge = document.getElementById('userBadge');
        if (badge && this.currentUser) {
            badge.textContent = this.currentUser.username;
            badge.classList.remove('hidden');
        }
    },

    updateStatus: function(connected) {
        const badge = document.getElementById('statusBadge');
        if (badge) {
            badge.textContent = connected ? 'Online' : 'Offline';
            badge.className = 'header-status ' + (connected ? 'online' : 'offline');
        }
    },

    updateRoomName: function(name) {
        const display = document.getElementById('roomDisplay');
        if (display) {
            if (name) {
                display.textContent = name;
                display.classList.remove('hidden');
            } else {
                display.classList.add('hidden');
            }
        }
    },

    updateOnlineUsers: function(users) {
        this.onlineUsers = users || [];
        const container = document.getElementById('onlineUsersList');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.onlineUsers.forEach(user => {
            if (user.userId === this.currentUser?._id) return;
            const tag = document.createElement('span');
            tag.className = 'online-user-tag';
            tag.textContent = user.username;
            container.appendChild(tag);
        });

        const usersCount = document.getElementById('chatRoomUsers');
        if (usersCount) {
            usersCount.textContent = (this.onlineUsers.length > 0 ? this.onlineUsers.length : 0) + ' online';
        }
    },

    updateTypingIndicator: function(username, isTyping) {
        const el = document.getElementById('typingIndicator');
        if (!el) return;
        
        if (isTyping) {
            if (!this.typingUsers.includes(username)) {
                this.typingUsers.push(username);
            }
            
            if (this.typingUsers.length === 1) {
                el.textContent = this.typingUsers[0] + ' is typing...';
            } else {
                el.textContent = this.typingUsers.join(', ') + ' are typing...';
            }
            el.className = 'typing-indicator active';
        } else {
            this.typingUsers = this.typingUsers.filter(u => u !== username);
            
            if (this.typingUsers.length === 0) {
                el.textContent = '';
                el.className = 'typing-indicator';
            } else {
                if (this.typingUsers.length === 1) {
                    el.textContent = this.typingUsers[0] + ' is typing...';
                } else {
                    el.textContent = this.typingUsers.join(', ') + ' are typing...';
                }
            }
        }
    },

    loadRooms: async function() {
        try {
            console.log('Loading rooms...');
            const response = await Utils.api('/rooms');
            console.log('Rooms response:', response);
            this.rooms = response.rooms || [];
            this.renderRooms(this.rooms);
        } catch (error) {
            console.error('Failed to load rooms:', error);
            const container = document.getElementById('roomList');
            if (container) {
                container.innerHTML = `
                    <div class="loading-text" style="color: #dc3545;">
                        Failed to load rooms
                        <br>
                        <span style="font-size: 12px; color: #666;">
                            ${error.message || 'Unknown error'}
                        </span>
                        <br>
                        <button class="btn btn-sm btn-outline" onclick="ChatApp.loadRooms()" style="margin-top: 8px;">
                            Retry
                        </button>
                    </div>
                `;
            }
        }
    },

    renderRooms: function(rooms) {
        const container = document.getElementById('roomList');
        if (!container) return;
        
        if (!rooms || rooms.length === 0) {
            container.innerHTML = `
                <div class="loading-text">
                    No rooms yet
                    <br>
                    <span style="font-size: 12px; color: #666;">
                        Create a new room using the + New button
                    </span>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        rooms.forEach(room => {
            const item = document.createElement('div');
            item.className = 'room-item';
            if (room._id === this.currentRoom) {
                item.classList.add('active');
            }
            
            const displayName = room.displayName || room.name;
            
            item.innerHTML = `
                <div class="room-info">
                    <span class="room-name">${displayName}</span>
                </div>
                <div class="room-preview">${room.lastMessage?.content || 'No messages yet'}</div>
            `;
            
            item.addEventListener('click', () => {
                this.switchRoom(room._id);
            });
            
            container.appendChild(item);
        });
    },

    switchRoom: async function(roomId) {
        if (roomId === this.currentRoom) return;
        
        if (this.currentRoom && this.socket) {
            this.socket.emit('leaveRoom', { roomId: this.currentRoom });
        }
        
        this.messages = [];
        const messagesContainer = document.getElementById('messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '<div class="loading-text">Loading messages...</div>';
        }
        
        this.currentRoom = roomId;
        sessionStorage.setItem('lastRoom', roomId);
        
        this.renderRooms(this.rooms);
        
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        if (messageInput) {
            messageInput.disabled = false;
            messageInput.focus();
        }
        if (sendBtn) {
            sendBtn.disabled = false;
        }
        
        if (this.socket) {
            this.socket.emit('joinRoom', { roomId });
        }
    },

    renderMessages: function(messages) {
        const container = document.getElementById('messages');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!messages || messages.length === 0) {
            container.innerHTML = '<div class="empty-state">No messages yet</div>';
            return;
        }

        messages.forEach(msg => {
            const isOwn = msg.sender?._id === this.currentUser?._id;
            const wrapper = document.createElement('div');
            wrapper.className = 'message-wrapper ' + (isOwn ? 'right' : 'left');
            
            const bubble = document.createElement('div');
            bubble.className = 'message-bubble';
            
            const sender = document.createElement('div');
            sender.className = 'message-sender';
            sender.textContent = isOwn ? 'You' : (msg.sender?.username || 'Unknown');
            
            const text = document.createElement('div');
            text.className = 'message-text';
            text.textContent = msg.content;
            
            const time = document.createElement('div');
            time.className = 'message-time';
            time.textContent = Utils.formatTime(msg.createdAt);
            
            bubble.appendChild(sender);
            bubble.appendChild(text);
            bubble.appendChild(time);
            wrapper.appendChild(bubble);
            container.appendChild(wrapper);
        });
        
        container.scrollTop = container.scrollHeight;
    },

    sendMessage: function() {
        const input = document.getElementById('messageInput');
        if (!input) return;
        
        const content = input.value.trim();
        if (!content) return;
        
        if (!this.currentRoom) {
            alert('Please join a room first');
            return;
        }
        
        if (!this.socket || !this.socket.connected) {
            alert('Not connected to server');
            return;
        }

        this.socket.emit('sendMessage', {
            roomId: this.currentRoom,
            content: content
        });
        
        input.value = '';
        input.focus();
    },

    createRoom: async function() {
        const nameInput = document.getElementById('roomName');
        const typeSelect = document.getElementById('roomType');
        const participantsInput = document.getElementById('participantsInput');
        
        if (!nameInput) return;
        
        const name = nameInput.value.trim();
        const type = typeSelect ? typeSelect.value : 'group';
        const participantsStr = participantsInput ? participantsInput.value.trim() : '';
        
        if (!name) {
            alert('Room name is required');
            return;
        }

        let participants = [];
        if (participantsStr) {
            participants = participantsStr.split(',').map(p => p.trim()).filter(p => p);
        }

        if (type === 'direct' && participants.length !== 1) {
            alert('Direct messages require exactly one participant');
            return;
        }

        try {
            const response = await Utils.api('/rooms', 'POST', {
                name,
                type,
                participants
            });
            
            closeCreateRoom();
            
            const form = document.getElementById('createRoomForm');
            if (form) form.reset();
            
            await this.loadRooms();
            
            if (response.room) {
                this.switchRoom(response.room._id);
            }
        } catch (error) {
            console.error('Failed to create room:', error);
            alert(error.message || 'Failed to create room');
        }
    }
};

window.ChatApp = ChatApp;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing ChatApp...');
    ChatApp.init();
});

function closeCreateRoom() {
    const modal = document.getElementById('createRoomModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

document.addEventListener('click', (e) => {
    const modal = document.getElementById('createRoomModal');
    if (e.target === modal) {
        closeCreateRoom();
    }
});