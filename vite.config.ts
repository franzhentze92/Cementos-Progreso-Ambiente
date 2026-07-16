import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { localChatApiPlugin } from './vite-plugin-local-chat'

export default defineConfig(({ mode }) => {
  // '' = también variables sin prefijo VITE_ (p. ej. OPENAI_API_KEY)
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), localChatApiPlugin(env.OPENAI_API_KEY)],
  }
})
