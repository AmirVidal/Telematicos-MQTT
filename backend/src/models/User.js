import mongoose from 'mongoose'
import { ROLES } from '../constants.js'

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, enum: ROLES },
    online: { type: Boolean, required: true, default: false },
    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    lastBuildingId: { type: String, default: null }
  },
  { versionKey: false, collection: 'users', timestamps: true }
)

userSchema.index({ userId: 1 }, { unique: true })
userSchema.index({ role: 1, name: 1 })
userSchema.index({ online: 1, lastSeenAt: -1 })

export const User = mongoose.model('User', userSchema)
