import { TRADERS_API_URL } from './config'

let bridgeFrame
let bridgeReady
let nextRequestId = 0
const pending = new Map()

function getBridge() {
  if (bridgeFrame?.contentWindow && bridgeReady) return bridgeReady
  if (!bridgeFrame) {
    bridgeFrame = document.createElement('iframe')
    bridgeFrame.title = 'Trusted Circle secure API bridge'
    bridgeFrame.setAttribute('aria-hidden', 'true')
    bridgeFrame.tabIndex = -1
    bridgeFrame.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-10px;bottom:-10px;border:0'
    bridgeReady = new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('Secure backend bridge timed out. Check that the Apps Script Web App is deployed for access.')), 20000)
      bridgeFrame.addEventListener('load', () => { window.clearTimeout(timer); resolve(bridgeFrame) }, { once: true })
      bridgeFrame.addEventListener('error', () => { window.clearTimeout(timer); reject(new Error('Could not load the Apps Script bridge. Check the Web App deployment URL and access settings.')) }, { once: true })
    })
    bridgeFrame.src = TRADERS_API_URL + (TRADERS_API_URL.includes('?') ? '&' : '?') + 'bridge=1'
    document.body.appendChild(bridgeFrame)
  }
  return bridgeReady
}

window.addEventListener('message', event => {
  if (!bridgeFrame || event.source !== bridgeFrame.contentWindow) return
  const message = event.data
  if (!message || !message.id || !pending.has(message.id)) return
  const { resolve, reject, timer } = pending.get(message.id)
  window.clearTimeout(timer)
  pending.delete(message.id)
  if (message.error) reject(new Error(message.error))
  else if (!message.result?.ok) reject(new Error(message.result?.error?.message || 'The backend rejected this request.'))
  else resolve(message.result)
})

export async function tradersRequest(action, payload = {}, token = '') {
  if (!TRADERS_API_URL) throw new Error('Backend URL is not configured.')
  const frame = await getBridge()
  const id = 'tc_' + (++nextRequestId) + '_' + Date.now()
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pending.delete(id)
      reject(new Error('The backend did not respond. Confirm Apps Script deployment, spreadsheet permission and bridge code.'))
    }, 30000)
    pending.set(id, { resolve, reject, timer })
    frame.contentWindow.postMessage({ id, input: { action, ...payload, ...(token ? { token } : {}) } }, '*')
  })
}
