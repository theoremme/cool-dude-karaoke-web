const getToken = () => localStorage.getItem('token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

export const register = async (email, password, name) => {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  localStorage.setItem('token', data.token);
  return data;
};

export const login = async (email, password) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  localStorage.setItem('token', data.token);
  return data;
};

export const getMe = async () => {
  const res = await fetch('/api/auth/me', { headers: authHeaders() });
  if (!res.ok) {
    localStorage.removeItem('token');
    return null;
  }
  const data = await res.json();
  return data.user;
};

export const createRoom = async (name) => {
  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create room');
  return data;
};

export const getRoomByInviteCode = async (inviteCode) => {
  const res = await fetch(`/api/rooms/${inviteCode}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Room not found');
  return data;
};

export const searchYouTube = async (query) => {
  const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
};

export const generateVibe = async (theme, exclusions = []) => {
  const res = await fetch('/api/vibe/generate', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ theme, exclusions }),
  });
  if (!res.ok) throw new Error('Vibe generation failed');
  return res.json();
};

export const logout = () => {
  localStorage.removeItem('token');
};
