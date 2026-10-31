const SECRET = 'teodorcas-pharmacy-2026'

export const SESSION_KEY = 'teodorcas_session'

const SESSION_MAX_AGE = 30 * 60 * 1000 // 30 min max

export function createSession(code, role) {
  const payload = `${code}:${role}:${Date.now()}`
  const signature = btoa(payload + ':' + SECRET)
  return btoa(payload) + '.' + signature
}

export function validateSession(token) {
  try {
    const [payloadB64, signature] = token.split('.')
    if (!payloadB64 || !signature) return null

    const payload = atob(payloadB64)
    const expectedSig = btoa(payload + ':' + SECRET)
    if (signature !== expectedSig) return null

    const [code, role, timestamp] = payload.split(':')
    const age = Date.now() - parseInt(timestamp)
    if (age > SESSION_MAX_AGE) return null

    return { code, role }
  } catch {
    return null
  }
}
