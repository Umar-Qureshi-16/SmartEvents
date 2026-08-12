const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const env = require('../config/env');

let io;

const init = (server) => {
    const allowedOrigins = env.allowedOrigins;

    io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"]
        }
    });

    // Every socket must present a valid JWT before it can join any room.
    // Without this, a client could join an arbitrary bookingId room and watch
    // two strangers negotiate prices in real time.
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Unauthorized: no token'));

        try {
            socket.user = jwt.verify(token, JWT_SECRET);
            next();
        } catch (err) {
            next(new Error('Unauthorized: invalid token'));
        }
    });

    io.on('connection', (socket) => {
        // Derived from the verified token, never from client-supplied input.
        socket.join(`user_${socket.user.id}`);

        socket.on('join-negotiation', async (bookingId) => {
            try {
                // Required lazily to avoid a circular import at module load.
                const Booking = require('../models/Booking');
                const booking = await Booking.findById(bookingId).select('customerId vendorId').lean();
                if (!booking) return;

                const uid = socket.user.id;
                const isParty =
                    booking.customerId?.toString() === uid ||
                    booking.vendorId?.toString() === uid;

                if (!isParty) {
                    console.warn(`Blocked ${uid} from joining negotiation ${bookingId} — not a party to it`);
                    return;
                }

                socket.join(bookingId.toString());
            } catch (err) {
                console.error('join-negotiation error:', err.message);
            }
        });

        socket.on('leave-negotiation', (bookingId) => {
            socket.leave(bookingId?.toString());
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
