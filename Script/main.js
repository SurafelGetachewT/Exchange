// Script/main.js - Handles login, signup, trading, and charts

document.addEventListener('DOMContentLoaded', () => {
    // Redirect to login if trying to access dashboard without being logged in
    if (window.location.pathname.includes('dashboard.html') && localStorage.getItem('loggedIn') !== 'true') {
        window.location.href = 'login.html';
    }

    // Update dashboard with user info
    if (window.location.pathname.includes('dashboard.html') && localStorage.getItem('loggedIn') === 'true') {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.username) {
            const usernameElement = document.getElementById('username');
            if (usernameElement) {
                usernameElement.innerText = currentUser.username;
            }
        }
    }

    // Render charts on dashboard page
    if (document.getElementById('btc-chart')) {
        renderCharts();
    }

    // Handle login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Handle signup form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    // Handle trade form
    const tradeForm = document.getElementById('trade-form');
    if (tradeForm) {
        tradeForm.addEventListener('submit', handleTrade);
    }

    // Handle logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

function renderCharts() {
    // Bitcoin Chart
    const btcCtx = document.getElementById('btc-chart').getContext('2d');
    new Chart(btcCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'BTC Price',
                data: [40000, 42000, 45000, 44000, 46000, 45000],
                borderColor: '#f7931a',
                fill: false
            }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: false } } }
    });

    // Ethereum Chart
    const ethCtx = document.getElementById('eth-chart').getContext('2d');
    new Chart(ethCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'ETH Price',
                data: [2500, 2800, 3000, 2900, 3200, 3000],
                borderColor: '#3c3c3d',
                fill: false
            }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: false } } }
    });
}

function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        localStorage.setItem('loggedIn', 'true');
        localStorage.setItem('currentUser', JSON.stringify(user));
        window.location.href = 'dashboard.html';
    } else {
        alert('Invalid credentials');
    }
}

function handleSignup(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const users = JSON.parse(localStorage.getItem('users')) || [];
    if (users.find(u => u.email === email)) {
        alert('Email already registered');
        return;
    }

    users.push({ username, email, password });
    localStorage.setItem('users', JSON.stringify(users));
    alert('Signup successful! Please login.');
    window.location.href = 'login.html';
}

function handleTrade(event) {
    event.preventDefault();
    const crypto = document.getElementById('crypto').value;
    const amount = document.getElementById('amount').value;
    const action = document.getElementById('action').value;

    const trades = JSON.parse(localStorage.getItem('trades')) || [];
    trades.push({ user: JSON.parse(localStorage.getItem('currentUser')).email, crypto, amount, action, date: new Date() });
    localStorage.setItem('trades', JSON.stringify(trades));
    alert(`You ${action} ${amount} of ${crypto}. (Simulated)`);
}

function handleLogout() {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}