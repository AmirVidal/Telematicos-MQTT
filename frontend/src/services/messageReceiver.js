import { getChannel, getChannelTopic } from '../config/channelOptions'

export function parseReceivedMessage(topic, payload) {
  if (typeof topic !== 'string' || !topic.trim()) {
    throw new Error('El topic recibido no es válido.')
  }

  let rawMessage

  try {
    rawMessage = typeof payload === 'string' ? payload : new TextDecoder().decode(payload)
  } catch {
    throw new Error('No se pudo leer el mensaje MQTT.')
  }

  let message

  try {
    message = JSON.parse(rawMessage)
  } catch {
    throw new Error('El mensaje recibido no contiene un JSON válido.')
  }

  if (!message || typeof message !== 'object' || Array.isArray(message)) {
    throw new Error('La estructura del mensaje no es válida.')
  }

  if (
    typeof message.id !== 'string' ||
    !message.id.trim() ||
    typeof message.senderId !== 'string' ||
    !message.senderId.trim() ||
    typeof message.senderName !== 'string' ||
    !message.senderName.trim() ||
    typeof message.senderRole !== 'string' ||
    !message.senderRole.trim() ||
    typeof message.channelId !== 'string' ||
    typeof message.content !== 'string' ||
    !message.content.trim()
  ) {
    throw new Error('El mensaje contiene datos inválidos.')
  }

  const channel = getChannel(message.channelId)

  if (!channel) {
    throw new Error('El mensaje pertenece a un canal desconocido.')
  }

  const expectedTopic = getChannelTopic(message.channelId)

  if (topic !== expectedTopic) {
    throw new Error('El topic no coincide con el canal indicado.')
  }

  if (
    typeof message.timestamp !== 'string' ||
    !message.timestamp.trim() ||
    !Number.isFinite(Date.parse(message.timestamp))
  ) {
    throw new Error('La fecha del mensaje no es válida.')
  }

  return {
    id: message.id,
    senderId: message.senderId,
    senderName: message.senderName,
    senderRole: message.senderRole,
    channelId: message.channelId,
    content: message.content,
    timestamp: message.timestamp,
    topic
  }
}
