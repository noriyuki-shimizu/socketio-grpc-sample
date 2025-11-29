import { io, type Socket } from 'socket.io-client';

interface SocketBundle {
  control: Socket;
  stream: Socket;
}

declare module '#app' {
  interface NuxtApp {
    $sockets: SocketBundle;
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $sockets: SocketBundle;
  }
}

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const sessionId = useState('session-id', () => crypto.randomUUID());

  const buildSocket = (namespace: string, extra?: Record<string, unknown>) =>
    io(`${config.public.socketUrl}${namespace}`, {
      transports: ['websocket'],
      auth: {
        sessionId: sessionId.value,
        ...extra
      }
    });

  const sockets: SocketBundle = {
    control: buildSocket(config.public.socketControlNamespace),
    stream: buildSocket(config.public.socketStreamNamespace)
  };

  return {
    provide: {
      sockets
    }
  };
});
