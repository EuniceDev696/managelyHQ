const express = require("express");
const controller = require("./payments.controller");
const authMiddleware = require("../middleware/auth.middleware");
const requireOwner = require("../middleware/require-owner.middleware");
const requireRoles = require("../middleware/require-roles.middleware");
const rateLimit = require("../middleware/rate-limit.middleware");
const validate = require("../middleware/validate.middleware");
const { payments } = require("../validators/request.validators");

const router = express.Router();
const paymentInitLimit = rateLimit({
  namespace: "payments-initialize",
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: "Too many payment initialization attempts. Please wait and try again.",
  keyGenerator: (req) => `${req.auth?.sub || req.ip}:initialize`,
});
const paymentVerifyLimit = rateLimit({
  namespace: "payments-verify",
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: "Too many payment verification attempts. Please wait and try again.",
  keyGenerator: (req) => `${req.auth?.sub || req.ip}:verify`,
});

router.get("/payments", authMiddleware, requireRoles(["owner", "admin", "manager", "staff"]), validate(payments.list), controller.listPayments);
router.post("/payments/initialize", authMiddleware, paymentInitLimit, requireOwner, validate(payments.initialize), controller.initializePayment);
router.post("/payments/manual", authMiddleware, requireRoles(["owner", "admin", "manager", "staff"]), validate(payments.manual), controller.recordManualPayment);
router.post("/payments/verify", authMiddleware, paymentVerifyLimit, requireOwner, validate(payments.verify), controller.verifyPayment);
router.patch("/payments/:paymentId/status", authMiddleware, requireOwner, validate(payments.updateStatus), controller.updatePaymentStatus);
router.post("/payments/webhook", controller.handlePaystackWebhook);

module.exports = router;
