import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/renderer/src/**/*.test.{ts,tsx}', 'src/main/**/*.test.{ts,tsx}'],
  },
})
