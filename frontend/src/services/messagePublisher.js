import { getChannelTopic } from '../config/channelOptions'

export const MAX_MESSAGE_LENGTH = 500

export function validateMessage(content) {
  if (typeof content !== 'string') {
    throw new Error('El mensaje debe ser texto.')
  }

  const normalizedContent = content.trim()

  if (!normalizedContent) {
    throw new Error('El mensaje no puede estar vacío.')
  }

  if (normalizedContent.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`El mensaje no puede superar los ${MAX_MESSAGE_LENGTH} caracteres.`)
  }

  return normalizedContent
}

export function publishMessage({ client, user, channelId, content }) {
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

      const topic = getChannelTopic(channelId)

      if (!topic) {
        throw new Error('Seleccione un canal válido.')
      }

      const normalizedContent = validateMessage(content)

      const message = {
        id: crypto.randomUUID(),
        senderId: user.id,
        senderName: user.name,
        senderRole: user.role,
        channelId,
        content: normalizedContent,
        timestamp: new Date().toISOString()
      }

      client.publish(
        topic,
        JSON.stringify(message),
        {
          qos: 1,
          retain: false
        },
        (error) => {
          if (error) {
            reject(new Error('No se pudo publicar el mensaje MQTT.'))
            return
          }

          resolve(message)
        }
      )
    } catch (error) {
      reject(error)
    }
  })
}
