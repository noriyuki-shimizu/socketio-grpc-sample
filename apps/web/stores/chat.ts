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

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([]);
  const mode = ref<ChatMode>('fast');
  const streamingMessageId = ref<string | null>(null);
  const lastError = ref<string>('');

  function setMode(newMode: ChatMode) {
    mode.value = newMode;
  }
  function pushUserMessage(content: string, options?: { hasImage?: boolean }) {
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'user',
      content,
      status: 'done',
      createdAt: Date.now(),
      hasImage: options?.hasImage
    });
  }
  function startAssistantMessage() {
    const id = crypto.randomUUID();
    streamingMessageId.value = id;
    messages.value.push({
      id,
      role: 'assistant',
      content: '',
      status: 'streaming',
      createdAt: Date.now()
    });
    return id;
  }
  function applyChunk(chunk: IncomingChunk) {
    if (!streamingMessageId.value) {
      startAssistantMessage();
    }
    const target = messages.value.find((msg) => msg.id === streamingMessageId.value);
    if (!target) return;
    target.content += chunk.content;
    if (chunk.isFinal) {
      target.status = 'done';
      streamingMessageId.value = null;
    }
  }
  function pushError(message: string) {
    lastError.value = message;
    if (!message) return;
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'system',
      content: message,
      status: 'error',
      createdAt: Date.now()
    });
  }

  return {
    messages,
    mode,
    streamingMessageId,
    lastError,
    setMode,
    pushUserMessage,
    startAssistantMessage,
    applyChunk,
    pushError
  }
});
