document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth.js loaded');

    // Register Form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        console.log('Register form found');
        registerForm.addEventListener('submit', handleRegister);
    } else {
        console.error('Register form NOT found!');
    }

    // Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('Login form found');
        loginForm.addEventListener('submit', handleLogin);
    }

    // Check if already logged in
    if (Utils.isAuthenticated()) {
        console.log('Already authenticated, redirecting');
        window.location.href = '/index.html';
    }
});

async function handleRegister(event) {
    // ✅ IMPORTANT: This prevents the form from submitting normally
    event.preventDefault();
    
    console.log('===== REGISTER FORM SUBMITTED =====');

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorEl = document.getElementById('registerError');

    console.log('Username:', username);
    console.log('Email:', email);
    console.log('Password length:', password.length);

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
        
        // ✅ SENDING TO /auth/register (NOT /register)
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: username,
                email: email,
                password: password
            })
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        // Save token and user
        Utils.setToken(data.token);
        Utils.setUser(data.user);
        
        console.log('Registration successful, redirecting...');
        window.location.href = '/index.html';
    } catch (error) {
        console.error('Register error:', error);
        errorEl.textContent = error.message;
        errorEl.style.display = 'block';
    }
}

async function handleLogin(event) {
    console.log('🔥 HANDLE LOGIN CALLED');
    event.preventDefault();
    console.log('🔥 DEFAULT PREVENTED');

    console.log('===== LOGIN FORM SUBMITTED =====');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorEl = document.getElementById('loginError');

    console.log('Email:', email);
    console.log('Password length:', password.length);

    if (!email || !password) {
        errorEl.textContent = 'Please fill in all fields';
        errorEl.style.display = 'block';
        return;
    }

    try {
        errorEl.style.display = 'none';

        console.log('Sending login request...');

        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        console.log('Response status:', response.status);

        const data = await response.json();
        console.log('Response data:', data);

        if (!response.ok) {
            throw new Error(data.message || data.error || 'Login failed');
        }

        // Save token and user
        Utils.setToken(data.token);
        Utils.setUser(data.user);

        console.log('Login successful, redirecting...');

        window.location.href = '/index.html';

    } catch (error) {
        console.error('Login error:', error);

        errorEl.textContent = error.message;
        errorEl.style.display = 'block';
    }
}