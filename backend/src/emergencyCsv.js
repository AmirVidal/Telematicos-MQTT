
import { queryEmergencyHistory, HistoryError } from './emergencyHistory.js'

const HEADERS = [
  'ID',
  'Tipo',
  'Ubicación',
  'Descripción',
  'Estado',
  'Reportado por',
  'Rol',
  'Fecha de alerta',
  'Fecha de resolución'
]

function csvCell(value) {
  let text = value == null ? '' : String(value)

  // Evita que una hoja de cálculo interprete datos como fórmulas.
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text)) {
    text = `'${text}`
  }

  return `"${text.replace(/"/g, '""')}"`
}

function csvRow(values) {
  return values.map(csvCell).join(',')
}

export async function exportEmergencyCsv(requestUrl, buildingId) {
  const url = new URL(requestUrl)
  url.searchParams.delete('page')
  url.searchParams.delete('limit')
  url.searchParams.set('page', '1')
  url.searchParams.set('limit', '100')

  const firstPage = await queryEmergencyHistory(url, buildingId)

  // Límite de seguridad para evitar exportaciones demasiado grandes.
  if (firstPage.pagination.total > 10000) {
    throw new HistoryError(
      413,
      'La exportación supera los 10000 registros permitidos. Reduce el rango de fechas.'
    )
  }

  const records = [...firstPage.records]

  for (let page = 2; page <= firstPage.pagination.totalPages; page++) {
    url.searchParams.set('page', String(page))
    const result = await queryEmergencyHistory(url, buildingId)
    records.push(...result.records)
  }

  const rows = [
    csvRow(HEADERS),
    ...records.map((record) =>
      csvRow([
        record.emergencyId,
        record.emergencyType,
        record.location,
        record.description,
        record.status,
        record.senderName,
        record.senderRole,
        formatCsvDate(record.timestamp),
        formatCsvDate(record.resolvedAt)
      ])
    )
  ]

  return '\uFEFF' + rows.join('\r\n') + '\r\n'
}


function formatCsvDate(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date)
}
