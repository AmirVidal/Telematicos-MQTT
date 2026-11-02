
import { Emergency } from './models/Emergency.js'
import { logger } from './logger.js'

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

  await Emergency.updateOne(
    {
      emergencyId: payload.id,
      buildingId
    },
    {
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
    },
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
