const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    deviceInfo: {
      userAgent: { type: String, default: "" },
      ip: { type: String, default: "" },
      device: { type: String, default: "" }, // mobile, desktop, tablet
      browser: { type: String, default: "" },
      os: { type: String, default: "" },
    },
    isCurrentSession: {
      type: Boolean,
      default: false,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, //crea createdAt y updatedAt
    collection: "sessions",
  }
);

//índice compuesto para búsquedas eficientes
sessionSchema.index({ userId: 1, createdAt: -1 });

//índice TTL para eliminar sesiones expiradas automáticamente (más de 7 días sin actividad)
sessionSchema.index(
  { lastActivity: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 }
);

module.exports = mongoose.model("Session", sessionSchema);

