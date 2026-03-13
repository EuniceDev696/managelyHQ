const mongoose = require("mongoose");

const emailLogSchema = new mongoose.Schema(
  {
    to: { type: String, required: true, lowercase: true, trim: true },
    subject: { type: String, required: true, trim: true },
    template: { type: String, default: "custom", trim: true },
    status: { type: String, enum: ["queued", "sent", "failed"], default: "queued" },
    provider: { type: String, default: "nodemailer", trim: true },
    error: { type: String, default: "" },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

module.exports = mongoose.models.EmailLog || mongoose.model("EmailLog", emailLogSchema);
