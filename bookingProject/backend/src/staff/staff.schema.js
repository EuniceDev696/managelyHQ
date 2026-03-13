const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true, default: undefined },
    emailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, default: "" },
    emailVerificationOtpHash: { type: String, default: "" },
    emailVerificationExpiresAt: { type: Date, default: null },
    password: { type: String, default: "" },
    mustChangePassword: { type: Boolean, default: false },
    role: { type: String, enum: ["owner", "admin", "manager", "staff"], default: "staff" },
    availability: { type: String, default: "Mon - Fri" },
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],
    availableForBooking: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

staffSchema.index(
  { businessId: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $type: "string", $gt: "" },
    },
  },
);

module.exports = mongoose.models.Staff || mongoose.model("Staff", staffSchema);
