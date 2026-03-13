const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema(
  {
    event: { type: String, required: true, trim: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", default: null },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", default: null },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    email: { type: String, default: "", trim: true, lowercase: true },
    role: { type: String, default: "", trim: true },
    reason: { type: String, default: "", trim: true },
    reference: { type: String, default: "", trim: true },
    actorType: { type: String, default: "", trim: true },
    webhookEvent: { type: String, default: "", trim: true },
    purpose: { type: String, default: "", trim: true },
    planId: { type: String, default: "", trim: true },
    amount: { type: Number, default: null },
    method: { type: String, default: "", trim: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    updatedFields: { type: [String], default: [] },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

auditSchema.index({ event: 1, createdAt: -1 });
auditSchema.index({ businessId: 1, createdAt: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model("AuditLog", auditSchema);
