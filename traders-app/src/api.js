import { TRADERS_API_URL } from './config'

export async function tradersRequest(action, payload = {}, token = '') {
  if (!TRADERS_API_URL) throw new Error('Backend URL is not configured. Set TRADERS_API_URL after deploying the Apps Script Web App.')
  const response = await fetch(TRADERS_API_URL, {
    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload, ...(token ? { token } : {}) }),
  })
  if (!response.ok) throw new Error(`Traders API failed (HTTP ${response.status}).`)
  const data = await response.json()
  if (!data?.ok) throw new Error(data?.error?.message || 'Request failed.')
  return data
}
