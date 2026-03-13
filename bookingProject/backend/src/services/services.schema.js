const mongoose = require("mongoose");

const servicesSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null, index: true },
    name: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, min: 0, default: 30 },
    price: { type: Number, required: true, min: 0, default: 0 },
    active: { type: Boolean, default: true },
    image: { type: String, default: "" },
    imagePublicId: { type: String, default: "" },
    description: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Service || mongoose.model("Service", servicesSchema);
