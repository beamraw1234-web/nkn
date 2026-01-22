/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require('http');
const { URL } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const base = `http://${req.headers.host || 'localhost'}`;
    const url = new URL(req.url || '/', base);
    const query = {};
    url.searchParams.forEach((value, key) => {
      if (query[key] === undefined) {
        query[key] = value;
        return;
      }
      if (Array.isArray(query[key])) {
        query[key].push(value);
        return;
      }
      query[key] = [query[key], value];
    });

    const parsedUrl = {
      href: url.href,
      pathname: url.pathname,
      query
    };

    // Serve static uploads from /public/uploads to avoid Next routing edge cases
    if (parsedUrl.pathname && parsedUrl.pathname.startsWith('/uploads/')) {
      const safeRoot = path.join(process.cwd(), 'public', 'uploads');
      const requestedPath = path.join(process.cwd(), 'public', parsedUrl.pathname);
      const resolved = path.resolve(requestedPath);
      if (!resolved.startsWith(safeRoot)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }
      if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
        const ext = path.extname(resolved).toLowerCase();
        const mime =
          ext === '.png' ? 'image/png' :
          ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
          ext === '.gif' ? 'image/gif' :
          ext === '.webp' ? 'image/webp' :
          ext === '.svg' ? 'image/svg+xml' :
          'application/octet-stream';
        res.statusCode = 200;
        res.setHeader('Content-Type', mime);
        fs.createReadStream(resolved).pipe(res);
        return;
      }
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.io
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Store user socket mappings
  const userSockets = new Map(); // userId -> socketId
  const userStatus = new Map(); // userId -> { isOnline: boolean }

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User joins with their ID
    socket.on('user:join', (userId) => {
      userSockets.set(userId, socket.id);
      socket.userId = userId;
      userStatus.set(userId, { isOnline: true });
      console.log(`User ${userId} joined with socket ${socket.id}`);
      
      // Broadcast user is now online to all connected users
      io.emit('user:online:status', {
        userId,
        isOnline: true
      });
    });

    // User joins a chat room
    socket.on('chat:join', (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    // Send private message
    socket.on('chat:private:message', async (data) => {
      const { senderId, receiverId, messageId, content, fileUrl, fileName, fileSize, fileMime } = data;
      
      // Create room ID (consistent for both users)
      const roomId = [senderId, receiverId].sort().join('_');
      
      const message = {
        id: messageId,
        senderId,
        receiverId,
        content,
        fileUrl,
        fileName,
        fileSize,
        fileMime,
        timestamp: new Date().toISOString()
      };

      // Send to room (both users if online)
      io.to(roomId).emit('chat:private:message', message);

      // Also send directly to receiver if they're online
      const receiverSocketId = userSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('chat:new:message', {
          ...message,
          unread: true
        });
      }
    });

    // Typing indicator for private chat
    socket.on('chat:private:typing', async (data) => {
      const { senderId, receiverId, isTyping } = data;
      const roomId = [senderId, receiverId].sort().join('_');
      
      console.log(`[Typing] ${senderId} -> ${receiverId}: ${isTyping ? 'is typing' : 'stopped typing'} in room ${roomId}`);
      
      // Store typing status in database for HTTP polling clients
      try {
        const key = `typing_${senderId}_to_${receiverId}`;
        if (isTyping) {
          const now = new Date();
          await prisma.systemsettings.upsert({
            where: { key },
            update: { value: now.toISOString(), updatedAt: now },
            create: {
              id: randomUUID(),
              key,
              value: now.toISOString(),
              updatedAt: now
            }
          });
        } else {
          await prisma.systemsettings.deleteMany({ where: { key } });
        }
      } catch (error) {
        console.error('[Typing] Database error:', error);
      }
      
      // Broadcast to all in the room
      io.to(roomId).emit('chat:private:typing', {
        userId: senderId,
        isTyping
      });
    });

    // Mark messages as read
    socket.on('chat:mark:read', (data) => {
      const { userId, friendId } = data;
      const receiverSocketId = userSockets.get(friendId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('chat:messages:read', { userId });
      }
    });

    // Chat deletion broadcast
    socket.on('chat:delete', (data) => {
      const { senderId, receiverId } = data;
      const roomId = [senderId, receiverId].sort().join('_');
      console.log(`[Chat Delete] ${senderId} cleared chat with ${receiverId} in room ${roomId}`);
      io.to(roomId).emit('chat:deleted', { byUserId: senderId });
    });

    // Voice call signaling
    socket.on('voice:join', (data) => {
      const { callId, userId } = data;
      const voiceRoom = `voice_${callId}`;
      socket.join(voiceRoom);
      socket.callId = callId;
      console.log(`User ${userId} joined voice call ${callId} (room: ${voiceRoom})`);
      
      // Get all other users in this room (excluding the one just joined)
      const existingUsers = [];
      io.to(voiceRoom).fetchSockets().then(sockets => {
        sockets.forEach(s => {
          if (s.id !== socket.id && s.userId) {
            existingUsers.push({
              userId: s.userId,
              socketId: s.id
            });
          }
        });
        
        // Send existing users list to the new joiner
        socket.emit('voice:existing:users', { users: existingUsers });
      });
      
      // Notify OTHERS in the call that a new participant joined (NOT the sender)
      socket.to(voiceRoom).emit('voice:user:joined', {
        userId,
        socketId: socket.id
      });
    });

    // WebRTC offer
    socket.on('voice:offer', (data) => {
      const { targetUserId, offer, callId } = data;
      const voiceRoom = `voice_${callId}`;
      const targetSocketId = userSockets.get(targetUserId);
      
      console.log(`[Voice Offer] Sending offer from ${socket.userId} to ${targetUserId} in call ${callId}`);
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('voice:offer', {
          fromUserId: socket.userId,
          offer,
          callId
        });
      }
    });

    // WebRTC answer
    socket.on('voice:answer', (data) => {
      const { targetUserId, answer, callId } = data;
      const targetSocketId = userSockets.get(targetUserId);
      
      console.log(`[Voice Answer] Sending answer from ${socket.userId} to ${targetUserId} in call ${callId}`);
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('voice:answer', {
          fromUserId: socket.userId,
          answer,
          callId
        });
      }
    });

    // ICE candidate
    socket.on('voice:ice', (data) => {
      const { targetUserId, candidate, callId } = data;
      const targetSocketId = userSockets.get(targetUserId);
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('voice:ice', {
          fromUserId: socket.userId,
          candidate,
          callId
        });
      }
    });

    // User left voice call
    socket.on('voice:leave', (data) => {
      const { callId, userId } = data;
      const voiceRoom = `voice_${callId}`;
      socket.leave(voiceRoom);
      
      console.log(`User ${userId} left voice call ${callId}`);
      
      // Notify others that user left
      io.to(voiceRoom).emit('voice:user:left', {
        userId,
        callId
      });
    });

    socket.on('disconnect', () => {
      // Remove user from mapping
      if (socket.userId) {
        userSockets.delete(socket.userId);
        userStatus.set(socket.userId, { isOnline: false });
        console.log(`User ${socket.userId} disconnected`);
        
        // Notify if in a voice call
        if (socket.callId) {
          const voiceRoom = `voice_${socket.callId}`;
          io.to(voiceRoom).emit('voice:user:left', {
            userId: socket.userId,
            callId: socket.callId
          });
        }
        
        // Broadcast user is now offline to all connected users
        io.emit('user:online:status', {
          userId: socket.userId,
          isOnline: false
        });
      }
      console.log('Socket disconnected:', socket.id);
    });
  });

  server.listen(PORT, (err) => {
    if (err) throw err;
    const addr = server.address();
    const actualPort = addr && typeof addr === 'object' && 'port' in addr ? addr.port : PORT;
    console.log(`> Ready on http://localhost:${actualPort}`);
    console.log(`> Socket.io server ready`);
  });
});
