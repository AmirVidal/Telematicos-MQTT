import { Emergency } from './models/Emergency.js'
import { ROLES } from './constants.js'
import { logger } from './logger.js'

const ASSIGNMENT_ROLES = ['seguridad', 'administracion']

export async function saveEmergency(buildingId, payload) {

  if (
    payload?.type !== 'emergencia' ||
    !payload.id ||
    !payload.emergencyType ||
    !payload.location ||
    !payload.description ||
    !payload.senderName ||
    !payload.timestamp ||
    Number.isNaN(Date.parse(payload.timestamp))
  ) {
    logger.warn('invalid emergency ignored')
    return
  }

  const hasAssignment =
    Object.prototype.hasOwnProperty.call(
      payload,
      'assignedRole'
    )

  if (hasAssignment) {
    const validRole = ROLES.includes(payload.assignedRole)

    const validAssigner = ASSIGNMENT_ROLES.includes(
      payload.assignedByRole
    )

    const validDate = Number.isFinite(
      Date.parse(payload.assignedAt)
    )

    if (!validRole || !validAssigner || !validDate) {
      logger.warn('invalid emergency assignment ignored')
      return
    }
  }

  const update = {
    $setOnInsert: {
      emergencyId: payload.id,
      buildingId,
      emergencyType: payload.emergencyType,
      location: payload.location,
      description: payload.description,
      senderId: payload.senderId,
      senderName: payload.senderName,
      senderRole: payload.senderRole,
      timestamp: new Date(payload.timestamp),
      status: 'activa'
    }
  }

  // Una reasignación actualiza la emergencia existente.
  if (hasAssignment) {
    update.$set = {
      assignedRole: payload.assignedRole,
      assignedAt: new Date(payload.assignedAt),
      assignedById: payload.assignedById ?? null,
      assignedByName: payload.assignedByName ?? null,
      assignedByRole: payload.assignedByRole
    }
  }

  await Emergency.updateOne(
    {
      emergencyId: payload.id,
      buildingId
    },
    update,
    {
      upsert: true,
      runValidators: true
    }
  )
}

export async function resolveStoredEmergency(
  buildingId,
  emergencyId
) {
  await Emergency.updateOne(
    {
      buildingId,
      emergencyId,
      status: { $ne: 'resuelta' }
    },
    {
      $set: {
        status: 'resuelta',
        resolvedAt: new Date()
      }
    },
    { runValidators: true }
  )
}