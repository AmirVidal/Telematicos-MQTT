
export const INCIDENT_TYPES = Object.freeze([
  { id: 'incendio', label: 'Incendio' },
  { id: 'intrusion', label: 'Intrusión' },
  { id: 'falla_electrica', label: 'Falla eléctrica' },
  { id: 'fuga_agua', label: 'Fuga de agua' },
  { id: 'otro', label: 'Otro incidente' },
])

export const MAX_INCIDENT_LOCATION_LENGTH = 100
export const MAX_INCIDENT_DESCRIPTION_LENGTH = 500

export function isIncidentType(type) {
  return INCIDENT_TYPES.some((item) => item.id === type)
}
