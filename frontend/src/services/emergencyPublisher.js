import { BUILDING_ID } from '../config/channelOptions'
import { topics } from '../config/mqttTopics'

import {
  EMERGENCY_TYPES,
  MAX_EMERGENCY_DESCRIPTION_LENGTH,
  MAX_EMERGENCY_LOCATION_LENGTH,
  canPublishEmergency,
  ASSIGNABLE_EMERGENCY_ROLES
} from '../config/emergencyOptions'


export function validateEmergency({
  type,
  location,
  description,
  assignedRole
} = {}) {

  if (!EMERGENCY_TYPES.some((item) => item.id === type)) {
    throw new Error('Selecciona un tipo de emergencia válido.')
  }

  if (typeof location !== 'string' || !location.trim()) {
    throw new Error('Indica la ubicación de la emergencia.')
  }

  if (location.trim().length > MAX_EMERGENCY_LOCATION_LENGTH) {
    throw new Error(
      `La ubicación no puede superar ${MAX_EMERGENCY_LOCATION_LENGTH} caracteres.`
    )
  }

  if (typeof description !== 'string' || !description.trim()) {
    throw new Error('Escribe una descripción de la emergencia.')
  }

  if (description.trim().length > MAX_EMERGENCY_DESCRIPTION_LENGTH) {
    throw new Error(
      `La descripción no puede superar ${MAX_EMERGENCY_DESCRIPTION_LENGTH} caracteres.`
    )
  }

  // NUEVO: el rol responsable es obligatorio.
  const validRole = ASSIGNABLE_EMERGENCY_ROLES.some(
    (role) => role.value === assignedRole
  )

  if (!validRole) {
    throw new Error(
      'Debes seleccionar el rol responsable de atender la emergencia.'
    )
  }

  return {
    type,
    location: location.trim(),
    description: description.trim(),
    assignedRole
  }
}


function publishAcknowledged(client, topic, payload, retain) {

  return new Promise((resolve, reject) => {

    try {
      client.publish(
        topic,
        payload,

        {
          qos: 1,
          retain
        },

        (error, acknowledgement) => {

          if (
            error ||
            (acknowledgement?.reasonCode ?? 0) >= 128
          ) {

            reject(
              new Error(
                'El broker rechazó la operación MQTT o se perdió la conexión.'
              )
            )

            return
          }

          resolve()
        }
      )

    } catch (error) {
      reject(error)
    }
  })
}


function validatePublisher(client, user) {

  if (!canPublishEmergency(user?.role)) {
    throw new Error(
      'No tienes permiso para administrar alertas de emergencia.'
    )
  }

  if (!user?.id || !user?.name) {
    throw new Error(
      'Debes identificarte antes de emitir una emergencia.'
    )
  }

  if (!client?.connected) {
    throw new Error(
      'El broker MQTT no está conectado. No se envió la operación.'
    )
  }
}


export async function publishEmergency({
  client,
  user,
  emergency
}) {

  validatePublisher(client, user)

  const valid = validateEmergency(emergency)

  const timestamp = new Date().toISOString()

const payload = {
  id: crypto.randomUUID(),

  type: 'emergencia',

  emergencyType: valid.type,
  location: valid.location,
  description: valid.description,

  senderId: user.id,
  senderName: user.name,
  senderRole: user.role,

  // NUEVO: responsable definido desde la creación.
  assignedRole: valid.assignedRole,
  assignedAt: timestamp,
  assignedById: user.id,
  assignedByName: user.name,
  assignedByRole: user.role,

  timestamp
}

  // Guardar la emergencia como activa en el broker.

  await publishAcknowledged(
    client,

    topics.alertas.emergenciaActiva(
      BUILDING_ID,
      payload.id
    ),

    JSON.stringify(payload),

    true
  )

  // Enviar el mensaje al canal general de emergencias.

  try {
    await publishAcknowledged(
      client,

      topics.alertas.emergencias(BUILDING_ID),

      JSON.stringify(payload),

      false
    )

  } catch {
    throw new Error(
      'La emergencia quedó registrada como activa, pero el envío general no fue confirmado. Comprueba el panel antes de reintentar.'
    )
  }

  return payload
}


// Marcar una emergencia como resuelta.

export async function resolveEmergency({
  client,
  user,
  alertId
}) {

  validatePublisher(client, user)

  if (
    typeof alertId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(alertId)
  ) {
    throw new Error(
      'El identificador de la emergencia no es válido.'
    )
  }

  await publishAcknowledged(
    client,

    topics.alertas.emergenciaActiva(
      BUILDING_ID,
      alertId
    ),

    '',

    true
  )

  return alertId
}
export async function assignEmergencyRole({
  client,
  user,
  alert,
  assignedRole
}) {
  // Solo Seguridad y Administración pueden asignar.
  validatePublisher(client, user)

  if (!alert || typeof alert.id !== 'string') {
    throw new Error('Selecciona una emergencia válida.')
  }

  const isValidRole = ASSIGNABLE_EMERGENCY_ROLES.some(
    (role) => role.value === assignedRole
  )

  if (!isValidRole) {
    throw new Error('Selecciona un rol responsable válido.')
  }

  const updatedAlert = {
    id: alert.id,
    type: 'emergencia',

    emergencyType: alert.emergencyType,
    location: alert.location,
    description: alert.description,

    // Se conserva el emisor original.
    senderId: alert.senderId,
    senderName: alert.senderName,
    senderRole: alert.senderRole,
    timestamp: alert.timestamp,

    // Nueva información de asignación.
    assignedRole,
    assignedAt: new Date().toISOString(),
    assignedById: user.id,
    assignedByName: user.name,
    assignedByRole: user.role
  }

  const topic = topics.alertas.emergenciaActiva(
    BUILDING_ID,
    alert.id
  )

  // Actualiza el estado retenido de esta emergencia.
  await publishAcknowledged(
    client,
    topic,
    JSON.stringify(updatedAlert),
    true
  )

  return updatedAlert
}