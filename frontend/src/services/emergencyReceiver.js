import { BUILDING_ID } from '../config/channelOptions'
import { topics } from '../config/mqttTopics'

import {
  EMERGENCY_TYPES,
  MAX_EMERGENCY_DESCRIPTION_LENGTH,
  MAX_EMERGENCY_LOCATION_LENGTH,
  canPublishEmergency
} from '../config/emergencyOptions'

export function parseEmergency(topic, payload) {

  const generalTopic =
  topics.alertas.emergencias(BUILDING_ID)

const activePrefix =
  `${topics.alertas.emergenciasActivas(BUILDING_ID)}/`

const isActiveTopic = topic.startsWith(activePrefix)

if (topic !== generalTopic && !isActiveTopic) {
  throw new Error(
    'La alerta llegó desde un topic distinto al de emergencias.'
  )
}

  let message

  try {
    const raw =
      typeof payload === 'string'
        ? payload
        : new TextDecoder().decode(payload)

    message = JSON.parse(raw)

  } catch {
    throw new Error('La alerta no contiene JSON válido.')
  }

  if (
    !message ||
    Array.isArray(message) ||
    message.type !== 'emergencia' ||

    typeof message.id !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(message.id) ||

    !EMERGENCY_TYPES.some(
      (item) => item.id === message.emergencyType
    ) ||

    typeof message.location !== 'string' ||
    !message.location.trim() ||
    message.location.length > MAX_EMERGENCY_LOCATION_LENGTH ||

    typeof message.description !== 'string' ||
    !message.description.trim() ||
    message.description.length > MAX_EMERGENCY_DESCRIPTION_LENGTH ||

    typeof message.senderId !== 'string' ||
    !message.senderId.trim() ||

    typeof message.senderName !== 'string' ||
    !message.senderName.trim() ||

    !canPublishEmergency(message.senderRole) ||

    typeof message.timestamp !== 'string' ||
    !Number.isFinite(Date.parse(message.timestamp))
  ) {
    throw new Error('Los datos de la alerta no son válidos.')
  }
if (
  isActiveTopic &&
  topic !== `${activePrefix}${message.id}`
) {
  throw new Error(
    'El identificador de la alerta no coincide con el topic retenido.'
  )
}
  return {
    id: message.id,
    emergencyType: message.emergencyType,

    location: message.location.trim(),
    description: message.description.trim(),

    senderId: message.senderId,
    senderName: message.senderName,
    senderRole: message.senderRole,

    timestamp: message.timestamp,
    topic
  }
}