import mongoose from 'mongoose'
import { ROLES } from '../constants.js'

const roleSchema = new mongoose.Schema(
  {
    roleId: { type: String, required: true, enum: ROLES },
    label: { type: String, required: true, trim: true },
    order: { type: Number, required: true, default: 0 }
  },
  { versionKey: false, collection: 'roles', timestamps: true }
)

roleSchema.index({ roleId: 1 }, { unique: true })
roleSchema.index({ order: 1 })

export const Role = mongoose.model('Role', roleSchema)
