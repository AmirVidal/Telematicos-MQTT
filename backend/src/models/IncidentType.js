import mongoose from 'mongoose'
import { INCIDENT_TYPES } from '../constants.js'

const incidentTypeSchema = new mongoose.Schema(
  {
    typeId: { type: String, required: true, enum: INCIDENT_TYPES },
    label: { type: String, required: true, trim: true },
    order: { type: Number, required: true, default: 0 },
    active: { type: Boolean, required: true, default: true }
  },
  { versionKey: false, collection: 'incident_types', timestamps: true }
)

incidentTypeSchema.index({ typeId: 1 }, { unique: true })
incidentTypeSchema.index({ order: 1 })

export const IncidentType = mongoose.model('IncidentType', incidentTypeSchema)
