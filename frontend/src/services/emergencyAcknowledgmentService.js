import { BUILDING_ID } from '../config/channelOptions'
import { topics } from '../config/mqttTopics'

const UUID_PATTERN = /^[0-9a-f-]{36}$/i
const CLIENT_PATTERN = /^web[0-9a-f]{16}$/i

export function publishEmergencyAcknowledgment({
  client,
  user,
  clientId,
  alertId
}) {
  return new Promise((resolve, reject) => {
    if (!client?.connected) {
      reject(new Error('No hay conexión con el broker MQTT.'))
      return
    }

    if (
      !UUID_PATTERN.test(alertId) ||
      !UUID_PATTERN.test(user?.id || '') ||
      !CLIENT_PATTERN.test(clientId)
    ) {
      reject(new Error('Los datos de confirmación no son válidos.'))
      return
    }

    if (!user?.name || !user?.role) {
      reject(new Error('Debes identificarte para confirmar la alerta.'))
      return
    }

    const acknowledgment = {
      type: 'emergency_ack',
      emergencyId: alertId,
      clientId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      confirmedAt: new Date().toISOString()
    }

    const topic = topics.alertas.emergenciaAcuse(
      BUILDING_ID,
      alertId,
      clientId
    )

    client.publish(
      topic,
      JSON.stringify(acknowledgment),
      {
        qos: 1,
        retain: true
      },
      (error, packet) => {
        if (
          error ||
          (packet?.reasonCode ?? 0) >= 128
        ) {
          reject(
            new Error('El broker no confirmó la lectura de la emergencia.')
          )
          return
        }

        resolve(acknowledgment)
      }
    )
  })
}

export function parseEmergencyAcknowledgment(topic, payload) {
  const prefix = `${
    topics.alertas.emergencias(BUILDING_ID)
  }/acuses/`

  if (!topic.startsWith(prefix)) {
    return null
  }

  const segments = topic.slice(prefix.length).split('/')

  if (segments.length !== 2) {
    throw new Error('Topic de confirmación inválido.')
  }

  const [alertId, clientId] = segments

  if (
    !UUID_PATTERN.test(alertId) ||
    !CLIENT_PATTERN.test(clientId)
  ) {
    throw new Error('Identificadores de confirmación inválidos.')
  }

  if (payload.length === 0) {
    return null
  }

  const raw =
    typeof payload === 'string'
      ? payload
      : new TextDecoder().decode(payload)

  const acknowledgment = JSON.parse(raw)

  if (
    !acknowledgment ||
    acknowledgment.type !== 'emergency_ack' ||
    acknowledgment.emergencyId !== alertId ||
    acknowledgment.clientId !== clientId ||
    !UUID_PATTERN.test(acknowledgment.userId || '') ||
    typeof acknowledgment.userName !== 'string' ||
    !acknowledgment.userName.trim() ||
    typeof acknowledgment.userRole !== 'string' ||
    !acknowledgment.userRole.trim() ||
    typeof acknowledgment.confirmedAt !== 'string' ||
    !Number.isFinite(Date.parse(acknowledgment.confirmedAt))
  ) {
    throw new Error('Confirmación MQTT inválida.')
  }

  return acknowledgment
}