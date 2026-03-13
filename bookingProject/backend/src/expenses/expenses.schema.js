const mongoose = require("mongoose");

const expensesSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null, index: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, default: "general", trim: true },
    spentAt: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
    recordedBy: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Expense || mongoose.model("Expense", expensesSchema);
