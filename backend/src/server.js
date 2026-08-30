import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { initDb } from './models/db.js';
import { initRedis } from './services/redisStore.js';
import { setupSockets } from './sockets/socketHandler.js';
import apiRoutes from './routes/index.js';

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// CORS configuration
const corsOptions = {
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

app.use(cors(corsOptions));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Setup Socket.IO with CORS
const io = new SocketIOServer(server, {
  cors: {
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Attach socket IO handlers
setupSockets(io);

// Healthcheck endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'GroupRoute Location Intelligence Platform',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Register API Routes
app.use('/api', apiRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred.'
  });
});

// Start Server
async function startServer() {
  try {
    await initDb();
    await initRedis();

    server.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀 GroupRoute Real-Time Location Platform Server            ║
║                                                               ║
║   • REST API:     http://localhost:${PORT}/api                   ║
║   • Health Check: http://localhost:${PORT}/api/health            ║
║   • Socket.IO:    ws://localhost:${PORT}                        ║
║   • Frontend:     ${CLIENT_URL}                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('Fatal error starting GroupRoute server:', err);
    process.exit(1);
  }
}

startServer();

export { app, server, io };
