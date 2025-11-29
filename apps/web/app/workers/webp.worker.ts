import imageCompression from 'browser-image-compression';

export interface WorkerPayload {
  file: File;
  quality: number;
}

self.onmessage = async (event: MessageEvent<WorkerPayload>) => {
  try {
    const { file, quality } = event.data;
    const compressed = await imageCompression(file, {
      fileType: 'image/webp',
      initialQuality: quality / 100,
      useWebWorker: false,
      maxSizeMB: 500,
      maxWidthOrHeight: 4096
    });
    const arrayBuffer = await compressed.arrayBuffer();
    self.postMessage({ success: true, buffer: arrayBuffer }, [arrayBuffer]);
  } catch (error) {
    self.postMessage({ success: false, message: (error as Error).message });
  }
};
