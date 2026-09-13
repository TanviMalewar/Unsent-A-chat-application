function addMessage(message, isOwn, prepend = false) {
    const messagesEl = document.getElementById('messages');

    const empty = messagesEl.querySelector('.empty-state');
    if (empty) empty.remove();

    const msgDate = new Date(message.createdAt);
    const dateGroup = Utils.getDateGroup(msgDate);

    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper ' + (isOwn ? 'right' : 'left');
    wrapper.dataset.messageId = message._id;

    if (message.isDeleted) {
        wrapper.classList.add('deleted');
    }

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    // Reply quote
    if (message.replyTo && !message.replyTo.isDeleted) {
        const quote = document.createElement('div');
        quote.className = 'message-reply-quote';

        const author = document.createElement('span');
        author.className = 'reply-author';
        author.textContent = message.replyTo.sender?.name || 'Unknown';

        const replyText = document.createElement('span');
        replyText.className = 'reply-text';
        replyText.textContent = message.replyTo.content || 'Message deleted';

        quote.appendChild(author);
        quote.appendChild(replyText);
        bubble.appendChild(quote);
    }

    // Sender
    const sender = document.createElement('div');
    sender.className = 'message-sender';
    sender.textContent = isOwn
        ? 'You'
        : (message.sender?.name || 'Unknown');

    if (message.isEdited && !message.isDeleted) {
        const editedLabel = document.createElement('span');
        editedLabel.className = 'edited-label';
        editedLabel.textContent = ' (edited)';
        sender.appendChild(editedLabel);
    }

    bubble.appendChild(sender);

    // Message content
    if (!message.isDeleted && message.content) {
        const text = document.createElement('div');
        text.className = 'message-text';
        text.textContent = message.content;
        bubble.appendChild(text);
    }

    // Attachment
    if (!message.isDeleted && message.attachment) {
        const attachment = message.attachment;

        if (attachment.type && attachment.type.startsWith('image/')) {
            const image = document.createElement('img');

            image.src = attachment.url;
            image.alt = attachment.filename || 'Image';
            image.className = 'message-image';
            image.loading = 'lazy';

            image.onclick = () => {
                window.open(attachment.url, '_blank');
            };

            bubble.appendChild(image);

        } else {
            const fileLink = document.createElement('a');

            fileLink.href = attachment.url;
            fileLink.target = '_blank';
            fileLink.rel = 'noopener noreferrer';
            fileLink.className = 'message-file';
            fileLink.textContent = `📎 ${attachment.filename || 'Attached file'}`;

            bubble.appendChild(fileLink);
        }
    }

    // Deleted message
    if (message.isDeleted) {
        const deletedText = document.createElement('div');
        deletedText.className = 'message-text';
        deletedText.textContent = 'This message was deleted';
        deletedText.style.fontStyle = 'italic';
        deletedText.style.color = '#999';

        bubble.appendChild(deletedText);
    }

    // Time
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = Utils.formatTime(message.createdAt);

    if (isOwn) {
        const status = document.createElement('span');
        status.className = 'message-status';
        status.textContent =
            (message.readBy && message.readBy.length > 0)
                ? ' ✓✓'
                : ' ✓';

        time.appendChild(status);
    }

    bubble.appendChild(time);

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'message-actions';

    if (isOwn && !message.isDeleted) {
        const editBtn = document.createElement('button');
        editBtn.className = 'message-action-btn';
        editBtn.textContent = 'Edit';

        editBtn.onclick = (e) => {
            e.stopPropagation();
            startEditMessage(message);
        };

        actions.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'message-action-btn';
        deleteBtn.textContent = 'Delete';

        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteMessageHandler(message);
        };

        actions.appendChild(deleteBtn);
    }

    if (!message.isDeleted) {
        const replyBtn = document.createElement('button');
        replyBtn.className = 'message-action-btn';
        replyBtn.textContent = 'Reply';

        replyBtn.onclick = (e) => {
            e.stopPropagation();
            startReply(message);
        };

        actions.appendChild(replyBtn);
    }

    bubble.appendChild(actions);
    wrapper.appendChild(bubble);

    // Date divider + message position
    if (prepend) {
        const divider = document.createElement('div');
        divider.className = 'date-divider';
        divider.textContent = dateGroup;

        messagesEl.insertBefore(divider, messagesEl.firstChild);
        messagesEl.insertBefore(wrapper, messagesEl.firstChild);

    } else {
        if (dateGroup !== window.lastDateGroup) {
            window.lastDateGroup = dateGroup;

            const divider = document.createElement('div');
            divider.className = 'date-divider';
            divider.textContent = dateGroup;

            messagesEl.appendChild(divider);
        }

        messagesEl.appendChild(wrapper);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }
}

//EDIT MESSAGE
let editingMessageId = null;

function startEditMessage(message) {
    editingMessageId = message._id;
    
    // Find the message bubble
    const wrapper = document.querySelector(`[data-message-id="${message._id}"]`);
    if (!wrapper) return;

    const textEl = wrapper.querySelector('.message-text');
    if (!textEl) return;

    // Replace text with input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'edit-input';
    input.value = message.content;
    
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.className = 'edit-save-btn';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'edit-cancel-btn';

    const editContainer = document.createElement('div');
    editContainer.className = 'edit-container';
    editContainer.appendChild(input);
    editContainer.appendChild(saveBtn);
    editContainer.appendChild(cancelBtn);

    textEl.replaceWith(editContainer);
    input.focus();
    input.select();

    // Handle save
    saveBtn.onclick = () => saveEdit(message._id, input.value);
    input.onkeypress = (e) => {
        if (e.key === 'Enter') saveEdit(message._id, input.value);
        if (e.key === 'Escape') cancelEdit(message);
    };
    cancelBtn.onclick = () => cancelEdit(message);
}

function saveEdit(messageId, newContent) {
    if (!newContent || newContent.trim() === '') {
        alert('Message cannot be empty');
        return;
    }

    const socket = window.ChatApp?.socket;
    if (!socket) return;

    socket.emit('editMessage', {
        roomId: window.ChatApp.currentRoom,
        messageId: messageId,
        content: newContent.trim()
    });

    editingMessageId = null;
}

function cancelEdit() {
    editingMessageId = null;
    // Reload the room to reset
    const socket = window.ChatApp?.socket;
    if (socket && window.ChatApp.currentRoom) {
        socket.emit('joinRoom', { roomId: window.ChatApp.currentRoom });
    }
}

//DELETE MESSAGE
function deleteMessageHandler(message) {
    if (!confirm('Delete this message?')) return;

    const socket = window.ChatApp?.socket;
    if (!socket) return;

    socket.emit('deleteMessage', {
        roomId: window.ChatApp.currentRoom,
        messageId: message._id
    });
}

function renderRooms(rooms, currentRoom, unreadCounts) {
    const roomList = document.getElementById('roomList');
    if (!rooms || rooms.length === 0) {
        roomList.innerHTML = '<div class="loading-text">No rooms yet. Create one!</div>';
        return;
    }

    roomList.innerHTML = '';
    rooms.forEach(room => {
        const div = document.createElement('div');
        div.className = 'room-item' + (room._id === currentRoom ? ' active' : '');
        const name = room.displayName || room.name;
        const unread = unreadCounts[room._id] || 0;
        div.innerHTML = `
            <div class="room-info">
                <span class="room-name">${name}</span>
                ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
            </div>
            <div class="room-preview">${room.lastMessage?.content || 'No messages'}</div>
        `;
        div.onclick = () => window.switchRoom(room._id);
        roomList.appendChild(div);
    });
}

//REPLY
let replyingTo = null;

function startReply(message) {
    replyingTo = message._id;

    document.getElementById('replyPreview').style.display = 'flex';
    document.getElementById('replyAuthor').textContent = message.sender?.name || 'Unknown';
    document.getElementById('replyText').textContent = message.content;
    document.getElementById('messageInput').focus();
}

function cancelReply() {
    replyingTo = null;
    document.getElementById('replyPreview').style.display = 'none';
    document.getElementById('replyAuthor').textContent = '';
    document.getElementById('replyText').textContent = '';
}

const fileInput = document.getElementById('fileInput');
const attachBtn = document.getElementById('attachBtn');

attachBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];

    if (!file) return;

    const token = localStorage.getItem('chat_token');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/upload/file', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || 'Upload failed');
        }

        window.selectedAttachment = data.file;

        showAttachmentPreview(file, data.file);

    } catch (error) {
        console.error('File upload error:', error);
        alert(error.message);
        fileInput.value = '';
    }
});

function showAttachmentPreview(file, attachment) {
    let preview = document.getElementById('attachmentPreview');

    if (!preview) {
        preview = document.createElement('div');
        preview.id = 'attachmentPreview';
        preview.className = 'attachment-preview';

        const inputArea = document.querySelector('.input-area');
        inputArea.parentNode.insertBefore(preview, inputArea);
    }

    preview.innerHTML = '';

    const info = document.createElement('div');
    info.className = 'attachment-info';

    if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.className = 'attachment-preview-image';
        info.appendChild(img);
    } else {
        const icon = document.createElement('span');
        icon.className = 'attachment-file-icon';
        icon.textContent = '📎';
        info.appendChild(icon);
    }

    const details = document.createElement('div');

    const name = document.createElement('div');
    name.className = 'attachment-name';
    name.textContent = attachment.filename;

    const size = document.createElement('div');
    size.className = 'attachment-size';
    size.textContent = formatFileSize(attachment.size);

    details.appendChild(name);
    details.appendChild(size);
    info.appendChild(details);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'attachment-remove';
    removeBtn.textContent = '✕';

    removeBtn.onclick = () => {
        window.selectedAttachment = null;
        fileInput.value = '';
        preview.remove();
    };

    preview.appendChild(info);
    preview.appendChild(removeBtn);
}

function formatFileSize(bytes) {
    if (!bytes) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
}