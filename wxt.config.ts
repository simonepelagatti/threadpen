import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'ThreadPen — Gmail Reply Assistant',
    description: 'Draft Gmail replies with AI assistance using Claude',
    version: '1.0.0',
    permissions: ['storage', 'activeTab', 'clipboardWrite'],
    host_permissions: ['https://mail.google.com/*', 'https://api.anthropic.com/*'],
  },
});
