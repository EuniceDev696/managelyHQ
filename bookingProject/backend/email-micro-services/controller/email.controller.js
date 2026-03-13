const mongoose = require("mongoose");
const EmailLog = require("../src/email-log.schema");
const { sendMail } = require("../src/mailer");
const { renderTemplate } = require("../src/templates");

exports.health = async (req, res) => {
  res.status(200).json({
    ok: true,
    service: "email-micro-services",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
};

exports.sendEmail = async (req, res, next) => {
  try {
    const to = String(req.body.to || "").trim().toLowerCase();
    const template = String(req.body.template || "custom").trim();
    const payload = req.body.payload || {};

    if (!to) {
      return res.status(400).json({ message: "Recipient email is required." });
    }

    const rendered = renderTemplate({ template, payload });

    const emailLog = mongoose.connection.readyState === 1
      ? await EmailLog.create({
          to,
          subject: rendered.subject,
          template,
          status: "queued",
          meta: payload,
        })
      : null;

    try {
      const result = await sendMail({
        to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
      const accepted = Array.isArray(result?.accepted)
        ? result.accepted.map((value) => String(value || "").trim().toLowerCase())
        : [];
      const rejected = Array.isArray(result?.rejected)
        ? result.rejected.map((value) => String(value || "").trim().toLowerCase())
        : [];

      if (!accepted.includes(to)) {
        const rejectionReason =
          rejected.includes(to) || rejected.length
            ? `Recipient rejected by SMTP provider: ${to}`
            : `Recipient was not accepted by SMTP provider: ${to}`;

        if (emailLog) {
          emailLog.status = "failed";
          emailLog.error = rejectionReason;
          emailLog.meta = {
            ...(emailLog.meta || {}),
            messageId: result?.messageId || "",
            accepted,
            rejected,
          };
          await emailLog.save();
        }

        return res.status(502).json({ message: rejectionReason });
      }

      if (emailLog) {
        emailLog.status = "sent";
        emailLog.meta = {
          ...(emailLog.meta || {}),
          messageId: result.messageId,
          accepted,
          rejected,
        };
        await emailLog.save();
      }

      return res.status(200).json({
        ok: true,
        to,
        template,
        messageId: result.messageId,
      });
    } catch (error) {
      if (emailLog) {
        emailLog.status = "failed";
        emailLog.error = error.message || "Email sending failed.";
        await emailLog.save();
      }
      return res.status(502).json({ message: error.message || "Email sending failed." });
    }
  } catch (error) {
    return next(error);
  }
};

exports.listEmailLogs = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is not connected." });
    }

    const logs = await EmailLog.find({}).sort({ createdAt: -1 }).limit(100);
    return res.status(200).json(logs);
  } catch (error) {
    return next(error);
  }
};
