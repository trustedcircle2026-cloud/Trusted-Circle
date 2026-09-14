import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Storefront, ERP and Trusted Circle Books are separate production entry pages.
  // Relative asset URLs keep all three working on custom domains and GitHub Pages.
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html',
        books: 'books.html'
      }
    }
  }
})
