import type { Server as HTTPServer } from 'node:http';
import { Server } from 'socket.io';
import { appConfig } from '../config.js';
import { createStreamingAck, processChatRequest } from '../services/chatPipeline.js';

export function createSocketServer(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const streamNamespace = io.of(appConfig.socket.streamNamespace);
  const controlNamespace = io.of(appConfig.socket.controlNamespace);

  streamNamespace.on('connection', (socket) => {
    const sessionId = (socket.handshake.auth as any)?.sessionId ?? socket.handshake.query.sessionId;
    if (typeof sessionId === 'string') {
      socket.join(sessionId);
    }
  });

  controlNamespace.on('connection', (socket) => {
    socket.on('chat:send', async (payload: any, ack?: (res: unknown) => void) => {
      try {
        await processChatRequest(payload, (chunk) => {
          streamNamespace.to(payload.sessionId).emit('chat:chunk', chunk);
        });
        ack?.(createStreamingAck(true));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error';
        ack?.(createStreamingAck(false, message));
        streamNamespace.to(payload.sessionId).emit('chat:error', {
          sessionId: payload.sessionId,
          message
        });
      }
    });
  });

  return io;
}
