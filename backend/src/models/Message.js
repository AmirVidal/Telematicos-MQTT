import mongoose from 'mongoose'
import { MAX_MESSAGE_LENGTH, ROLES } from '../constants.js'

const messageSchema = new mongoose.Schema(
  {
    messageId: { type: String, required: true },
    buildingId: { type: String, required: true },
    channelId: { type: String, required: true },
    recipientId: { type: String, default: null },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true, trim: true },
    senderRole: { type: String, required: true, enum: ROLES },
    content: { type: String, required: true, trim: true, maxlength: MAX_MESSAGE_LENGTH },
    topic: { type: String, required: true },
    timestamp: { type: Date, required: true },
    receivedAt: { type: Date, required: true, default: Date.now }
  },
  { versionKey: false, collection: 'messages' }
)

messageSchema.index({ messageId: 1 }, { unique: true })
messageSchema.index({ buildingId: 1, channelId: 1, timestamp: -1 })
messageSchema.index({ senderId: 1, timestamp: -1 })
messageSchema.index({ timestamp: -1 })

export const Message = mongoose.model('Message', messageSchema)
