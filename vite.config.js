import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Production includes the Storefront, Operations ERP, LIC Agent Portal, and Admin Portal.
  // Relative asset URLs keep both working on custom domains and GitHub Pages.
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html',
        agentPortal: 'agent-portal.html',
        adminPortal: 'admin-portal.html'
      }
    }
  }
})
