import { resolve } from 'node:path'

import DrizzleORMMigrations from '@proj-airi/unplugin-drizzle-orm-migrations/vite'
import { defineConfig } from 'vite'

// NOTE: Since the alias for the core package has been set,
// the packaged code cannot be used directly,
// and the plugin needs to be reconfigured.
export default defineConfig({
  plugins: [
    DrizzleORMMigrations({
      root: '../..',
    }),
  ],

  resolve: {
    alias: {
      '@tg-search/core': resolve(__dirname, '../../packages/core/dist'),
      '@tg-search/common': resolve(__dirname, '../../packages/common/src'),
    },
  },

  optimizeDeps: {
    include: ['@tg-search/core', '@tg-search/common'],
  },
})
