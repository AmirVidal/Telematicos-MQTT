import 'dotenv/config'

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const config = {
  mongoUri: process.env.MONGODB_URI?.trim() || 'mongodb://127.0.0.1:27017/telematicos',
  mqttUrl: process.env.MQTT_URL?.trim() || 'mqtt://127.0.0.1:1883',
  mqttUsername: process.env.MQTT_USERNAME?.trim() || 'administracion',
  mqttPassword: process.env.MQTT_PASSWORD?.trim() || 'admin123',
  mqttClientId: process.env.MQTT_CLIENT_ID?.trim() || 'telematicos-db-writer',
  mqttTopicFilter: process.env.MQTT_TOPIC_FILTER?.trim() || 'edificio/+/#',
  buildingId: process.env.BUILDING_ID?.trim() || 'principal',
  presenceTtlMs: toPositiveInt(process.env.PRESENCE_TTL_MS, 90000),
  logLevel: process.env.LOG_LEVEL?.trim() || 'info'
}
