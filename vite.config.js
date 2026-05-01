import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Hii inaruhusu Vite kusikiliza network trafiki kutoka nje ya localhost
    host: true,
    // Hii inaruhusu link yako maalum ya ngrok ipite kwenye ulinzi wa Vite
    allowedHosts: [
      'santa-trapper-citation.ngrok-free.dev'
    ]
  }
})