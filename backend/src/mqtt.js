import mqtt from 'mqtt'
import { config } from './config.js'
import { logger } from './logger.js'

export function createMqttConsumer({ onMessage }) {
  const client = mqtt.connect(config.mqttUrl, {
    clientId: `${config.mqttClientId}-${process.pid}`,
    clean: true,
    keepalive: 30,
    connectTimeout: 10000,
    reconnectPeriod: 2000,
    username: config.mqttUsername,
    password: config.mqttPassword
  })

  let queue = Promise.resolve()
  let stopped = false

  client.on('connect', () => {
    logger.info('mqtt connected', { url: config.mqttUrl })

    client.subscribe(config.mqttTopicFilter, { qos: 1 }, (error) => {
      if (error) {
        logger.error('mqtt subscribe failed', { error: error.message })
        return
      }

      logger.info('mqtt subscribed', { filter: config.mqttTopicFilter })
    })
  })

  client.on('reconnect', () => {
    logger.warn('mqtt reconnecting', { url: config.mqttUrl })
  })

  client.on('close', () => {
    if (!stopped) logger.warn('mqtt connection closed')
  })

  client.on('error', (error) => {
    logger.error('mqtt error', { error: error.message })
  })

  client.on('message', (topic, payload) => {
    queue = queue
      .then(() => onMessage(topic, payload))
      .catch((error) => {
        logger.error('mqtt message handler failed', { topic, error: error.message })
      })
  })

  return {
    client,
    close() {
      stopped = true

      return queue.then(
        () =>
          new Promise((resolve) => {
            client.end(false, {}, resolve)
          })
      )
    }
  }
}
