async function readError(response) {
  const result = await response.json().catch(() => ({}))

  return new Error(
    result.error || `Error del servidor (${response.status}).`
  )
}

// Consultar las respuestas registradas de una emergencia.
export async function loadEmergencyResponsesForReview({
  emergencyId
}) {
  if (!emergencyId) {
    throw new Error('Debes indicar una emergencia.')
  }

  const response = await fetch(
    `/api/emergencias/${encodeURIComponent(emergencyId)}/respuestas`,
    {
      method: 'GET',
      cache: 'no-store'
    }
  )

  if (!response.ok) {
    throw await readError(response)
  }

  const result = await response.json()

  if (!Array.isArray(result.responses)) {
    throw new Error('El servidor devolvió respuestas inválidas.')
  }

  return result.responses
}

// Descargar o visualizar una evidencia.
export async function loadEmergencyEvidenceForReview({
  emergencyId,
  fileId
}) {
  if (!emergencyId || !fileId) {
    throw new Error(
      'Faltan los datos necesarios para consultar la evidencia.'
    )
  }

  const response = await fetch(
    `/api/emergencias/${encodeURIComponent(emergencyId)}/evidencias/${encodeURIComponent(fileId)}`,
    {
      method: 'GET',
      cache: 'no-store'
    }
  )

  if (!response.ok) {
    throw await readError(response)
  }

  return response.blob()
}