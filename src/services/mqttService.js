import mqtt from 'mqtt'

const MQTT_URL = import.meta.env.VITE_MQTT_URL

let client = null
const listeners = new Map()

function notify(topic, message) {
  const subs = listeners.get(topic)
  if (subs) {
    for (const cb of subs) cb(topic, message)
  }
  const wildcards = [...listeners.keys()].filter((t) => t.includes('#') || t.includes('+'))
  for (const pattern of wildcards) {
    if (topicMatches(pattern, topic)) {
      for (const cb of listeners.get(pattern)) cb(topic, message)
    }
  }
}

function topicMatches(pattern, topic) {
  const patternParts = pattern.split('/')
  const topicParts = topic.split('/')
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i] === '#') return true
    if (patternParts[i] !== topicParts[i]) return false
  }
  return patternParts.length === topicParts.length
}

export function connect(options = {}) {
  if (client && client.connected) return client

  client = mqtt.connect(MQTT_URL, {
    clientId: options.clientId || `telematicos_${Math.random().toString(16).slice(2, 10)}`,
    clean: true,
    ...options,
  })

  client.on('connect', () => {
    console.log('[MQTT] Conectado a', MQTT_URL)
  })

  client.on('error', (err) => {
    console.error('[MQTT] Error:', err.message)
  })

  client.on('message', (topic, payload) => {
    const message = payload.toString()
    let parsed = message
    try {
      parsed = JSON.parse(message)
    } catch {
      // no es JSON, se deja como string
    }
    notify(topic, parsed)
  })

  return client
}

export function subscribe(topic, callback) {
  if (!client) connect()
  client.subscribe(topic, (err) => {
    if (err) console.error('[MQTT] Error suscribiéndose a', topic, err.message)
  })

  if (!listeners.has(topic)) listeners.set(topic, new Set())
  listeners.get(topic).add(callback)

  return () => {
    const subs = listeners.get(topic)
    if (subs) {
      subs.delete(callback)
      if (subs.size === 0) {
        listeners.delete(topic)
        client.unsubscribe(topic)
      }
    }
  }
}

export function publish(topic, message, options = {}) {
  if (!client) connect()
  const payload = typeof message === 'string' ? message : JSON.stringify(message)
  client.publish(topic, payload, options)
}

export function disconnect() {
  if (client) {
    client.end()
    client = null
    listeners.clear()
    console.log('[MQTT] Desconectado')
  }
}
