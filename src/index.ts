import { createServer } from 'http';
import app from './app';
import { initializeWebSocketServer } from './websocket/socketServer';
import { logger } from './config/logger.config';

const port = process.env.PORT || 4000;

// Create HTTP server
const httpServer = createServer(app);

// Initialize WebSocket server
const webSocketServer = initializeWebSocketServer(httpServer);

// Start server
httpServer.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
  logger.info('WebSocket server initialized');
});
