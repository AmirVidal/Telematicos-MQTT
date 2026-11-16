import mongoose from 'mongoose'
import { MAX_MESSAGE_LENGTH, ROLES } from '../constants.js'

const supportMessageSchema = new mongoose.Schema(
  {
    messageId: { type: String, required: true },
    requestId: { type: String, required: true },
    buildingId: { type: String, required: true },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true, trim: true },
    senderRole: { type: String, required: true, enum: ROLES },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_MESSAGE_LENGTH
    },
    timestamp: { type: Date, required: true },
    createdAt: { type: Date, required: true, default: Date.now }
  },
  { versionKey: false, collection: 'support_messages' }
)

supportMessageSchema.index({ messageId: 1 }, { unique: true })
supportMessageSchema.index({ requestId: 1, timestamp: 1 })

export const SupportMessage = mongoose.model('SupportMessage', supportMessageSchema)
