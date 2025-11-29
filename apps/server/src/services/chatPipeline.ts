import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { appConfig, qualityFromMode, type ChatMode } from '../config.js';
import type { ChatRequestPayload, StreamChunk } from '../types/chat.js';
import { ensureWebpQuality } from './imageTransformer.js';
import { streamFromGemini } from './geminiClient.js';

const socketPayloadSchema = z.object({
  sessionId: z.string().min(1),
  prompt: z.string().min(1),
  mode: z.enum(['fast', 'quality']),
  imageSize: z.number().optional(),
  image: z.instanceof(Buffer).optional()
});

export type SocketEventPayload = z.infer<typeof socketPayloadSchema>;

export type ChunkEmitter = (chunk: StreamChunk) => void;

async function buildPayload(parsed: SocketEventPayload): Promise<ChatRequestPayload> {
  let transformed: Buffer | undefined;
  if (parsed.image) {
    if ((parsed.imageSize ?? parsed.image.byteLength) > appConfig.compression.maxUploadBytes) {
      throw new Error('画像サイズが上限(500MB)を超えています');
    }
    transformed = await ensureWebpQuality(parsed.image, qualityFromMode(parsed.mode as ChatMode));
  }

  return {
    sessionId: parsed.sessionId,
    prompt: parsed.prompt,
    mode: parsed.mode as ChatMode,
    imageWebp: transformed
  };
}

export async function processChatRequest(raw: Partial<SocketEventPayload>, emit: ChunkEmitter) {
  const candidate: SocketEventPayload = {
    sessionId: raw.sessionId ?? '',
    prompt: raw.prompt ?? '',
    mode: (raw.mode as ChatMode) ?? 'fast',
    image: raw.image ? Buffer.from(raw.image) : undefined,
    imageSize: raw.imageSize ?? raw.image?.byteLength
  };

  const parsed = socketPayloadSchema.parse(candidate);
  const payload = await buildPayload(parsed);

  for await (const chunk of streamFromGemini(payload)) {
    emit({ ...chunk, sessionId: payload.sessionId });
  }
}

export function createStreamingAck(success: boolean, message?: string) {
  return {
    success,
    message,
    requestId: randomUUID()
  };
}
