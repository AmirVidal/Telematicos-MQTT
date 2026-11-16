
import mongoose from 'mongoose'
import { ROLES } from '../constants.js'

const emergencySchema = new mongoose.Schema({
  emergencyId: {
    type: String,
    required: true,
    unique: true
  },

  buildingId: {
    type: String,
    required: true
  },

  emergencyType: {
    type: String,
    required: true
  },

  location: {
    type: String,
    required: true
  },

  description: {
    type: String,
    required: true
  },

  senderId: String,
  senderName: String,
  senderRole: String,

  status: {
    type: String,
    enum: ['activa', 'en_atencion', 'resuelta'],
    default: 'activa'
  },

  // NUEVOS CAMPOS DE ASIGNACIÓN

  assignedRole: {
    type: String,
    enum: ROLES,
    default: null
  },

  assignedAt: {
    type: Date,
    default: null
  },

  assignedById: {
    type: String,
    default: null
  },

  assignedByName: {
    type: String,
    default: null
  },

  assignedByRole: {
    type: String,
    default: null
  },

  timestamp: {
    type: Date,
    required: true
  },

  resolvedAt: {
    type: Date,
    default: null
  }

}, {
  collection: 'emergencies',
  timestamps: true
})

emergencySchema.index({
  buildingId: 1,
  timestamp: -1
})

export const Emergency = mongoose.model(
  'Emergency',
  emergencySchema
)