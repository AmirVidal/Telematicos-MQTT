import { logger } from '../logger.js'
import { Building, Channel, IncidentType, Role, User } from '../models/index.js'
import { buildings, channels, incidentTypes, roles, staffUsers } from './catalogs.js'

async function upsertMany(Model, key, items) {
  for (const item of items) {
    await Model.updateOne(
      { [key]: item[key] },
      { $set: item },
      { upsert: true, runValidators: true }
    )
  }

  logger.debug('catalog synced', {
    collection: Model.collection.collectionName,
    count: items.length
  })
}

export async function ensureCatalogs() {
  await upsertMany(Building, 'buildingId', buildings)
  await upsertMany(Channel, 'channelId', channels)
  await upsertMany(IncidentType, 'typeId', incidentTypes)
  await upsertMany(Role, 'roleId', roles)
  await upsertMany(User, 'userId', staffUsers)

  logger.info('catalogs ensured')
}
