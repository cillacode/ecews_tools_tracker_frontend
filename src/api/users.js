import { api } from './client';

export const getUsers    = ()          => api.get('/users').then((r) => r.data);
export const createUser  = (body)      => api.post('/users', body).then((r) => r.data);
export const updateUser  = (id, body)  => api.patch(`/users/${id}`, body).then((r) => r.data);
