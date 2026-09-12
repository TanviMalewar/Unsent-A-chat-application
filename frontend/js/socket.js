let hasMoreMessages = false;
let loadingOlderMessages = false;

function getCurrentUserId() {
    try {
        const user = JSON.parse(localStorage.getItem('chat_user') || '{}');
        return user.id || user._id || null;
    } catch {
        return null;
    }
}

function connectSocket(token, currentRoom, currentUser) {
    const socket = io(window.location.origin, {
        transports: ['websocket', 'polling'],
        auth: { token }
    });

    socket.on('connect', () => {
        console.log('Socket connected');
        if (window.ChatApp?.currentRoom) {
            socket.emit('joinRoom', { roomId: window.ChatApp.currentRoom });
        }
    });

    socket.on('disconnect', () => console.log('Socket disconnected'));

    socket.on('roomHistory', ({ roomId, roomName, messages, hasMore }) => {
        const messagesEl = document.getElementById('messages');
        hasMoreMessages = hasMore;
        loadingOlderMessages = false;
        messagesEl.innerHTML = '';
        window.lastDateGroup = null;
        if (window.unreadCounts) window.unreadCounts[roomId] = 0;

        document.getElementById('chatRoomName').textContent = roomName || roomId;

        const myId = String(getCurrentUserId() || '');

        messages.forEach(msg => {
            const senderId = String(msg.sender?._id || msg.sender || '');
            const isOwn = myId && senderId && myId === senderId;
            addMessage(msg, isOwn);
        });

        setTimeout(() => {
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }, 100);
    });

    socket.on('olderMessages', ({ roomId, messages, hasMore }) => {
        if (String(roomId) !== String(window.ChatApp?.currentRoom)) {
            return;
        }

        const messagesEl = document.getElementById('messages');

        if (!messages || messages.length === 0) {
            hasMoreMessages = false;
            loadingOlderMessages = false;
            return;
        }

        // Remember current scroll position
        const oldScrollHeight = messagesEl.scrollHeight;
        const oldScrollTop = messagesEl.scrollTop;

        // Reset date tracking while prepending
        window.lastDateGroup = null;

        messages.forEach(msg => {
            const myId = String(getCurrentUserId() || '');
            const senderId = String(msg.sender?._id || msg.sender || '');
            const isOwn = myId && senderId && myId === senderId;

            addMessage(msg, isOwn, true);
        });

        hasMoreMessages = hasMore;
        loadingOlderMessages = false;

        // Keep the user at the same visual position
        const newScrollHeight = messagesEl.scrollHeight;

        messagesEl.scrollTop =
            oldScrollTop + (newScrollHeight - oldScrollHeight);
    });

    socket.on('newMessage', ({ message, roomId }) => {

    if (String(roomId) === String(window.ChatApp?.currentRoom)) {
        const myId = String(getCurrentUserId() || '');
            const senderId = String(message.sender?._id ||message.sender || '');
            const isOwn = myId && senderId && myId === senderId;
            console.log("NEW MESSAGE OWNERSHIP DEBUG:", {
            myId,
            senderId,
            isOwn,
            message
        });
            addMessage(message, isOwn);
        } else {
            if (!window.unreadCounts) window.unreadCounts = {};
            window.unreadCounts[roomId] = (window.unreadCounts[roomId] || 0) + 1;

            const app = window.ChatApp;
            if (app && app.rooms) {
                renderRooms(app.rooms, app.currentRoom, window.unreadCounts);
            }
        }
    });

    socket.on('messageEdited', ({ messageId, content }) => {
        const wrapper = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!wrapper) return;

        const textEl = wrapper.querySelector('.message-text');
        if (textEl) textEl.textContent = content;

        const sender = wrapper.querySelector('.message-sender');
        if (sender && !sender.querySelector('.edited-label')) {
            const label = document.createElement('span');
            label.className = 'edited-label';
            label.textContent = ' (edited)';
            sender.appendChild(label);
        }
    });

    socket.on('messageDeleted', ({ messageId }) => {
        const wrapper = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!wrapper) return;

        const textEl = wrapper.querySelector('.message-text');
        if (textEl) {
            textEl.textContent = 'This message was deleted';
            textEl.style.fontStyle = 'italic';
            textEl.style.color = '#999';
        }

        const actions = wrapper.querySelector('.message-actions');
        if (actions) actions.remove();
        wrapper.classList.add('deleted');
    });

    socket.on('roomUsers', ({ roomId, users }) => {
        if (roomId === window.ChatApp?.currentRoom) {
            const myId = String(getCurrentUserId() || '');
            const others = users.filter(u => String(u.userId) !== myId);

            const onlineList = document.getElementById('onlineUsersList');
            if (onlineList) {
                onlineList.innerHTML = others.map(u =>
                    `<span class="online-user-tag">● ${u.name || u.username || 'User'}</span>`
                ).join('');
            }

            const usersCount = document.getElementById('chatRoomUsers');
            if (usersCount) usersCount.textContent = others.length + ' online';
        }
    });

    socket.on('userTyping', ({ userId, name, roomId, isTyping }) => {
        if (roomId === window.ChatApp?.currentRoom && userId !== getCurrentUserId()) {
            const typingEl = document.getElementById('typingIndicator');
            if (typingEl) {
                typingEl.textContent = isTyping ? (name || 'Someone') + ' is typing...' : '';
                typingEl.className = isTyping ? 'typing-indicator active' : 'typing-indicator';
            }
        }
    });

    socket.on('error', ({ message }) => {
        const messagesEl = document.getElementById('messages');
        if (!messagesEl) return;
        const el = document.createElement('div');
        el.className = 'info-message error';
        el.textContent = message;
        messagesEl.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    });

    return socket;
}