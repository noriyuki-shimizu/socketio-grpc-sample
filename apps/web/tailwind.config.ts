import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{vue,ts}',
    './components/**/*.{vue,ts}',
    './layouts/**/*.{vue,ts}'
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f172a',
        panel: '#111827'
      }
    }
  },
  plugins: []
} satisfies Config;
