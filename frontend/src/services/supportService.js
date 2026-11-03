const SUPPORT_API = '/api/soporte'

export const MAX_SUPPORT_CHAT_LENGTH = 500
export const MAX_SUPPORT_RESOLUTION_TEXT = 1000
export const MAX_SUPPORT_EVIDENCE_FILES = 3
export const MAX_SUPPORT_EVIDENCE_SIZE = 5 * 1024 * 1024

const SUPPORT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function buildIdentityParams(user) {
  if (!user?.id || !user?.name || !user?.role) {
    throw new Error('El usuario no está identificado.')
  }

  return new URLSearchParams({
    userId: user.id,
    name: user.name,
    role: user.role
  })
}

async function parseResponse(response) {
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(result.error || `Error del servidor (${response.status}).`)
  }
  return result
}

export function validateSupportEvidence(files) {
  if (!Array.isArray(files) || files.length < 1 || files.length > MAX_SUPPORT_EVIDENCE_FILES) {
    throw new Error(`Adjunta entre 1 y ${MAX_SUPPORT_EVIDENCE_FILES} imágenes.`)
  }

  for (const file of files) {
    if (!SUPPORT_IMAGE_TYPES.has(file.type)) {
      throw new Error('Solo se admiten imágenes JPG, PNG o WebP.')
    }
    if (!file.size || file.size > MAX_SUPPORT_EVIDENCE_SIZE) {
      throw new Error('Cada imagen debe pesar entre 1 byte y 5 MB.')
    }
  }
}

export async function getActiveSupportRequests(user) {
  const params = buildIdentityParams(user)
  const response = await fetch(`${SUPPORT_API}/solicitudes?${params.toString()}`, {
    cache: 'no-store'
  })
  const result = await parseResponse(response)
  return Array.isArray(result.requests) ? result.requests : []
}

export async function respondSupportRequest({ requestId, user }) {
  const response = await fetch(
    `${SUPPORT_API}/solicitudes/${encodeURIComponent(requestId)}/responder`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        responderId: user.id,
        responderName: user.name,
        responderRole: user.role
      })
    }
  )
  const result = await parseResponse(response)
  return result.request
}

export async function getSupportChats(user) {
  const params = buildIdentityParams(user)
  const response = await fetch(`${SUPPORT_API}/chats?${params.toString()}`, {
    cache: 'no-store'
  })
  const result = await parseResponse(response)
  return Array.isArray(result.chats) ? result.chats : []
}

export async function getSupportChatMessages({ requestId, user }) {
  const params = buildIdentityParams(user)
  const response = await fetch(
    `${SUPPORT_API}/chats/${encodeURIComponent(requestId)}/mensajes?${params.toString()}`,
    { cache: 'no-store' }
  )
  const result = await parseResponse(response)
  return {
    request: result.request,
    messages: Array.isArray(result.messages) ? result.messages : []
  }
}

export async function sendSupportChatMessage({ requestId, user, content }) {
  const normalized = typeof content === 'string' ? content.trim() : ''

  if (!normalized) {
    throw new Error('El mensaje no puede estar vacío.')
  }
  if (normalized.length > MAX_SUPPORT_CHAT_LENGTH) {
    throw new Error(`El mensaje no puede superar los ${MAX_SUPPORT_CHAT_LENGTH} caracteres.`)
  }

  const response = await fetch(
    `${SUPPORT_API}/chats/${encodeURIComponent(requestId)}/mensajes`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: user.id,
        senderName: user.name,
        senderRole: user.role,
        content: normalized
      })
    }
  )
  const result = await parseResponse(response)
  return result.message
}

export async function resolveSupportRequest({
  requestId,
  user,
  problem,
  resolution,
  files
}) {
  const normalizedProblem = typeof problem === 'string' ? problem.trim() : ''
  const normalizedResolution = typeof resolution === 'string' ? resolution.trim() : ''

  if (!normalizedProblem) {
    throw new Error('Describe el problema encontrado.')
  }
  if (normalizedProblem.length > MAX_SUPPORT_RESOLUTION_TEXT) {
    throw new Error('El problema encontrado supera el límite de caracteres.')
  }
  if (!normalizedResolution) {
    throw new Error('Describe cómo se solucionó la solicitud.')
  }
  if (normalizedResolution.length > MAX_SUPPORT_RESOLUTION_TEXT) {
    throw new Error('La solución aplicada supera el límite de caracteres.')
  }

  validateSupportEvidence(files)

  const form = new FormData()
  form.append('responderId', user.id)
  form.append('responderName', user.name)
  form.append('responderRole', user.role)
  form.append('problem', normalizedProblem)
  form.append('resolution', normalizedResolution)
  files.forEach((file) => form.append('evidence', file))

  const response = await fetch(
    `${SUPPORT_API}/solicitudes/${encodeURIComponent(requestId)}/resolver`,
    { method: 'POST', body: form }
  )
  const result = await parseResponse(response)
  return result.resolution
}

export async function getResolvedSupportCases(user) {
  const params = buildIdentityParams(user)
  const response = await fetch(`${SUPPORT_API}/resueltos?${params.toString()}`, {
    cache: 'no-store'
  })
  const result = await parseResponse(response)
  return Array.isArray(result.resolutions) ? result.resolutions : []
}

export async function downloadSupportEvidence({ resolutionId, evidence }) {
  const response = await fetch(
    `${SUPPORT_API}/resueltos/${encodeURIComponent(resolutionId)}/evidencias/${encodeURIComponent(evidence.id)}`,
    { cache: 'no-store' }
  )

  if (!response.ok) {
    throw new Error('No se pudo descargar la evidencia.')
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = evidence.filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000)
}
