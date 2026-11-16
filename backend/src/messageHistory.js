import { Message } from './models/Message.js'
import { logger } from './logger.js'

const ACCOUNT_ROLES = Object.freeze({
  seguridad: 'seguridad',
  mantenimiento: 'mantenimiento',
  mantenimiento2: 'mantenimiento',
  recepcion: 'recepcion',
  limpieza: 'limpieza',
  administracion: 'administracion'
})

const MAX_HISTORY_MESSAGES = 50

export async function handleHistoryRequest(client, topic, rawPayload) {
  const parts = topic.split('/')

  if (
    parts.length !== 5 ||
    parts[0] !== 'edificio' ||
    parts[2] !== 'historial' ||
    parts[3] !== 'solicitudes'
  ) {
    return
  }

  const buildingId = parts[1]
  const mqttUsername = parts[4]
  const role = ACCOUNT_ROLES[mqttUsername]

  if (!buildingId || !role) return

  let request

  try {
    request = JSON.parse(rawPayload.toString('utf8'))
  } catch {
    logger.warn('invalid history request payload', { topic })
    return
  }

  const { requestId, clientId, channelId } = request

  if (
    typeof requestId !== 'string' ||
    !/^[a-zA-Z0-9-]{1,80}$/.test(requestId) ||
    typeof clientId !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,80}$/.test(clientId) ||
    typeof channelId !== 'string'
  ) {
    logger.warn('invalid history request fields', { topic })
    return
  }

  if (channelId !== 'general' && channelId !== role) {
    logger.warn('history channel access denied', {
      mqttUsername,
      channelId
    })
    return
  }

  try {
    const documents = await Message.find({
      buildingId,
      channelId
    })
      .sort({ timestamp: -1, _id: -1 })
      .limit(MAX_HISTORY_MESSAGES)
      .lean()

    const messages = documents.reverse().map((message) => ({
      id: message.messageId,
      senderId: message.senderId,
      senderName: message.senderName,
      senderRole: message.senderRole,
      channelId: message.channelId,
      content: message.content,
      timestamp: message.timestamp.toISOString()
    }))

    const responseTopic =
      `edificio/${buildingId}/historial/respuestas/` + `${mqttUsername}/${clientId}`

    const response = {
      requestId,
      channelId,
      messages
    }

    await new Promise((resolve, reject) => {
      client.publish(responseTopic, JSON.stringify(response), { qos: 1, retain: false }, (error) =>
        error ? reject(error) : resolve()
      )
    })

    logger.info('history delivered', {
      mqttUsername,
      channelId,
      count: messages.length
    })
  } catch (error) {
    logger.error('history request failed', {
      mqttUsername,
      channelId,
      error: error.message
    })
  }
}
