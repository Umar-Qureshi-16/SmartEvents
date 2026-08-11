import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const WebSocketContext = createContext(null);

export const useWebSockets = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ user, children }) => {
    const [socket, setSocket] = useState(null);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        if (user) {
            const newSocket = io('http://localhost:5000');

            newSocket.on('connect', () => {
                console.log('Connected to WebSocket Server');
                newSocket.emit('join_dashboard', user.id || user._id);
            });

            // Handle incoming notifications
            newSocket.on('notification', (data) => {
                setNotifications(prev => [data, ...prev]);
                // Optional: Play sound or show toast
            });

            setSocket(newSocket);

            return () => newSocket.close();
        }
    }, [user]);

    return (
        <WebSocketContext.Provider value={{ socket, notifications, setNotifications }}>
            {children}
        </WebSocketContext.Provider>
    );
};
