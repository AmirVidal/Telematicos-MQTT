import mongoose from 'mongoose'

const channelSchema = new mongoose.Schema(
  {
    channelId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    order: { type: Number, required: true, default: 0 },
    active: { type: Boolean, required: true, default: true }
  },
  { versionKey: false, collection: 'channels', timestamps: true }
)

channelSchema.index({ channelId: 1 }, { unique: true })
channelSchema.index({ order: 1 })

export const Channel = mongoose.model('Channel', channelSchema)
