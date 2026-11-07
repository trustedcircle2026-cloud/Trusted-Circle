import { TRADERS_API_URL } from './config'

let nextRequestId = 0
const pending = new Map()

function makeNonce() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

window.addEventListener('message', event => {
  const message = event.data
  if (!message || message.type !== 'tc-traders-response' || typeof message.nonce !== 'string') return
  const request = pending.get(message.nonce)
  if (!request) return
  window.clearTimeout(request.timer)
  pending.delete(message.nonce)
  request.cleanup()
  if (!message.result?.ok) {
    request.reject(new Error(message.result?.error?.message || 'The backend rejected this request.'))
  } else {
    request.resolve(message.result)
  }
})

export async function tradersRequest(action, payload = {}, token = '') {
  if (!TRADERS_API_URL) throw new Error('Backend URL is not configured.')
  const nonce = makeNonce()
  const requestId = ++nextRequestId
  const frameName = 'tc_traders_post_' + requestId
  const frame = document.createElement('iframe')
  frame.name = frameName
  frame.title = 'Trusted Circle backend response'
  frame.setAttribute('aria-hidden', 'true')
  frame.tabIndex = -1
  frame.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-20px;bottom:-20px;border:0'
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = TRADERS_API_URL
  form.target = frameName
  form.acceptCharset = 'UTF-8'
  form.style.display = 'none'
  const fields = {
    tc_nonce: nonce,
    tc_payload: JSON.stringify({ action, ...payload, ...(token ? { token } : {}) })
  }
  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  })
  document.body.append(frame, form)

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      form.remove()
      frame.remove()
    }
    const timer = window.setTimeout(() => {
      pending.delete(nonce)
      cleanup()
      reject(new Error('No response received from Google Apps Script. Confirm that the latest Code.gs is deployed as a NEW Web App version, with Execute as Me and access enabled for your users.'))
    }, 30000)
    pending.set(nonce, { resolve, reject, cleanup, timer })
    try {
      form.submit()
    } catch (error) {
      window.clearTimeout(timer)
      pending.delete(nonce)
      cleanup()
      reject(new Error('Could not submit the request to Google Apps Script: ' + error.message))
    }
  })
}
