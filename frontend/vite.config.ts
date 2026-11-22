import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  const proxyTarget =
    processEnv?.VITE_PROXY_TARGET || env.VITE_PROXY_TARGET || 'http://localhost:8080';
  // The notification service is a separate app on its own port in dev.
  const notificationProxyTarget =
    processEnv?.VITE_NOTIFICATION_PROXY_TARGET ||
    env.VITE_NOTIFICATION_PROXY_TARGET ||
    'http://localhost:8082';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        // More specific prefixes must come first.
        '/api/notification': {
          target: notificationProxyTarget,
          changeOrigin: true,
        },
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
