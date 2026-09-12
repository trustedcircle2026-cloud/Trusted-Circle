import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Both storefront and admin.html are served from the custom domain and
  // may also be hosted under a GitHub Pages path. Relative asset URLs work
  // correctly in both environments.
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html'
      }
    }
  }
})
