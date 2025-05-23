const API = import.meta.env.VITE_API_URL;
import { useLoaderStore } from '@/store/loader';

export async function login({ email, password }) {
  const loader = useLoaderStore();
  loader.start();
  try {
    console.log('🟢 [auth] calling:', `${API}/login`);
    console.log('Payload:', { email, password });
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
  } finally {
    loader.finish();
  }
}

export async function me() {
  const loader = useLoaderStore();
  loader.start();
  try {
    const res = await fetch(`${API}/me`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!res.ok) return null;
    return res.json();
  } finally {
    loader.finish();
  }
}

export async function logout() {
  const loader = useLoaderStore();
  loader.start();
  try {
    await fetch(`${API}/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } finally {
    loader.finish();
  }
}
