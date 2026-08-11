const { Server } = require('socket.io');

let io;

const init = (server) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
        : ["http://localhost:5173", "http://localhost:5174"];

    io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        socket.on('join_dashboard', (userId) => {
            socket.join(`user_${userId}`);
            console.log(`User ${userId} joined their dashboard room`);
        });

        socket.on('join-negotiation', (bookingId) => {
            socket.join(bookingId);
            console.log(`Socket ${socket.id} joined negotiation room: ${bookingId}`);
        });

        socket.on('leave-negotiation', (bookingId) => {
            socket.leave(bookingId);
            console.log(`Socket ${socket.id} left negotiation room: ${bookingId}`);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(`user_${userId}`).emit(event, data);
    }
};

const emitToRoom = (roomId, event, data) => {
    if (io) {
        io.to(roomId).emit(event, data);
    }
};

const broadcast = (event, data) => {
    if (io) {
        io.emit(event, data);
    }
};

module.exports = { init, getIO, emitToUser, emitToRoom, broadcast };
