const mongoose = require("mongoose");

const customersSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    notes: { type: String, default: "" },
    visits: { type: Number, default: 0, min: 0 },
    totalSpend: { type: Number, default: 0, min: 0 },
    lastVisit: { type: Date, default: null },
  },
  { timestamps: true },
);

customersSchema.index({ businessId: 1, email: 1 });
customersSchema.index({ businessId: 1, phone: 1 });

module.exports = mongoose.models.Customer || mongoose.model("Customer", customersSchema);
