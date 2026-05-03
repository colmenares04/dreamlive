import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'DreamLive',
    version: '3.0.0',
    permissions: ['storage'],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
