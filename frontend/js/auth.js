document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        if (Utils.isAuthenticated()) {
            window.location.href = '/';
        }
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        if (Utils.isAuthenticated()) {
            window.location.href = '/';
        }
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorEl = document.getElementById('loginError');

    if (!email || !password) {
        errorEl.textContent = 'Please fill in all fields';
        errorEl.style.display = 'block';
        return;
    }

    try {
        errorEl.style.display = 'none';
        const response = await Utils.api('/auth/login', 'POST', { email, password });
        Utils.setToken(response.token);
        Utils.setUser(response.user);
        window.location.href = '/';
    } catch (error) {
        errorEl.textContent = error.message || 'Login failed. Please try again.';
        errorEl.style.display = 'block';
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorEl = document.getElementById('registerError');

    if (!username || !email || !password) {
        errorEl.textContent = 'Please fill in all fields';
        errorEl.style.display = 'block';
        return;
    }

    if (password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters';
        errorEl.style.display = 'block';
        return;
    }

    try {
        errorEl.style.display = 'none';
        const response = await Utils.api('/auth/register', 'POST', { username, email, password });
        Utils.setToken(response.token);
        Utils.setUser(response.user);
        window.location.href = '/';
    } catch (error) {
        errorEl.textContent = error.message || 'Registration failed. Please try again.';
        errorEl.style.display = 'block';
    }
}

function handleLogout() {
    Utils.removeToken();
    Utils.removeUser();
    if (window.chatApp && window.chatApp.socket) {
        window.chatApp.socket.disconnect();
    }
    window.location.href = '/login.html';
}