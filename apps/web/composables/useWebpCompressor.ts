const workerFactory = () =>
  new Worker(new URL('../app/workers/webp.worker.ts', import.meta.url), { type: 'module' });

export function useWebpCompressor() {
  if (import.meta.server) {
    return {
      compress: async () => {
        throw new Error('WebP 圧縮はクライアントのみでサポートされています');
      }
    } as const;
  }

  const worker = useState<Worker | null>('webp-worker', () => workerFactory());

  const compress = (file: File, quality: number) =>
    new Promise<ArrayBuffer>((resolve, reject) => {
      if (!worker.value) {
        worker.value = workerFactory();
      }
      const handleMessage = (event: MessageEvent<any>) => {
        const { success, buffer, message } = event.data;
        worker.value?.removeEventListener('message', handleMessage);
        if (success) {
          resolve(buffer as ArrayBuffer);
        } else {
          reject(new Error(message ?? 'compression failed'));
        }
      };
      worker.value?.addEventListener('message', handleMessage, { once: true });
      worker.value?.postMessage({ file, quality });
    });

  return { compress };
}
