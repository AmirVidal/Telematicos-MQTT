import mongoose from 'mongoose'

const buildingSchema = new mongoose.Schema(
  {
    buildingId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, default: '' },
    active: { type: Boolean, required: true, default: true }
  },
  { versionKey: false, collection: 'buildings', timestamps: true }
)

buildingSchema.index({ buildingId: 1 }, { unique: true })

export const Building = mongoose.model('Building', buildingSchema)
