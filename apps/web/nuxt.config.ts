export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['@/assets/css/main.css'],
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],
  runtimeConfig: {
    public: {
      socketUrl: process.env.NUXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000',
      socketStreamNamespace: '/chat/stream',
      socketControlNamespace: '/chat/control'
    }
  },
  tailwindcss: {
    exposeConfig: true
  }
});
