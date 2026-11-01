import mongoose from 'mongoose'
import { config } from './config.js'
import { logger } from './logger.js'

export async function connectMongo(uri = config.mongoUri) {
  mongoose.set('strictQuery', true)

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000
  })

  logger.info('mongodb connected', { uri: redactUri(uri) })

  return mongoose.connection
}

export async function disconnectMongo() {
  await mongoose.disconnect()
  logger.info('mongodb disconnected')
}

function redactUri(uri) {
  return uri.replace(/\/\/[^@/]+@/, '//***:***@')
}
