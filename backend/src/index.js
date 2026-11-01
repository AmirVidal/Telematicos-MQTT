import { config } from './config.js'
import { connectMongo, disconnectMongo } from './db.js'
import { handleMessage } from './handlers.js'
import { logger } from './logger.js'
import { syncIndexes } from './models/index.js'
import { createMqttConsumer } from './mqtt.js'
import { ensureCatalogs } from './seeds/apply.js'

async function main() {
  await connectMongo()
  await syncIndexes()
  await ensureCatalogs()

  const consumer = createMqttConsumer({ onMessage: handleMessage })
  let shuttingDown = false

  async function shutdown(signal) {
    if (shuttingDown) return
    shuttingDown = true

    logger.info('shutdown requested', { signal })

    try {
      await consumer.close()
      await disconnectMongo()
      process.exit(0)
    } catch (error) {
      logger.error('shutdown failed', { error: error.message })
      process.exit(1)
    }
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  logger.info('database writer started', {
    mqttUrl: config.mqttUrl,
    topicFilter: config.mqttTopicFilter,
    buildingId: config.buildingId
  })
}

main().catch(async (error) => {
  logger.error('startup failed', { error: error.message })
  await disconnectMongo().catch(() => {})
  process.exit(1)
})
