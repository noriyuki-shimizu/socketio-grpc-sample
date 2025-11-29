import { defineStore } from 'pinia';

export type ChatMode = 'fast' | 'quality';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  status: 'pending' | 'streaming' | 'done' | 'error';
  createdAt: number;
  hasImage?: boolean;
}

export interface IncomingChunk {
  sessionId: string;
  chunkId: string;
  content: string;
  isFinal: boolean;
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    messages: [] as ChatMessage[],
    mode: 'fast' as ChatMode,
    streamingMessageId: null as string | null,
    lastError: ''
  }),
  actions: {
    setMode(mode: ChatMode) {
      this.mode = mode;
    },
    pushUserMessage(content: string, options?: { hasImage?: boolean }) {
      this.messages.push({
        id: crypto.randomUUID(),
        role: 'user',
        content,
        status: 'done',
        createdAt: Date.now(),
        hasImage: options?.hasImage
      });
    },
    startAssistantMessage() {
      const id = crypto.randomUUID();
      this.streamingMessageId = id;
      this.messages.push({
        id,
        role: 'assistant',
        content: '',
        status: 'streaming',
        createdAt: Date.now()
      });
      return id;
    },
    applyChunk(chunk: IncomingChunk) {
      if (!this.streamingMessageId) {
        this.startAssistantMessage();
      }
      const target = this.messages.find((msg) => msg.id === this.streamingMessageId);
      if (!target) return;
      target.content += chunk.content;
      if (chunk.isFinal) {
        target.status = 'done';
        this.streamingMessageId = null;
      }
    },
    pushError(message: string) {
      this.lastError = message;
      if (!message) return;
      this.messages.push({
        id: crypto.randomUUID(),
        role: 'system',
        content: message,
        status: 'error',
        createdAt: Date.now()
      });
    }
  }
});
