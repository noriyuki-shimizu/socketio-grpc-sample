<script setup lang="ts">
import type { IncomingChunk } from '../../stores/chat';
import { useChatStore } from '../../stores/chat';

definePageMeta({ ssr: false });

const chatStore = useChatStore();
console.log
const { compress } = useWebpCompressor();
const nuxtApp = useNuxtApp();
const sessionId = useState<string>('session-id');

const inputText = ref('');
const selectedFile = ref<File | null>(null);
const fileError = ref('');
const isSending = ref(false);
const MAX_BYTES = 500 * 1024 * 1024;

const modeOptions: Array<{ label: string; value: 'fast' | 'quality'; description: string }> = [
  { label: '高速 (Q=85)', value: 'fast', description: '低遅延・低帯域モード' },
  { label: '高品質 (Q=95)', value: 'quality', description: '高画質モード (遅延増)' }
];

const socketChunksHandler = (chunk: IncomingChunk) => {
  chatStore.applyChunk(chunk);
};

const socketErrorHandler = (payload: { message: string }) => {
  chatStore.pushError(payload.message);
  isSending.value = false;
};

onMounted(() => {
  nuxtApp.$sockets.stream.on('chat:chunk', socketChunksHandler);
  nuxtApp.$sockets.stream.on('chat:error', socketErrorHandler);
});

onBeforeUnmount(() => {
  nuxtApp.$sockets.stream.off('chat:chunk', socketChunksHandler);
  nuxtApp.$sockets.stream.off('chat:error', socketErrorHandler);
});

function onFilePicked(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0] ?? null;
  fileError.value = '';
  if (file && file.size > MAX_BYTES) {
    fileError.value = '500MB 以下のファイルを選択してください';
    selectedFile.value = null;
    return;
  }
  selectedFile.value = file;
}

function toggleMode(value: 'fast' | 'quality') {
  chatStore.setMode(value);
}

async function sendMessage() {
  if (!inputText.value.trim() && !selectedFile.value) {
    chatStore.pushError('テキストまたは画像を入力してください');
    return;
  }

  isSending.value = true;
  try {
    let imageBuffer: ArrayBuffer | undefined;
    if (selectedFile.value) {
      imageBuffer = await compress(selectedFile.value, chatStore.mode === 'quality' ? 95 : 85);
    }

    const prompt = inputText.value.trim();
    if (prompt || selectedFile.value) {
      chatStore.pushUserMessage(prompt || '画像のみのリクエスト', { hasImage: Boolean(selectedFile.value) });
    }

    chatStore.startAssistantMessage();

    await new Promise<void>((resolve, reject) => {
      nuxtApp.$sockets.control.emit(
        'chat:send',
        {
          sessionId: sessionId.value,
          prompt: prompt || '画像のみの送信',
          mode: chatStore.mode,
          image: imageBuffer,
          imageSize: imageBuffer?.byteLength
        },
        (ack: { success: boolean; message?: string }) => {
          if (ack?.success) {
            resolve();
          } else {
            reject(new Error(ack?.message ?? '送信に失敗しました'));
          }
        }
      );
    });

    inputText.value = '';
    selectedFile.value = null;
  } catch (error) {
    chatStore.pushError((error as Error).message);
  } finally {
    isSending.value = false;
  }
}
</script>

<template>
  <div class="p-6 space-y-6">
    <header>
      <p class="text-sm uppercase tracking-widest text-slate-400">Gemini Pro Vision ローカルチャット</p>
      <h1 class="text-3xl font-semibold mt-1">Realtime AI Console</h1>
    </header>
    <main class="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <section class="bg-panel/70 rounded-3xl p-6 space-y-4 h-[70vh] overflow-y-auto border border-white/5">
        <article
          v-for="message in chatStore.messages"
          :key="message.id"
          class="p-4 rounded-2xl"
          :class="message.role === 'user' ? 'bg-slate-800/70' : message.role === 'assistant' ? 'bg-slate-900/70' : 'bg-red-900/40'"
        >
          <header class="flex items-center justify-between mb-2">
            <span class="text-xs uppercase tracking-widest text-slate-400">{{ message.role }}</span>
            <span class="text-xs text-slate-500">{{ new Date(message.createdAt).toLocaleTimeString() }}</span>
          </header>
          <p class="whitespace-pre-wrap leading-relaxed">{{ message.content || '...受信中' }}</p>
          <p v-if="message.hasImage" class="text-xs text-amber-400 mt-2">画像データ送信済み</p>
        </article>
        <p v-if="!chatStore.messages.length" class="text-sm text-slate-500 text-center pt-20">
          ここに会話が表示されます。メッセージや画像を送信してストリーミング応答を確認してください。
        </p>
      </section>
      <section class="bg-panel/70 rounded-3xl p-6 space-y-4 border border-white/5">
        <div>
          <label class="text-xs uppercase tracking-widest text-slate-400">送信モード</label>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <button
              v-for="option in modeOptions"
              :key="option.value"
              class="p-3 rounded-2xl text-left border"
              :class="option.value === chatStore.mode ? 'border-emerald-400 bg-emerald-400/10' : 'border-white/10'"
              type="button"
              @click="toggleMode(option.value)"
            >
              <p class="font-semibold">{{ option.label }}</p>
              <p class="text-xs text-slate-400">{{ option.description }}</p>
            </button>
          </div>
        </div>
        <div>
          <label class="text-xs uppercase tracking-widest text-slate-400">画像 (WebP 変換されます)</label>
          <input type="file" accept="image/*" class="mt-2 w-full" @change="onFilePicked" />
          <p v-if="selectedFile" class="text-xs text-slate-400 mt-1">
            選択中: {{ selectedFile.name }} ({{ (selectedFile.size / 1024 / 1024).toFixed(1) }} MB)
          </p>
          <p v-if="fileError" class="text-xs text-red-400 mt-1">{{ fileError }}</p>
        </div>
        <div>
          <label class="text-xs uppercase tracking-widest text-slate-400">プロンプト</label>
          <textarea
            v-model="inputText"
            rows="6"
            class="mt-2 w-full rounded-2xl bg-slate-900/60 border border-white/10 p-3 focus:outline-none"
            placeholder="質問または説明を入力してください"
          />
        </div>
        <button
          type="button"
          class="w-full py-3 rounded-2xl font-semibold bg-gradient-to-r from-emerald-400 to-blue-500 text-slate-900 disabled:opacity-40"
          :disabled="isSending"
          @click="sendMessage"
        >
          {{ isSending ? '送信中...' : '送信' }}
        </button>
        <p v-if="chatStore.lastError" class="text-xs text-red-400">{{ chatStore.lastError }}</p>
      </section>
    </main>
  </div>
</template>
