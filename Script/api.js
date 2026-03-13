const API_BASE_URL = (typeof window !== 'undefined' && window.API_BASE_URL)
    ? String(window.API_BASE_URL).replace(/\/$/, '')
    : 'http://localhost:3000/api';

async function apiRequest(path, options = {}) {
    const accessToken = localStorage.getItem('accessToken');

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    };

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();

    if (!response.ok) {
        let message = data && typeof data === 'object' && data.error ? data.error : 'Request failed';
        if (data && typeof data === 'object' && typeof data.details === 'string' && data.details.trim()) {
            message = `${message}: ${data.details}`;
        }
        if (data && typeof data === 'object' && Array.isArray(data.details) && data.details.length > 0) {
            const first = data.details[0];
            const field = first.path || first.param;
            if (field && first.msg) {
                message = `${message}: ${field} - ${first.msg}`;
            } else if (first.msg) {
                message = `${message}: ${first.msg}`;
            }
        }
        const error = new Error(message);
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    const data = await apiRequest('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
    });

    if (data && data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        return data.accessToken;
    }

    return null;
}

async function apiRequestWithRefresh(path, options = {}) {
    try {
        return await apiRequest(path, options);
    } catch (err) {
        if (err && err.status === 401) {
            try {
                const newToken = await refreshAccessToken();
                if (newToken) {
                    return await apiRequest(path, options);
                }
            } catch (_) {
                return Promise.reject(err);
            }
        }
        return Promise.reject(err);
    }
}

async function authLogin(email, password) {
    return apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}

async function authRegister(payload) {
    return apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

async function authMe() {
    return apiRequestWithRefresh('/auth/me');
}

function saveAuth(tokens, user) {
    if (tokens && tokens.accessToken) localStorage.setItem('accessToken', tokens.accessToken);
    if (tokens && tokens.refreshToken) localStorage.setItem('refreshToken', tokens.refreshToken);
    if (user) localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('loggedIn', 'true');
}

function clearAuth() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    localStorage.setItem('loggedIn', 'false');
}
