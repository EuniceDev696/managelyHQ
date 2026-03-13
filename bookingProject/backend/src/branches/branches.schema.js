const mongoose = require("mongoose");

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

const branchesSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    address: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    managerStaffId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", default: null },
    active: { type: Boolean, default: true },
    notificationSettings: { type: notificationSettingsSchema, default: () => ({}) },
  },
  { timestamps: true },
);

branchesSchema.index({ businessId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.models.Branch || mongoose.model("Branch", branchesSchema);
