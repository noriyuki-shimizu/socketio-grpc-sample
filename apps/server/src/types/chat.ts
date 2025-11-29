import type { ChatMode } from '../config.js';

export interface ChatRequestPayload {
  sessionId: string;
  prompt: string;
  mode: ChatMode;
  imageWebp?: Buffer;
}

export interface StreamChunk {
  sessionId: string;
  content: string;
  isFinal: boolean;
  chunkId: string;
}
