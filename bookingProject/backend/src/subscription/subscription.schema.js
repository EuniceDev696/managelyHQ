const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, unique: true, index: true },
    plan: { type: String, enum: ["free", "growth", "pro"], default: "free" },
    status: { type: String, enum: ["active", "trialing", "expired", "cancelled"], default: "active" },
    renewalDate: { type: Date, default: null },
    trialEndsAt: { type: Date, default: null },
    lastPaymentReference: { type: String, default: "" },
    lastExpiryWarningSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Subscription || mongoose.model("Subscription", subscriptionSchema);
