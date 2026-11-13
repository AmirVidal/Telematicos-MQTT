import { topics } from '../config/mqttTopics'

const BUILDING_ID = import.meta.env.VITE_BUILDING_ID ?? 'edificio-1'

export const MAX_SUPPORT_DESCRIPTION_LENGTH = 300

export function validateSupportRequest(description) {
  if (typeof description !== 'string') {
    throw new Error('La descripción debe ser texto.')
  }

  const normalized = description.trim()

  if (!normalized) {
    throw new Error('La descripción no puede estar vacía.')
  }

  if (normalized.length > MAX_SUPPORT_DESCRIPTION_LENGTH) {
    throw new Error(`La descripción no puede superar los ${MAX_SUPPORT_DESCRIPTION_LENGTH} caracteres.`)
  }

  return normalized
}

export function publishSupportRequest({ client, user, description }) {
  return new Promise((resolve, reject) => {
    try {
      if (!client || !client.connected) {
        throw new Error('No hay conexión con el broker MQTT.')
      }

      if (
        !user ||
        typeof user.id !== 'string' ||
        typeof user.name !== 'string' ||
        typeof user.role !== 'string'
      ) {
        throw new Error('El usuario no está identificado.')
      }

      const normalizedDescription = validateSupportRequest(description)
      const topic = topics.comandos.soporte(BUILDING_ID)

      const payload = {
        id: crypto.randomUUID(),
        requesterId: user.id,
        requesterName: user.name,
        requesterRole: user.role,
        type: 'soporte',
        description: normalizedDescription,
        timestamp: new Date().toISOString()
      }

      client.publish(
        topic,
        JSON.stringify(payload),
        {
          qos: 1,
          retain: false
        },
        (error) => {
          if (error) {
            reject(new Error('No se pudo enviar la solicitud de soporte.'))
            return
          }

          resolve(payload)
        }
      )
    } catch (error) {
      reject(error)
    }
  })
}
