import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { STORAGE_KEYS } from '../utils/storage';

let _socket: Socket | null = null;
let _baseUrl: string | null = null;

function getSocket(): Socket | null {
  return _socket;
}

function connectSocket(baseUrl: string): Socket {
  if (_socket && _baseUrl === baseUrl && _socket.connected) {
    return _socket;
  }

  if (_socket) {
    _socket.removeAllListeners();
    _socket.disconnect();
  }

  // Strip /api suffix to get the server root for Socket.io
  const serverUrl = baseUrl.replace(/\/api\/?$/, '');
  _baseUrl = baseUrl;

  _socket = io(serverUrl, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    timeout: 20000,
  });

  _socket.on('connect', () => {
    console.log('[SocketClient] Connected:', _socket?.id);
  });

  _socket.on('disconnect', (reason) => {
    console.log('[SocketClient] Disconnected:', reason);
  });

  _socket.on('connect_error', (err) => {
    console.warn('[SocketClient] Connection error:', err.message);
  });

  return _socket;
}

async function restoreSocketFromStorage(): Promise<Socket | null> {
  try {
    const backendUrl = await AsyncStorage.getItem(STORAGE_KEYS.BACKEND_URL);
    if (backendUrl) {
      return connectSocket(backendUrl);
    }
  } catch (err: any) {
    console.warn('[SocketClient] restoreSocketFromStorage failed:', err?.message);
  }
  return null;
}

function disconnectSocket(): void {
  if (_socket) {
    _socket.removeAllListeners();
    _socket.disconnect();
    _socket = null;
    _baseUrl = null;
  }
}

function isSocketConnected(): boolean {
  return !!_socket?.connected;
}

// Reconnect on app resume
AppState.addEventListener('change', (state: AppStateStatus) => {
  if (state === 'active' && _socket && !_socket.connected) {
    _socket.connect();
  }
});

export {
  getSocket,
  connectSocket,
  restoreSocketFromStorage,
  disconnectSocket,
  isSocketConnected,
};
