import mongoose from 'mongoose'

const eventSchema = new mongoose.Schema(
  {
    eventId: { type: String },
    buildingId: { type: String, required: true },
    category: { type: String, required: true },
    topic: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, required: true },
    receivedAt: { type: Date, required: true, default: Date.now }
  },
  { versionKey: false, collection: 'events' }
)

eventSchema.index({ eventId: 1 }, { unique: true, sparse: true })
eventSchema.index({ buildingId: 1, category: 1, timestamp: -1 })
eventSchema.index({ topic: 1, timestamp: -1 })

export const Event = mongoose.model('Event', eventSchema)
