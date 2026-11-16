import mongoose from 'mongoose'
import { MAX_SUPPORT_DESCRIPTION_LENGTH, ROLES, SUPPORT_STATUSES } from '../constants.js'

const supportRequestSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true },
    buildingId: { type: String, required: true },
    requesterId: { type: String, default: null },
    requesterName: { type: String, required: true, trim: true },
    requesterRole: { type: String, default: '', enum: [...ROLES, ''] },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_SUPPORT_DESCRIPTION_LENGTH
    },
    status: { type: String, required: true, enum: SUPPORT_STATUSES, default: 'pendiente' },
    responderId: { type: String, default: null },
    responderName: { type: String, default: null, trim: true },
    responderRole: { type: String, default: '', enum: [...ROLES, ''] },
    respondedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    topic: { type: String, required: true },
    timestamp: { type: Date, required: true },
    receivedAt: { type: Date, required: true, default: Date.now }
  },
  { versionKey: false, collection: 'support_requests' }
)

supportRequestSchema.index({ requestId: 1 }, { unique: true })
supportRequestSchema.index({ buildingId: 1, status: 1, timestamp: -1 })
supportRequestSchema.index({ requesterId: 1, timestamp: -1 })
supportRequestSchema.index({ responderId: 1, status: 1, respondedAt: -1 })

export const SupportRequest = mongoose.model('SupportRequest', supportRequestSchema)
