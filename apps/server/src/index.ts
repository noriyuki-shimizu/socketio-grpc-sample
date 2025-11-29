import Fastify from 'fastify';
import cors from '@fastify/cors';
import { appConfig } from './config.js';
import { createSocketServer } from './socket/index.js';
import { startGrpcServer } from './grpc/server.js';

async function bootstrap() {
  const fastify = Fastify({ logger: true });
  await fastify.register(cors, { origin: true });

  fastify.get('/healthz', async () => ({ status: 'ok' }));

  const grpcServer = await startGrpcServer();
  await fastify.listen({ port: appConfig.serverPort, host: '0.0.0.0' });

  createSocketServer(fastify.server);

  const shutdown = async () => {
    await fastify.close();
    grpcServer.forceShutdown();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
