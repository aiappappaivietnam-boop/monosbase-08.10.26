import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const watchedFiles = [
  resolve(process.cwd(), 'assets'),
  resolve(process.cwd(), 'public'),
];

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 4322,
    strictPort: true,
    watch: {
      usePolling: true,
      interval: 250,
    },
    fs: {
      strict: false,
    },
  },
  optimizeDeps: {
    exclude: ['@emotion/is-prop-valid'],
  },
  plugins: [
    {
      name: 'reload-bundled-app-assets',
      configureServer(server) {
        server.watcher.add(watchedFiles);
        server.watcher.on('change', (file) => {
          if (watchedFiles.some((directory) => file.startsWith(directory))) {
            server.ws.send({ type: 'full-reload' });
          }
        });
      },
    },
  ],
});
