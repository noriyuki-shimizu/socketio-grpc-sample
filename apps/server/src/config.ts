import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env') });

const SOCKET_STREAM_NS = '/chat/stream';
const SOCKET_CONTROL_NS = '/chat/control';

export const appConfig = {
  serverPort: Number(process.env.SERVER_PORT ?? 4000),
  grpcPort: Number(process.env.GRPC_PORT ?? 50051),
  socket: {
    streamNamespace: SOCKET_STREAM_NS,
    controlNamespace: SOCKET_CONTROL_NS
  },
  compression: {
    fastQuality: 85,
    qualityQuality: 95,
    maxUploadBytes: 500 * 1024 * 1024
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'
  },
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-session-secret'
};

export type ChatMode = 'fast' | 'quality';

export const qualityFromMode = (mode: ChatMode) =>
  mode === 'quality' ? appConfig.compression.qualityQuality : appConfig.compression.fastQuality;
