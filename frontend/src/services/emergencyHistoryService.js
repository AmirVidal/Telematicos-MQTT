
export async function getEmergencyHistory(filters = {}, page = 1) {
  const params = new URLSearchParams({
    page: String(page),
    limit: '10'
  })

  if (filters.type) params.set('type', filters.type)
  if (filters.status) params.set('status', filters.status)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)

  let response

  try {
    response = await fetch(
      `/history-api/emergencies/history?${params.toString()}`,
      { cache: 'no-store' }
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor del historial.')
  }

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      result?.error || 'No se pudo consultar el historial.'
    )
  }

  if (!Array.isArray(result?.records) || !result?.pagination) {
    throw new Error('El servidor devolvió una respuesta inválida.')
  }

  return result
}
