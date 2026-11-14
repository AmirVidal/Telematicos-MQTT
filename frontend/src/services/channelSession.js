import { canAccessChannel } from '../config/channelOptions'

const SESSION_KEY = 'mqtt_selected_channel'

export function getSelectedChannelId(userId, role) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY))

    return saved?.userId === userId && canAccessChannel(role, saved.channelId)
      ? saved.channelId
      : 'general'
  } catch {
    return 'general'
  }
}

export function saveSelectedChannelId(userId, role, channelId) {
  if (!canAccessChannel(role, channelId)) {
    throw new Error('No tienes permiso para acceder a este canal.')
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId, channelId }))
}

export function clearSelectedChannelId() {
  sessionStorage.removeItem(SESSION_KEY)
}
