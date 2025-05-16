const API = import.meta.env.VITE_API_URL;

export async function login({ email, password }) {
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Login failed');
  }

  return res.json();
}

export async function me() {
  const res = await fetch(`${API}/me`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!res.ok) return null;
  return res.json();
}

export async function logout() {
  await fetch(`${API}/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}
