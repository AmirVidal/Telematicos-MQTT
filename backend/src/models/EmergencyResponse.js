import mongoose from "mongoose";

const evidenceSchema = new mongoose.Schema(
  {
    fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false },
);

const emergencyResponseSchema = new mongoose.Schema(
  {
    responseId: { type: String, required: true, unique: true },
    emergencyId: { type: String, required: true },
    buildingId: { type: String, required: true },
    responderId: { type: String, required: true },
    responderName: { type: String, required: true },
    responderRole: { type: String, required: true },
    description: { type: String, required: true, maxlength: 500 },
    evidence: { type: [evidenceSchema], required: true },
    accessTokenHash: { type: String, required: true, select: false },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  { collection: "emergency_responses", versionKey: false },
);

emergencyResponseSchema.index({ emergencyId: 1, createdAt: -1 });

export const EmergencyResponse = mongoose.model(
  "EmergencyResponse",
  emergencyResponseSchema,
);
