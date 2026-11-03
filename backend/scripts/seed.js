import { connectMongo, disconnectMongo } from '../src/db.js'
import { logger } from '../src/logger.js'
import { syncIndexes } from '../src/models/index.js'
import { ensureCatalogs } from '../src/seeds/apply.js'

async function main() {
  await connectMongo()
  await syncIndexes()
  await ensureCatalogs()
  await disconnectMongo()
}

main().catch(async (error) => {
  logger.error('seed failed', { error: error.message })
  await disconnectMongo().catch(() => {})
  process.exit(1)
})
