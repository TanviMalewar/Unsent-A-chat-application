// Chat-specific logic is already in app.js
// This file is kept for compatibility

document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('messageInput');
    let typingTimeout = null;

    input.addEventListener('input', function() {
        if (!ChatApp.currentRoom || !ChatApp.socket) return;
        
        ChatApp.socket.emit('typing', { roomId: ChatApp.currentRoom });
        
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        
        typingTimeout = setTimeout(() => {
            if (ChatApp.socket) {
                ChatApp.socket.emit('stopTyping', { roomId: ChatApp.currentRoom });
            }
        }, 2000);
    });

    input.addEventListener('blur', function() {
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            if (ChatApp.socket) {
                ChatApp.socket.emit('stopTyping', { roomId: ChatApp.currentRoom });
            }
        }
    });
});