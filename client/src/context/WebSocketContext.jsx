import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const WebSocketContext = createContext(null);

export const useWebSockets = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ user, children }) => {
    const [socket, setSocket] = useState(null);
    const [notifications, setNotifications] = useState([]);

    // Depend on the user id rather than the object, so an unrelated re-render
    // producing a new object reference does not tear down the connection.
    const userId = user?.id || user?._id;

    useEffect(() => {
        if (!userId) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        // The server authenticates this token before allowing any room joins,
        // and derives the personal room from it — no client-supplied user id.
        const newSocket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });

        newSocket.on('connect_error', (err) => {
            console.error('WebSocket connection refused:', err.message);
        });

        newSocket.on('notification', (data) => {
            setNotifications(prev => [data, ...prev]);
        });

        setSocket(newSocket);

        return () => {
            newSocket.off('notification');
            newSocket.close();
        };
    }, [userId]);

    const value = useMemo(
        () => ({ socket, notifications, setNotifications }),
        [socket, notifications]
    );

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};
