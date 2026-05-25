import { api } from './client';

export async function login({ identifier, password }) {
  const { data } = await api.post('/auth/login', { identifier, password });
  return data; // { token, user }
}

export async function me() {
  const { data } = await api.get('/auth/me');
  return data.user;
}
