const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const AUTH_STORAGE_KEY = 'sih_auth';

export function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveAuth(auth) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  window.dispatchEvent(new Event('auth-changed'));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event('auth-changed'));
}

export async function apiFetch(path, options = {}) {
  const auth = getAuth();
  const headers = new Headers(options.headers || {});

  if (auth?.token) {
    headers.set('Authorization', `Bearer ${auth.token}`);
  }

  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    clearAuth();
  }

  return response;
}

export { API_BASE_URL };
