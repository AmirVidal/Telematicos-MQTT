import { TIPOS_ALERTA } from './mqttTopics'
import { USER_ROLES } from '../services/userSession'

const LABELS = {
  incendio: 'Incendio',
  intrusion: 'Intrusión',
  falla_electrica: 'Falla eléctrica',
  fuga_agua: 'Fuga de agua',
  evacuacion: 'Evacuación',
  general: 'Otra emergencia'
}

export const EMERGENCY_TYPES = TIPOS_ALERTA.map((id) => ({
  id,
  label: LABELS[id] ?? id
}))

export const MAX_EMERGENCY_LOCATION_LENGTH = 120
export const MAX_EMERGENCY_DESCRIPTION_LENGTH = 500

export function canPublishEmergency(role) {
  return (
    role === USER_ROLES.SEGURIDAD ||
    role === USER_ROLES.ADMINISTRACION
  )
}

export function getEmergencyTypeLabel(id) {
  return (
    EMERGENCY_TYPES.find((type) => type.id === id)?.label ??
    'Emergencia'
  )
}