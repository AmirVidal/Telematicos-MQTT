
import { topics } from '../config/mqttTopics'
import {
  isIncidentType,
  MAX_INCIDENT_LOCATION_LENGTH,
  MAX_INCIDENT_DESCRIPTION_LENGTH
} from '../config/incidentOptions'

const BUILDING_ID = import.meta.env.VITE_BUILDING_ID ?? 'edificio-1'

export function validateIncident({ type, location, description }) {
  if (!isIncidentType(type)) {
    throw new Error('Selecciona un tipo de incidente válido.')
  }

  if (typeof location !== 'string' || !location.trim()) {
    throw new Error('Indica la ubicación del incidente.')
  }

  if (location.trim().length > MAX_INCIDENT_LOCATION_LENGTH) {
    throw new Error(`La ubicación no puede superar ${MAX_INCIDENT_LOCATION_LENGTH} caracteres.`)
  }

  if (typeof description !== 'string' || !description.trim()) {
    throw new Error('Describe lo ocurrido.')
  }

  if (description.trim().length > MAX_INCIDENT_DESCRIPTION_LENGTH) {
    throw new Error(`La descripción no puede superar ${MAX_INCIDENT_DESCRIPTION_LENGTH} caracteres.`)
  }

  return {
    type,
    location: location.trim(),
    description: description.trim()
  }
}

export function publishIncident({ client, user, incident }) {
  return new Promise((resolve, reject) => {
    try {
      if (!client?.connected) {
        throw new Error('No hay conexión con el broker MQTT.')
      }

      if (!user?.id || !user?.name || !user?.role) {
        throw new Error('El usuario no está identificado.')
      }

      const validated = validateIncident(incident)

      const payload = {
        id: crypto.randomUUID(),
        type: 'incidente',
        incidentType: validated.type,
        location: validated.location,
        description: validated.description,
        reporterId: user.id,
        reporterName: user.name,
        reporterRole: user.role,
        timestamp: new Date().toISOString()
      }

      client.publish(
        topics.incidentes.reportes(BUILDING_ID),
        JSON.stringify(payload),
        { qos: 1, retain: false },
        (error) => {
          if (error) {
            reject(new Error('No se pudo publicar el incidente.'))
          } else {
            resolve(payload)
          }
        }
      )
    } catch (error) {
      reject(error)
    }
  })
}
