import { TRADERS_API_URL } from './config'

let bridgeFrame
let bridgeReady
let resolveBridge
let rejectBridge
let nextRequestId = 0
const pending = new Map()

function getBridge() {
  if (bridgeReady) return bridgeReady
  bridgeReady = new Promise((resolve, reject) => {
    resolveBridge = resolve
    rejectBridge = reject
    const timer = window.setTimeout(() => {
      reject(new Error('Traders backend bridge did not become ready. Deploy the latest Code.gs and Bridge.html as a NEW Apps Script version, and confirm Web App access is set correctly.'))
    }, 15000)
    const finish = frame => {
      window.clearTimeout(timer)
      resolve(frame)
    }
    if (!bridgeFrame) {
      bridgeFrame = document.createElement('iframe')
      bridgeFrame.title = 'Trusted Circle secure API bridge'
      bridgeFrame.setAttribute('aria-hidden', 'true')
      bridgeFrame.tabIndex = -1
      bridgeFrame.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-10px;bottom:-10px;border:0'
      bridgeFrame.addEventListener('error', () => {
        window.clearTimeout(timer)
        reject(new Error('Google Apps Script bridge could not be loaded. Check the Web App deployment URL and access permissions.'))
      }, { once: true })
      bridgeFrame.src = TRADERS_API_URL + (TRADERS_API_URL.includes('?') ? '&' : '?') + 'bridge=1'
      document.body.appendChild(bridgeFrame)
    }
    // A load event alone is insufficient: Google may load a sign-in page or an old deployment.
    // The HTML Service bridge explicitly announces readiness after its message handler is installed.
    resolveBridge = () => finish(bridgeFrame)
  })
  return bridgeReady
}

window.addEventListener('message', event => {
  if (!bridgeFrame || event.source !== bridgeFrame.contentWindow) return
  const message = event.data
  if (message?.type === 'tc-traders-bridge-ready') {
    resolveBridge?.()
    return
  }
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
      reject(new Error('Apps Script bridge is ready but did not return data. Check spreadsheet Script Properties, run tradersSetupProduction(), and confirm the deployed Apps Script version.'))
    }, 30000)
    pending.set(id, { resolve, reject, timer })
    frame.contentWindow.postMessage({ id, input: { action, ...payload, ...(token ? { token } : {}) } }, '*')
  })
}
