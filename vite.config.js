import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  // Production includes the Storefront, Operations ERP, LIC Agent Portal,
  // and the isolated multi-page Admin Portal.
  base: './',
  appType: 'mpa',
  build: {
    rolldownOptions: {
      input: {
        main: resolve('index.html'),
        admin: resolve('admin.html'),
        agentPortal: resolve('agent-portal/index.html'),
        adminPortal: resolve('admin-portal/index.html'),
        adminAgents: resolve('admin-portal/agents.html'),
        adminRequests: resolve('admin-portal/requests.html'),
        adminHistory: resolve('admin-portal/history.html'),
        adminMore: resolve('admin-portal/more.html')
      }
    }
  }
})
