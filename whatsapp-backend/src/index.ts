// src/index.ts - Updated with WebSocket support
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import connectDB from './db.js';
import routes from './routes.js';
import { Message } from './models.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ["http://localhost:3001", "http://localhost:3000", "https://your-frontend-domain.com"],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Add request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Make io available to other modules
app.set('socketio', io);

// Connect to Database
(async () => {
  try {
    await connectDB();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed', error);
    process.exit(1);
  }
})();

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // Join conversation rooms
  socket.on('join-conversation', (conversationId: string) => {
    socket.join(conversationId);
    console.log(`👤 Socket ${socket.id} joined conversation: ${conversationId}`);
  });

  // Leave conversation rooms
  socket.on('leave-conversation', (conversationId: string) => {
    socket.leave(conversationId);
    console.log(`👤 Socket ${socket.id} left conversation: ${conversationId}`);
  });

  // Simulate message status updates (for demo purposes)
  socket.on('simulate-status-update', async (data: { messageId: string, status: string }) => {
    try {
      const updatedMessage = await Message.findOneAndUpdate(
        { messageId: data.messageId },
        { status: data.status, updatedAt: new Date() },
        { new: true }
      );

      if (updatedMessage) {
        // Broadcast status update to all clients in the conversation
        io.to(updatedMessage.conversationId).emit('message-status-updated', {
          messageId: data.messageId,
          status: data.status,
          updatedAt: updatedMessage.updatedAt
        });
        console.log(`✅ Status updated for message ${data.messageId} to ${data.status}`);
      }
    } catch (error) {
      console.error('❌ Error updating message status:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
  });
});

// API Routes
app.use('/api', routes);

// Simulate automatic status progression for demo purposes
const simulateStatusProgression = async () => {
  try {
    // Find messages that are 'sent' and older than 10 seconds, update to 'delivered'
    const sentMessages = await Message.find({
      status: 'sent',
      timestamp: { $lt: new Date(Date.now() - 10000) } // 10 seconds ago
    }).limit(5);

    for (const message of sentMessages) {
      await Message.updateOne(
        { _id: message._id },
        { status: 'delivered', updatedAt: new Date() }
      );
      
      // Emit status update via WebSocket
      io.to(message.conversationId).emit('message-status-updated', {
        messageId: message.messageId,
        status: 'delivered',
        updatedAt: new Date()
      });
    }

    // Find messages that are 'delivered' and older than 30 seconds, update to 'read'
    const deliveredMessages = await Message.find({
      status: 'delivered',
      updatedAt: { $lt: new Date(Date.now() - 30000) } // 30 seconds ago
    }).limit(3);

    for (const message of deliveredMessages) {
      await Message.updateOne(
        { _id: message._id },
        { status: 'read', updatedAt: new Date() }
      );
      
      // Emit status update via WebSocket
      io.to(message.conversationId).emit('message-status-updated', {
        messageId: message.messageId,
        status: 'read',
        updatedAt: new Date()
      });
    }
  } catch (error) {
    console.error('❌ Error in status progression simulation:', error);
  }
};

// Run status progression simulation every 15 seconds
setInterval(simulateStatusProgression, 15000);

// Function to emit new message to clients
export const emitNewMessage = (message: any) => {
  io.to(message.conversationId).emit('new-message', message);
};

// Function to emit message status update
export const emitStatusUpdate = (conversationId: string, messageId: string, status: string) => {
  io.to(conversationId).emit('message-status-updated', {
    messageId,
    status,
    updatedAt: new Date()
  });
};

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  io.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully');
  io.close();
  process.exit(0);
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket server ready`);
});