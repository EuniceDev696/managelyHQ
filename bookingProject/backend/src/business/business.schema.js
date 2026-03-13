const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    plan: { type: String, enum: ["free", "growth", "pro"], default: "free" },
    status: { type: String, enum: ["active", "trialing", "expired", "cancelled"], default: "active" },
    renewalDate: { type: Date, default: null },
    trialEndsAt: { type: Date, default: null },
  },
  { _id: false },
);

const notificationSettingsSchema = new mongoose.Schema(
  {
    customerConfirmation: { type: Boolean, default: true },
    customerReminder: { type: Boolean, default: true },
    customerCancellation: { type: Boolean, default: true },
    customerReschedule: { type: Boolean, default: true },
    ownerNewBookingAlert: { type: Boolean, default: true },
    staffAssignment: { type: Boolean, default: true },
    channels: {
      email: { type: Boolean, default: true },
    },
  },
  { _id: false },
);

const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, default: "" },
    emailVerificationOtpHash: { type: String, default: "" },
    emailVerificationExpiresAt: { type: Date, default: null },
    password: { type: String, required: true },
    type: { type: String, default: "Other", trim: true },
    brandColor: { type: String, default: "#18c491" },
    logo: { type: String, default: "" },
    description: { type: String, default: "Premium service business" },
    address: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    currency: { type: String, default: "NGN", uppercase: true, trim: true },
    timezone: { type: String, default: "Africa/Lagos", trim: true },
    hasBranches: { type: Boolean, default: false },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    defaultDuration: { type: Number, default: 30, min: 0 },
    subscription: { type: subscriptionSchema, default: () => ({}) },
    notificationSettings: { type: notificationSettingsSchema, default: () => ({}) },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Business || mongoose.model("Business", businessSchema);
