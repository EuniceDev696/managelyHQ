const mongoose = require("mongoose");

const bookingsSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    customer: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", default: null },
    service: { type: String, default: "Service", trim: true },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", default: null },
    staff: { type: String, default: "", trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "no_show"],
      default: "pending",
      index: true,
    },
    price: { type: Number, default: 0, min: 0 },
    source: { type: String, enum: ["owner", "public"], default: "public" },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

bookingsSchema.index({ businessId: 1, branchId: 1, date: 1, time: 1 });

module.exports = mongoose.models.Booking || mongoose.model("Booking", bookingsSchema);
