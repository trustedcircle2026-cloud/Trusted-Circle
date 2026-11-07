import { TRADERS_API_URL } from './config'

export async function tradersRequest(action, payload = {}, token = '') {
  if (!TRADERS_API_URL) {
    throw new Error('Traders backend is not configured yet. Deploy the dedicated Apps Script Web App and set TRADERS_API_URL.')
  }
  const response = await fetch(TRADERS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload, ...(token ? { token } : {}) }),
  })
  if (!response.ok) throw new Error(`Traders API failed (HTTP ${response.status}).`)
  const data = await response.json()
  if (!data?.ok) throw new Error(data?.error?.message || 'Traders API request failed.')
  return data
}
