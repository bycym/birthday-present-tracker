/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

/**
 * GitHub Pages serves a project site under /<repo>/, so the base must match the
 * repository name exactly. Deriving it from GITHUB_REPOSITORY in CI keeps the
 * two from drifting apart; a user site (<user>.github.io) is served at the root.
 */
function resolveBase(): string {
  const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]
  if (!repository) return `/${pkg.name}/`
  return repository.endsWith('.github.io') ? '/' : `/${repository}/`
}

export default defineConfig({
  base: resolveBase(),
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    // Changes on every build, so the service worker gets a new cache name and
    // a byte-different script URL — old shells cannot outlive a deploy.
    __BUILD_ID__: JSON.stringify(Date.now().toString(36)),
  },
  plugins: [react(), tailwindcss()],
  build: {
    // Split the rarely-changing vendor code so a redeploy only busts the app chunk.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          data: ['@tanstack/react-query', 'dexie'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
