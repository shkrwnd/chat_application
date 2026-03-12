import { createContext, useEffect, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

export const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false });

export function SocketProvider({ token, children }: { token: string | null; children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    if (!token) {
      setSocket((prev) => {
        prev?.disconnect();
        return null;
      });
      setConnected(false);
      return;
    }

    const newSocket = io(backendUrl, {
      auth: { token },
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => setConnected(true));
    newSocket.on('disconnect', () => setConnected(false));

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [token, backendUrl]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}
