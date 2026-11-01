import { config } from './config.js'
import {
  INCIDENT_TYPES,
  MAX_INCIDENT_DESCRIPTION_LENGTH,
  MAX_INCIDENT_LOCATION_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_SUPPORT_DESCRIPTION_LENGTH,
  ROLES
} from './constants.js'
import { logger } from './logger.js'
import { Event } from './models/Event.js'
import { Incident } from './models/Incident.js'
import { Message } from './models/Message.js'
import { Presence } from './models/Presence.js'
import { SupportRequest } from './models/SupportRequest.js'
import { User } from './models/User.js'

function stringField(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeRole(value) {
  const role = stringField(value)
  return ROLES.includes(role) ? role : null
}

function toDate(value, fallback = new Date()) {
  if (typeof value !== 'string') return fallback

  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? fallback : new Date(parsed)
}

function parsePayload(payload) {
  if (payload === undefined || payload === null) return null

  const raw = typeof payload === 'string' ? payload : payload.toString('utf8')

  if (!raw.trim()) return null

  const parsed = JSON.parse(raw)

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('El payload no es un objeto JSON.')
  }

  return parsed
}

async function upsertUser({ userId, name, role, buildingId, lastSeenAt, online }) {
  if (!userId || !name || !role) return

  const update = {
    $set: {
      name,
      role,
      lastSeenAt,
      lastBuildingId: buildingId
    },
    $setOnInsert: {
      firstSeenAt: lastSeenAt
    }
  }

  if (typeof online === 'boolean') {
    update.$set.online = online
  }

  await User.updateOne({ userId }, update, { upsert: true, runValidators: true })
}

async function storeChannelMessage({ buildingId, parts, payload, topic }) {
  const isPrivate = parts[3] === 'privado'
  const channelId = isPrivate ? 'privado' : stringField(parts[3])
  const recipientId = isPrivate ? stringField(parts[5]) : null

  const messageId = stringField(payload.id)
  const senderId = stringField(payload.senderId)
  const senderName = stringField(payload.senderName)
  const senderRole = normalizeRole(payload.senderRole)
  const content = stringField(payload.content)

  if (!channelId || !messageId || !senderId || !senderName || !senderRole || !content) {
    logger.warn('invalid channel message ignored', { topic })
    return
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    logger.warn('channel message too long', { topic, length: content.length })
    return
  }

  const timestamp = toDate(payload.timestamp)

  const result = await Message.updateOne(
    { messageId },
    {
      $setOnInsert: {
        messageId,
        buildingId,
        channelId,
        recipientId,
        senderId,
        senderName,
        senderRole,
        content,
        topic,
        timestamp,
        receivedAt: new Date()
      }
    },
    { upsert: true, runValidators: true }
  )

  if (result.upsertedCount === 0) return

  await upsertUser({
    userId: senderId,
    name: senderName,
    role: senderRole,
    buildingId,
    lastSeenAt: timestamp
  })

  logger.info('message stored', { messageId, channelId, buildingId })
}

async function storeIncident({ buildingId, payload, topic }) {
  const incidentId = stringField(payload.id)
  const incidentType = stringField(payload.incidentType)
  const location = stringField(payload.location)
  const description = stringField(payload.description)
  const reporterName = stringField(payload.reporterName)
  const reporterId = stringField(payload.reporterId)
  const reporterRole = normalizeRole(payload.reporterRole) ?? ''

  if (
    !incidentId ||
    !INCIDENT_TYPES.includes(incidentType) ||
    !location ||
    !description ||
    !reporterName
  ) {
    logger.warn('invalid incident ignored', { topic })
    return
  }

  if (
    location.length > MAX_INCIDENT_LOCATION_LENGTH ||
    description.length > MAX_INCIDENT_DESCRIPTION_LENGTH
  ) {
    logger.warn('incident fields too long', { topic })
    return
  }

  const timestamp = toDate(payload.timestamp)

  const result = await Incident.updateOne(
    { incidentId },
    {
      $setOnInsert: {
        incidentId,
        buildingId,
        incidentType,
        location,
        description,
        reporterId,
        reporterName,
        reporterRole,
        status: 'abierto',
        topic,
        timestamp,
        receivedAt: new Date()
      }
    },
    { upsert: true, runValidators: true }
  )

  if (result.upsertedCount === 0) return

  if (reporterId) {
    await upsertUser({
      userId: reporterId,
      name: reporterName,
      role: reporterRole || null,
      buildingId,
      lastSeenAt: timestamp
    })
  }

  logger.info('incident stored', { incidentId, incidentType, buildingId })
}

async function storeSupportRequest({ buildingId, payload, topic }) {
  const requestId = stringField(payload.id)
  const requesterName = stringField(payload.requesterName)
  const requesterId = stringField(payload.requesterId)
  const requesterRole = normalizeRole(payload.requesterRole) ?? ''
  const description = stringField(payload.description)

  if (!requestId || !requesterName || !description) {
    logger.warn('invalid support request ignored', { topic })
    return
  }

  if (description.length > MAX_SUPPORT_DESCRIPTION_LENGTH) {
    logger.warn('support request too long', { topic })
    return
  }

  const timestamp = toDate(payload.timestamp)

  const result = await SupportRequest.updateOne(
    { requestId },
    {
      $setOnInsert: {
        requestId,
        buildingId,
        requesterId,
        requesterName,
        requesterRole,
        description,
        status: 'pendiente',
        topic,
        timestamp,
        receivedAt: new Date()
      }
    },
    { upsert: true, runValidators: true }
  )

  if (result.upsertedCount === 0) return

  if (requesterId) {
    await upsertUser({
      userId: requesterId,
      name: requesterName,
      role: requesterRole || null,
      buildingId,
      lastSeenAt: timestamp
    })
  }

  logger.info('support request stored', { requestId, buildingId })
}

async function markSessionOffline({ buildingId, sessionId, topic }) {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + config.presenceTtlMs)

  const session = await Presence.findOneAndUpdate(
    { buildingId, sessionId },
    {
      $set: {
        online: false,
        lastSeenAt: now,
        expiresAt
      }
    },
    { new: true }
  )

  if (!session) return

  const otherSession = await Presence.exists({
    buildingId,
    userId: session.userId,
    online: true,
    expiresAt: { $gt: now }
  })

  await User.updateOne(
    { userId: session.userId },
    {
      $set: {
        online: Boolean(otherSession),
        lastSeenAt: now
      }
    }
  )

  logger.info('presence offline', { sessionId, userId: session.userId, topic })
}

async function storePresence({ buildingId, sessionId, payload, topic }) {
  if (!payload) {
    await markSessionOffline({ buildingId, sessionId, topic })
    return
  }

  if (payload.online !== true) {
    await markSessionOffline({ buildingId, sessionId, topic })
    return
  }

  const clientId = stringField(payload.clientId)
  const userId = stringField(payload.userId)
  const name = stringField(payload.name)
  const role = normalizeRole(payload.role)

  if (!clientId || clientId !== sessionId || !userId || !name || !role) {
    logger.warn('invalid presence ignored', { topic })
    return
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + config.presenceTtlMs)
  const clientUpdatedAt = Number.isFinite(payload.updatedAt)
    ? new Date(payload.updatedAt)
    : now

  await Presence.updateOne(
    { buildingId, sessionId },
    {
      $set: {
        userId,
        name,
        role,
        online: true,
        topic,
        clientUpdatedAt,
        lastSeenAt: now,
        expiresAt
      }
    },
    { upsert: true, runValidators: true }
  )

  await upsertUser({
    userId,
    name,
    role,
    buildingId,
    lastSeenAt: now,
    online: true
  })

  logger.debug('presence online', { sessionId, userId, buildingId })
}

async function storeEvent({ buildingId, category, payload, topic }) {
  if (!payload) return

  const eventId = stringField(payload.id)
  const timestamp = toDate(payload.timestamp)
  const document = {
    buildingId,
    category,
    topic,
    payload,
    timestamp,
    receivedAt: new Date()
  }

  if (eventId) {
    const result = await Event.updateOne(
      { eventId },
      { $setOnInsert: { ...document, eventId } },
      { upsert: true }
    )

    if (result.upsertedCount === 0) return
  } else {
    await Event.create(document)
  }

  logger.debug('event stored', { buildingId, category, topic })
}

export async function handleMessage(topic, rawPayload) {
  try {
    const parts = topic.split('/')
    const buildingId = parts[1]
    const category = parts[2]

    if (parts[0] !== 'edificio' || !buildingId || !category) {
      logger.warn('unsupported topic ignored', { topic })
      return
    }

    const isEmpty = !rawPayload || rawPayload.length === 0 || !rawPayload.toString('utf8').trim()

    if (category === 'mensajeria') {
      if (isEmpty) return
      await storeChannelMessage({ buildingId, parts, payload: parsePayload(rawPayload), topic })
      return
    }

    if (category === 'incidentes' && parts[3] === 'reportes') {
      if (isEmpty) return
      await storeIncident({ buildingId, payload: parsePayload(rawPayload), topic })
      return
    }

    if (category === 'comandos' && parts[3] === 'soporte') {
      if (isEmpty) return
      await storeSupportRequest({ buildingId, payload: parsePayload(rawPayload), topic })
      return
    }

    if (category === 'personal' && parts[4] === 'presencia') {
      const sessionId = stringField(parts[3])

      if (!sessionId) {
        logger.warn('presence without session ignored', { topic })
        return
      }

      await storePresence({
        buildingId,
        sessionId,
        payload: isEmpty ? null : parsePayload(rawPayload),
        topic
      })
      return
    }

    if (isEmpty) return

    await storeEvent({
      buildingId,
      category,
      payload: parsePayload(rawPayload),
      topic
    })
  } catch (error) {
    logger.error('mqtt message processing failed', {
      topic,
      error: error.message
    })
  }
}
