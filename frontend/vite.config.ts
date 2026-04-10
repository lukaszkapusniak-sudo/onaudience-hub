import path from 'node:path';
import { fileURLToPath } from 'node:url';

import vue from '@vitejs/plugin-vue';
import sirv from 'sirv';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const legacyHubRoot = path.resolve(__dirname, '../www/hub');

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/onaudience-hub/' : '/',
  plugins: [
    vue(),
    {
      name: 'legacy-hub-dev',
      configureServer(server) {
        server.middlewares.use('/hub', sirv(legacyHubRoot, { dev: true, etag: true }));
      },
    },
  ],
}));
