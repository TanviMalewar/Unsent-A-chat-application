const Utils = {
    showInfo: function(message, type, container) {
        const el = document.createElement('div');
        el.className = type + '-message';
        el.textContent = message;
        container.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    },

    formatTime: function(date) {
        return new Date(date).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    },

    isAuthenticated: function() {
        const token = this.getToken();
        return !!token && token !== 'undefined' && token !== 'null';
    },

    getToken: function() {
        const token = localStorage.getItem('chat_token');
        if (!token || token === 'undefined' || token === 'null') {
            localStorage.removeItem('chat_token');
            return null;
        }
        return token;
    },

    setToken: function(token) {
        if (token && token !== 'undefined' && token !== 'null') {
            localStorage.setItem('chat_token', token);
        }
    },

    removeToken: function() {
        localStorage.removeItem('chat_token');
    },

    getUser: function() {
        try {
            const user = localStorage.getItem('chat_user');
            if (!user || user === 'undefined' || user === 'null') {
                return null;
            }
            const parsed = JSON.parse(user);
            if (!parsed || !parsed._id) {
                return null;
            }
            return parsed;
        } catch (error) {
            console.error('Error parsing user:', error);
            localStorage.removeItem('chat_user');
            return null;
        }
    },

    setUser: function(user) {
        if (user && user._id) {
            localStorage.setItem('chat_user', JSON.stringify(user));
        }
    },

    removeUser: function() {
        localStorage.removeItem('chat_user');
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

        try {
            const response = await fetch(endpoint, options);
            const result = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    this.removeToken();
                    this.removeUser();
                    window.location.href = '/login.html';
                    throw new Error('Session expired. Please login again.');
                }
                throw new Error(result.error || `API request failed (${response.status})`);
            }

            return result;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
};