document.addEventListener('DOMContentLoaded', () => {
    const toggleButtons = document.querySelectorAll('.toggle_button');
    const tradingContent = document.getElementById('trading-content');
    const rightSide = document.querySelector('.right-side');

    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const section = btn.getAttribute('data-section');
            if (tradingContent) {
                tradingContent.style.display = section === 'trading' ? 'block' : 'none';
            }
        });
    });

    const renderLoggedOut = () => {
        if (!rightSide) return;
        rightSide.innerHTML = `
            <a href="login.html">Login</a>
            <a href="signup.html">Sign Up</a>
            <div class="nav_separator"></div>
            <i class="fas fa-headset"></i>
            <i class="fas fa-bell"></i>
            <i class="fas fa-globe"></i>
        `;
    };

    const renderLoggedIn = (user) => {
        if (!rightSide) return;
        const username = (user && user.username) ? user.username : 'User';
        rightSide.innerHTML = `
            <i class="fas fa-wallet"></i>
            <i class="fas fa-user"></i>
            <span class="username">${username}</span>
            <a href="#" id="logoutLink" style="margin-left:10px;">Logout</a>
            <div class="nav_separator"></div>
            <i class="fas fa-headset"></i>
            <i class="fas fa-bell"></i>
            <i class="fas fa-globe"></i>
        `;

        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof clearAuth === 'function') {
                    clearAuth();
                } else {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('currentUser');
                    localStorage.setItem('loggedIn', 'false');
                }
                window.location.href = 'main.html';
            });
        }
    };

    const initAuthHeader = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            if (typeof clearAuth === 'function') clearAuth();
            renderLoggedOut();
            return;
        }

        try {
            if (typeof authMe === 'function') {
                const data = await authMe();
                const user = data && data.user ? data.user : null;
                if (user) {
                    if (typeof saveAuth === 'function') {
                        saveAuth({ accessToken: localStorage.getItem('accessToken'), refreshToken: localStorage.getItem('refreshToken') }, user);
                    } else {
                        localStorage.setItem('currentUser', JSON.stringify(user));
                        localStorage.setItem('loggedIn', 'true');
                    }
                    renderLoggedIn(user);
                    return;
                }
            }

            const cached = JSON.parse(localStorage.getItem('currentUser') || 'null');
            if (cached) {
                localStorage.setItem('loggedIn', 'true');
                renderLoggedIn(cached);
                return;
            }

            if (typeof clearAuth === 'function') clearAuth();
            renderLoggedOut();
        } catch (_) {
            if (typeof clearAuth === 'function') clearAuth();
            renderLoggedOut();
        }
    };

    initAuthHeader();
});