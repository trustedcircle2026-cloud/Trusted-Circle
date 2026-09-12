import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the project under /Trusted-Circle/ while
  // AWS Amplify serves the application from the domain root.
  base: process.env.VITE_BASE || '/Trusted-Circle/',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html'
      }
    }
  }
})
