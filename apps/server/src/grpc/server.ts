import { loadSync } from '@grpc/proto-loader';
import { Server, ServerCredentials, loadPackageDefinition } from '@grpc/grpc-js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appConfig } from '../config.js';
import { processChatRequest } from '../services/chatPipeline.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const protoPath = resolve(__dirname, '../../proto/chat.proto');

const packageDefinition = loadSync(protoPath, {
  keepCase: true,
  defaults: true,
  oneofs: true
});
const grpcDescriptor = loadPackageDefinition(packageDefinition) as any;
const chatPackage = grpcDescriptor.chat;

export async function startGrpcServer() {
  const server = new Server();

  server.addService(chatPackage.ChatService.service, {
    StreamReply: async (call: any) => {
      const { session_id, prompt, mode, image_webp } = call.request;
      await processChatRequest(
        {
          sessionId: session_id,
          prompt,
          mode,
          image: image_webp ? Buffer.from(image_webp) : undefined
        },
        (chunk) => {
          call.write({
            session_id: chunk.sessionId,
            content: chunk.content,
            is_final: chunk.isFinal
          });
        }
      );
      call.end();
    }
  });

  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.bindAsync(
      `0.0.0.0:${appConfig.grpcPort}`,
      ServerCredentials.createInsecure(),
      (err) => {
        if (err) {
          rejectPromise(err);
        } else {
          resolvePromise();
        }
      }
    );
  });

  server.start();
  return server;
}
