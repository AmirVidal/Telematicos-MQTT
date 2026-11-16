
import {
  isIncidentType,
  MAX_INCIDENT_DESCRIPTION_LENGTH,
  MAX_INCIDENT_LOCATION_LENGTH
} from '../config/incidentOptions'

export function parseIncident(payload) {
  const raw =
    typeof payload === 'string'
      ? payload
      : new TextDecoder().decode(payload)

  const parsed = JSON.parse(raw)

  if (
    !parsed ||
    parsed.type !== 'incidente' ||
    typeof parsed.id !== 'string' ||
    !parsed.id ||
    !isIncidentType(parsed.incidentType) ||
    typeof parsed.location !== 'string' ||
    !parsed.location.trim() ||
    parsed.location.length > MAX_INCIDENT_LOCATION_LENGTH ||
    typeof parsed.description !== 'string' ||
    !parsed.description.trim() ||
    parsed.description.length > MAX_INCIDENT_DESCRIPTION_LENGTH ||
    typeof parsed.reporterName !== 'string' ||
    !parsed.reporterName.trim() ||
    typeof parsed.timestamp !== 'string' ||
    Number.isNaN(Date.parse(parsed.timestamp))
  ) {
    throw new Error('El reporte de incidente tiene un formato inválido.')
  }

  return {
    id: parsed.id,
    incidentType: parsed.incidentType,
    location: parsed.location,
    description: parsed.description,
    reporterId:
      typeof parsed.reporterId === 'string'
        ? parsed.reporterId
        : null,
    reporterName: parsed.reporterName,
    reporterRole:
      typeof parsed.reporterRole === 'string'
        ? parsed.reporterRole
        : '',
    timestamp: parsed.timestamp
  }
}
