import mongoose from 'mongoose'
import {
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  MAX_INCIDENT_DESCRIPTION_LENGTH,
  MAX_INCIDENT_LOCATION_LENGTH,
  ROLES
} from '../constants.js'

const incidentSchema = new mongoose.Schema(
  {
    incidentId: { type: String, required: true },
    buildingId: { type: String, required: true },
    incidentType: { type: String, required: true, enum: INCIDENT_TYPES },
    location: { type: String, required: true, trim: true, maxlength: MAX_INCIDENT_LOCATION_LENGTH },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_INCIDENT_DESCRIPTION_LENGTH
    },
    reporterId: { type: String, default: null },
    reporterName: { type: String, required: true, trim: true },
    reporterRole: { type: String, default: '', enum: [...ROLES, ''] },
    status: { type: String, required: true, enum: INCIDENT_STATUSES, default: 'abierto' },
    topic: { type: String, required: true },
    timestamp: { type: Date, required: true },
    receivedAt: { type: Date, required: true, default: Date.now }
  },
  { versionKey: false, collection: 'incidents' }
)

incidentSchema.index({ incidentId: 1 }, { unique: true })
incidentSchema.index({ buildingId: 1, status: 1, timestamp: -1 })
incidentSchema.index({ buildingId: 1, incidentType: 1, timestamp: -1 })
incidentSchema.index({ reporterId: 1, timestamp: -1 })

export const Incident = mongoose.model('Incident', incidentSchema)
