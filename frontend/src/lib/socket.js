import { io } from 'socket.io-client';
import { SOCKET_URL, getStoredUser } from '../api';

// Authenticated Socket.io connection (the server rejects connections without a valid JWT).
export const createSocket = () =>
  io(SOCKET_URL, {
    auth: { token: getStoredUser()?.token },
    transports: ['websocket', 'polling'],
    reconnectionDelayMax: 10000,
  });
