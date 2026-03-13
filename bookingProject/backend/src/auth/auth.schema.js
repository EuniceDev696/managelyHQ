const mongoose = require("mongoose");

const authSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, trim: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", default: null },
    role: { type: String, enum: ["owner", "staff"], default: "owner" },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
    userAgent: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.models.AuthSession || mongoose.model("AuthSession", authSchema);
