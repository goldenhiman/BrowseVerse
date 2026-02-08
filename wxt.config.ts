import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  outDir: 'output',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'BrowseVerse - Browsing Knowledge OS',
    description: 'A local-first personal knowledge system for your browsing',
    version: '0.1.0',
    permissions: ['tabs', 'activeTab', 'storage', 'idle', 'webNavigation', 'alarms'],
    host_permissions: ['<all_urls>'],
    icons: {
      128: 'assets/icon.svg',
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
