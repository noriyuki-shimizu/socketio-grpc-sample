import { GoogleGenerativeAI, type Part } from '@google/generative-ai';
import { randomUUID } from 'node:crypto';
import { appConfig } from '../config.js';
import type { ChatRequestPayload, StreamChunk } from '../types/chat.js';

const hasApiKey = Boolean(appConfig.gemini.apiKey);
const genAI = hasApiKey ? new GoogleGenerativeAI(appConfig.gemini.apiKey) : null;

function createMockStream(prompt: string): AsyncGenerator<StreamChunk> {
  const phrases = [
    '（ダミー応答）Gemini API キーが設定されていないため、モック応答を返しています。',
    '設定方法: `.env` に GEMINI_API_KEY を追記し、`npm run dev:server` を再起動してください。',
    `あなたの入力: ${prompt}`
  ];
  return (async function* () {
    for (const phrase of phrases) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      yield {
        sessionId: '',
        content: phrase,
        isFinal: false,
        chunkId: randomUUID()
      } satisfies StreamChunk;
    }
    yield {
      sessionId: '',
      content: '',
      isFinal: true,
      chunkId: randomUUID()
    } satisfies StreamChunk;
  })();
}

export async function* streamFromGemini(payload: ChatRequestPayload): AsyncGenerator<StreamChunk> {
  if (!hasApiKey || !genAI) {
    const mock = createMockStream(payload.prompt);
    for await (const chunk of mock) {
      yield { ...chunk, sessionId: payload.sessionId };
    }
    return;
  }

  const model = genAI.getGenerativeModel({ model: appConfig.gemini.model });

  const parts: Part[] = [
    { text: payload.prompt }
  ];
  if (payload.imageWebp) {
    parts.push({
      inlineData: {
        data: payload.imageWebp.toString('base64'),
        mimeType: 'image/webp'
      }
    });
  }

  const response = await model.generateContentStream({
    contents: [
      {
        role: 'user',
        parts
      }
    ]
  });

  for await (const chunk of response.stream) {
    const text = chunk.text();
    if (!text) continue;
    yield {
      sessionId: payload.sessionId,
      content: text,
      isFinal: false,
      chunkId: randomUUID()
    } satisfies StreamChunk;
  }

  yield {
    sessionId: payload.sessionId,
    content: '',
    isFinal: true,
    chunkId: randomUUID()
  } satisfies StreamChunk;
}
