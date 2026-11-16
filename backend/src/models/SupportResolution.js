import mongoose from 'mongoose'
import { ROLES } from '../constants.js'

const evidenceSchema = new mongoose.Schema(
  {
    fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true }
  },
  { _id: false }
)

const supportResolutionSchema = new mongoose.Schema(
  {
    resolutionId: { type: String, required: true, unique: true },
    requestId: { type: String, required: true },
    buildingId: { type: String, required: true },
    responderId: { type: String, required: true },
    responderName: { type: String, required: true, trim: true },
    responderRole: { type: String, required: true, enum: ROLES },
    requesterId: { type: String, default: null },
    requesterName: { type: String, required: true, trim: true },
    requesterRole: { type: String, default: '', enum: [...ROLES, ''] },
    requestDescription: { type: String, required: true },
    requestCreatedAt: { type: Date, required: true },
    problem: { type: String, required: true, trim: true, maxlength: 1000 },
    resolution: { type: String, required: true, trim: true, maxlength: 1000 },
    evidence: { type: [evidenceSchema], required: true },
    resolvedAt: { type: Date, required: true, default: Date.now }
  },
  { versionKey: false, collection: 'support_resolutions' }
)

supportResolutionSchema.index({ requestId: 1 }, { unique: true })
supportResolutionSchema.index({ resolvedAt: -1 })

export const SupportResolution = mongoose.model(
  'SupportResolution',
  supportResolutionSchema
)
