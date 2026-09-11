const Utils = {
    getToken: function() {
        return localStorage.getItem('chat_token');
    },

    setToken: function(token) {
        localStorage.setItem('chat_token', token);
    },

    removeToken: function() {
        localStorage.removeItem('chat_token');
    },

    getUser: function() {
        try {
            const user = localStorage.getItem('chat_user');
            return user ? JSON.parse(user) : null;
        } catch {
            return null;
        }
    },

    setUser: function(user) {
        localStorage.setItem('chat_user', JSON.stringify(user));
    },

    removeUser: function() {
        localStorage.removeItem('chat_user');
    },

    isAuthenticated: function() {
        return !!this.getToken();
    },

    formatTime: function(date) {
        return new Date(date).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    getDateGroup: function(date) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const msgDate = new Date(date);
        msgDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        yesterday.setHours(0, 0, 0, 0);
        if (msgDate.getTime() === today.getTime()) return 'Today';
        if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday';
        return msgDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    },

    api: async function(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const token = this.getToken();
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(endpoint, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `Request failed (${response.status})`);
        }

        return result;
    }
};