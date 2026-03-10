import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { logger } from './utils/logger';

let io: SocketIOServer;

export function initSocket(server: HttpServer) {
    io = new SocketIOServer(server, {
        cors: {
            origin: [
                process.env.FRONTEND_URL || 'http://localhost:5173',
                'https://investor-angel-portal.vercel.app',
                'http://localhost:3000'
            ],
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
            socket.data.userId = decoded.id;
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        logger.info(`Socket User connected: ${socket.data.userId}`);

        // Join user to their own personal room for targeted alerts/notifications
        socket.join(`user_${socket.data.userId}`);

        // Join startup specific rooms for conversation/update feeds
        socket.on('join_startup', (startupId: string) => {
            socket.join(`startup_${startupId}`);
            logger.debug(`User ${socket.data.userId} joined startup_${startupId}`);
        });

        socket.on('leave_startup', (startupId: string) => {
            socket.leave(`startup_${startupId}`);
            logger.debug(`User ${socket.data.userId} left startup_${startupId}`);
        });

        socket.on('disconnect', () => {
            logger.info(`Socket User disconnected: ${socket.data.userId}`);
        });
    });

    return io;
}

export function getIO(): SocketIOServer {
    if (!io) {
        throw new Error('Socket.io layer not initialized!');
    }
    return io;
}
