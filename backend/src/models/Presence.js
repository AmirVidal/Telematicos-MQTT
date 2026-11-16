import mongoose from 'mongoose'
import { ROLES } from '../constants.js'

const presenceSchema = new mongoose.Schema(
  {
    buildingId: { type: String, required: true },
    sessionId: { type: String, required: true },
    userId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, enum: ROLES },
    online: { type: Boolean, required: true, default: false },
    topic: { type: String, required: true },
    clientUpdatedAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true }
  },
  { versionKey: false, collection: 'presence_sessions', timestamps: true }
)

presenceSchema.index({ buildingId: 1, sessionId: 1 }, { unique: true })
presenceSchema.index({ buildingId: 1, userId: 1, online: 1 })
presenceSchema.index({ buildingId: 1, online: 1, lastSeenAt: -1 })
presenceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const Presence = mongoose.model('Presence', presenceSchema)
