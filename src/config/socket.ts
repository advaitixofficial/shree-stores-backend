// ============================================================
// Shree Stores Backend — Socket.IO Configuration
// JWT-authenticated connections with room management.
// ============================================================

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './env';
import { logger } from '../utils/logger';

let io: SocketIOServer | null = null;

interface JwtPayload {
  sub: string;
  role: string;
}

export function initializeSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // JWT authentication middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      // Try access secret first, then refresh
      let decoded: JwtPayload;
      try {
        decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
      } catch {
        decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
      }

      socket.data.userId = decoded.sub;
      socket.data.role = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { userId, role } = socket.data;
    logger.info({ userId, role, socketId: socket.id }, 'Socket connected');

    // Join user-specific room
    if (role === 'CUSTOMER') {
      socket.join(`user:${userId}`);
    } else {
      // Admin roles join admin rooms
      socket.join(`admin:${userId}`);
      socket.join('admin:orders');
    }

    socket.on('join:order', (orderId: string) => {
      socket.join(`order:${orderId}`);
    });

    socket.on('leave:order', (orderId: string) => {
      socket.leave(`order:${orderId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info({ userId, socketId: socket.id, reason }, 'Socket disconnected');
    });
  });

  logger.info('✅ Socket.IO initialized');
  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}
