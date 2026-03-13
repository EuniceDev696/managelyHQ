const mongoose = require("mongoose");

const paymentsSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    customerName: { type: String, default: "", trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NGN", uppercase: true },
    provider: { type: String, enum: ["paystack", "manual"], default: "paystack" },
    method: { type: String, enum: ["cash", "bank_transfer", "pos_card", "online_card"], default: "online_card" },
    reference: { type: String, required: true, unique: true, trim: true },
    channel: { type: String, default: "" },
    status: { type: String, enum: ["pending", "success", "failed", "refunded"], default: "pending", index: true },
    paidAt: { type: Date, default: null },
    recordedBy: { type: String, default: "" },
    notes: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Payment || mongoose.model("Payment", paymentsSchema);
