export const ROLES = Object.freeze([
  'seguridad',
  'mantenimiento',
  'recepcion',
  'limpieza',
  'administracion'
])

export const INCIDENT_TYPES = Object.freeze([
  'incendio',
  'intrusion',
  'falla_electrica',
  'fuga_agua',
  'otro'
])

export const INCIDENT_STATUSES = Object.freeze([
  'abierto',
  'en_proceso',
  'resuelto',
  'cerrado'
])

export const SUPPORT_STATUSES = Object.freeze([
  'pendiente',
  'en_proceso',
  'resuelta',
  'cancelada'
])

export const MAX_MESSAGE_LENGTH = 500
export const MAX_INCIDENT_LOCATION_LENGTH = 100
export const MAX_INCIDENT_DESCRIPTION_LENGTH = 500
export const MAX_SUPPORT_DESCRIPTION_LENGTH = 300
