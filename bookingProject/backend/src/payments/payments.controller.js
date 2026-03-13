const crypto = require("crypto");
const { randomUUID } = crypto;
const Payment = require("./payments.schema");
const Business = require("../business/business.schema");
const Subscription = require("../subscription/subscription.schema");
const Booking = require("../bookings/bookings.schema");
const Customer = require("../customers/customers.schema");
const { auditLog } = require("../utils/audit-log");
const { sendSubscriptionConfirmationEmail, sendPaymentReceiptEmail, sendSubscriptionExpiryWarningEmail } = require("../email/email-client");
const { resolveBranchId, getScopedBranchFilter } = require("../branches/branch-access.service");

const PAYSTACK_BASE_URL = "https://api.paystack.co";

const getBusinessId = (req) => req.auth?.sub || null;

const isObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(String(value || ""));

const sendReceiptIfPossible = async (payment) => {
  if (!payment || String(payment.status || "").toLowerCase() !== "success") return;
  if (payment.metadata?.purpose === "subscription_upgrade") return;

  const business = await Business.findById(payment.businessId).select("name");
  let recipientEmail = "";
  let serviceName = "";

  if (payment.bookingId) {
    const booking = await Booking.findById(payment.bookingId).select("email service customer");
    recipientEmail = booking?.email || "";
    serviceName = booking?.service || "";
  }

  if (!recipientEmail && payment.customerId) {
    const customer = await Customer.findById(payment.customerId).select("email");
    recipientEmail = customer?.email || "";
  }

  if (!recipientEmail) return;

  sendPaymentReceiptEmail({
    to: recipientEmail,
    companyName: business?.name || "ManagelyHQ",
    customerName: payment.customerName || "",
    amount: payment.amount,
    method: payment.method,
    reference: payment.reference,
    serviceName,
  });
};

const activateSubscriptionFromPayment = async (payment) => {
  if (payment.metadata?.purpose !== "subscription_upgrade") return;

  const businessId = String(payment.businessId || "");
  const plan = String(payment.metadata?.planId || "").toLowerCase();
  if (!businessId || !["growth", "pro"].includes(plan)) return;

  const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await Business.findByIdAndUpdate(businessId, {
    $set: {
      "subscription.plan": plan,
      "subscription.status": "active",
      "subscription.renewalDate": renewalDate,
      "subscription.trialEndsAt": null,
    },
  });

  await Subscription.findOneAndUpdate(
    { businessId },
    {
      $set: {
        plan,
        status: "active",
        renewalDate,
        trialEndsAt: null,
        lastPaymentReference: payment.reference,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  const business = await Business.findById(businessId).select("name email");
  if (business?.email) {
    sendSubscriptionConfirmationEmail({
      to: business.email,
      companyName: business.name || "ManagelyHQ",
      planName: plan,
      amount: payment.amount,
      renewalDate: renewalDate.toISOString(),
    });
  }
};

const markPaymentStatus = async (payment, status, metadata = {}) => {
  payment.status = status;
  if (status === "success" && !payment.paidAt) {
    payment.paidAt = new Date();
  }
  payment.metadata = { ...(payment.metadata || {}), ...metadata };
  await payment.save();
  return payment;
};

const callPaystack = async (path, method = "GET", body = null) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return { ok: false, message: "Paystack secret key is not configured." };
  }

  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.status === false) {
      return {
        ok: false,
        message: payload?.message || "Paystack request failed.",
        payload,
      };
    }
    return { ok: true, payload };
  } catch (error) {
    return { ok: false, message: error.message || "Paystack request failed." };
  }
};

exports.listPayments = async (req, res, next) => {
  try {
    const businessId = getBusinessId(req);
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const status = String(req.query.status || "").trim();
    const method = String(req.query.method || "").trim();
    const branchFilter = await getScopedBranchFilter(req, businessId, req.query.branchId);
    if (!branchFilter.ok) {
      return res.status(400).json({ message: branchFilter.message });
    }
    const query = { businessId, ...branchFilter.filter };

    if (status) query.status = status;
    if (method) query.method = method;

    const payments = await Payment.find(query).sort({ createdAt: -1 });
    return res.status(200).json(payments);
  } catch (error) {
    return next(error);
  }
};

exports.recordManualPayment = async (req, res, next) => {
  try {
    const businessId = getBusinessId(req);
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const amount = Number(req.body.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0." });
    }

    const method = String(req.body.method || "").trim();
    if (!["cash", "bank_transfer", "pos_card"].includes(method)) {
      return res.status(400).json({ message: "Method must be cash, bank_transfer, or pos_card." });
    }

    if (req.body.bookingId && !isObjectId(req.body.bookingId)) {
      return res.status(400).json({ message: "Invalid bookingId." });
    }
    if (req.body.customerId && !isObjectId(req.body.customerId)) {
      return res.status(400).json({ message: "Invalid customerId." });
    }
    const requestedBranchId = ["manager", "staff"].includes(String(req.auth?.role || "").toLowerCase())
      ? req.auth?.branchId || null
      : req.body.branchId;
    const resolvedBranch = await resolveBranchId(businessId, requestedBranchId);
    if (!resolvedBranch.ok) {
      return res.status(400).json({ message: resolvedBranch.message });
    }

    const payment = await Payment.create({
      businessId,
      branchId: resolvedBranch.branchId ?? null,
      bookingId: req.body.bookingId || null,
      customerId: req.body.customerId || null,
      customerName: String(req.body.customerName || "").trim(),
      amount,
      currency: String(req.body.currency || "NGN").toUpperCase(),
      provider: "manual",
      method,
      reference: req.body.reference || `man_${Date.now()}_${randomUUID().slice(0, 8)}`,
      channel: req.body.channel || method,
      status: "success",
      paidAt: new Date(),
      recordedBy: String(req.auth?.email || ""),
      notes: String(req.body.notes || ""),
      metadata: req.body.metadata || {},
    });

    auditLog("payments.manual_recorded", {
      businessId: String(businessId),
      paymentId: String(payment._id),
      amount,
      method,
      bookingId: req.body.bookingId || null,
    });
    await sendReceiptIfPossible(payment);

    return res.status(201).json(payment);
  } catch (error) {
    return next(error);
  }
};

exports.initializePayment = async (req, res, next) => {
  try {
    const businessId = getBusinessId(req);
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const amount = Number(req.body.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0." });
    }

    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Customer email is required for online payment." });
    }

    if (req.body.bookingId && !isObjectId(req.body.bookingId)) {
      return res.status(400).json({ message: "Invalid bookingId." });
    }
    if (req.body.customerId && !isObjectId(req.body.customerId)) {
      return res.status(400).json({ message: "Invalid customerId." });
    }

    const reference = req.body.reference || `pay_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const currency = String(req.body.currency || "NGN").toUpperCase();
    const purpose = String(req.body.purpose || "").trim();
    const planId = String(req.body.planId || req.body.metadata?.planId || "").trim();

    if (purpose !== "subscription_upgrade") {
      auditLog("payments.initialize_blocked", {
        businessId: String(businessId),
        reason: "invalid_purpose",
        purpose,
      });
      return res.status(400).json({
        message: "Online gateway checkout is reserved for ManagelyHQ subscription upgrades.",
      });
    }
    if (!["growth", "pro"].includes(planId)) {
      auditLog("payments.initialize_blocked", {
        businessId: String(businessId),
        reason: "invalid_plan",
        planId,
      });
      return res.status(400).json({ message: "A valid target subscription plan is required." });
    }

    const payment = await Payment.create({
      businessId,
      bookingId: req.body.bookingId || null,
      customerId: req.body.customerId || null,
      customerName: String(req.body.customerName || "").trim(),
      amount,
      currency,
      provider: "paystack",
      method: "online_card",
      reference,
      channel: "online",
      status: "pending",
      paidAt: null,
      recordedBy: String(req.auth?.email || ""),
      notes: String(req.body.notes || ""),
      metadata: { ...(req.body.metadata || {}), purpose, planId },
    });

    const callbackUrl = req.body.callbackUrl || process.env.PAYSTACK_CALLBACK_URL || "";
    const paystackResult = await callPaystack("/transaction/initialize", "POST", {
      email,
      amount: Math.round(amount * 100),
      currency,
      reference,
      callback_url: callbackUrl || undefined,
      metadata: {
        businessId: String(businessId),
        bookingId: req.body.bookingId || null,
        purpose,
        planId,
      },
    });

    if (!paystackResult.ok) {
      await markPaymentStatus(payment, "failed", { initializeError: paystackResult.message });
      auditLog("payments.initialize_failed", {
        businessId: String(businessId),
        paymentId: String(payment._id),
        reference,
        planId,
        reason: paystackResult.message,
      });
      return res.status(400).json({ message: paystackResult.message || "Unable to initialize payment." });
    }

    payment.metadata = {
      ...(payment.metadata || {}),
      paystack: paystackResult.payload?.data || {},
    };
    await payment.save();
    auditLog("payments.initialize_success", {
      businessId: String(businessId),
      paymentId: String(payment._id),
      reference,
      planId,
      amount,
    });

    return res.status(201).json({
      id: payment._id,
      reference: payment.reference,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      authorizationUrl: paystackResult.payload?.data?.authorization_url || null,
      accessCode: paystackResult.payload?.data?.access_code || "",
    });
  } catch (error) {
    return next(error);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const businessId = getBusinessId(req);
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const reference = String(req.body.reference || "").trim();
    if (!reference) {
      return res.status(400).json({ message: "Payment reference is required." });
    }

    const payment = await Payment.findOne({ businessId, reference });
    if (!payment) {
      return res.status(404).json({ message: "Payment not found." });
    }

    if (payment.provider !== "paystack") {
      return res.status(400).json({ message: "Only Paystack payments can be verified online." });
    }

    const verifyResult = await callPaystack(`/transaction/verify/${encodeURIComponent(reference)}`, "GET");
    if (!verifyResult.ok) {
      auditLog("payments.verify_failed", {
        businessId: String(businessId),
        paymentId: String(payment._id),
        reference,
        reason: verifyResult.message,
      });
      return res.status(400).json({ message: verifyResult.message || "Unable to verify payment." });
    }

    const gatewayStatus = String(verifyResult.payload?.data?.status || "").toLowerCase();
    if (gatewayStatus === "success") {
      await markPaymentStatus(payment, "success", { verify: verifyResult.payload?.data || {} });
      await activateSubscriptionFromPayment(payment);
      await sendReceiptIfPossible(payment);
      auditLog("payments.verify_success", {
        businessId: String(businessId),
        paymentId: String(payment._id),
        reference,
        purpose: payment.metadata?.purpose || "",
      });
    } else if (gatewayStatus === "failed" || gatewayStatus === "abandoned") {
      await markPaymentStatus(payment, "failed", { verify: verifyResult.payload?.data || {} });
      auditLog("payments.verify_failed", {
        businessId: String(businessId),
        paymentId: String(payment._id),
        reference,
        reason: gatewayStatus,
      });
    }

    return res.status(200).json(payment);
  } catch (error) {
    return next(error);
  }
};

exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const businessId = getBusinessId(req);
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const paymentId = String(req.params.paymentId || "");
    if (!isObjectId(paymentId)) {
      return res.status(400).json({ message: "Invalid payment id." });
    }

    const nextStatus = String(req.body.status || "").trim();
    if (!["pending", "success", "failed", "refunded"].includes(nextStatus)) {
      return res.status(400).json({ message: "Invalid payment status." });
    }

    const payment = await Payment.findOne({ _id: paymentId, businessId });
    if (!payment) {
      return res.status(404).json({ message: "Payment not found." });
    }

    payment.status = nextStatus;
    if (nextStatus === "success" && !payment.paidAt) {
      payment.paidAt = new Date();
    }
    if (req.body.notes !== undefined) {
      payment.notes = String(req.body.notes || "");
    }
    await payment.save();
    await sendReceiptIfPossible(payment);
    auditLog("payments.status_updated", {
      businessId: String(businessId),
      paymentId: String(payment._id),
      status: nextStatus,
    });

    return res.status(200).json(payment);
  } catch (error) {
    return next(error);
  }
};

exports.handlePaystackWebhook = async (req, res, next) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return res.status(503).json({ message: "Paystack secret key is not configured." });
    }

    const signature = String(req.headers["x-paystack-signature"] || "");
    const expected = crypto.createHmac("sha512", secret).update(req.rawBody || "").digest("hex");
    if (!signature || signature !== expected) {
      auditLog("payments.webhook_rejected", { reason: "invalid_signature" });
      return res.status(401).json({ message: "Invalid webhook signature." });
    }

    const event = req.body || {};
    if (String(event.event || "").toLowerCase() !== "charge.success") {
      return res.status(200).json({ received: true });
    }

    const reference = String(event.data?.reference || "").trim();
    if (!reference) {
      return res.status(200).json({ received: true });
    }

    const payment = await Payment.findOne({ reference });
    if (!payment) {
      auditLog("payments.webhook_ignored", { reason: "payment_not_found", reference });
      return res.status(200).json({ received: true });
    }

    await markPaymentStatus(payment, "success", { webhook: event.data || {} });
    await activateSubscriptionFromPayment(payment);
    await sendReceiptIfPossible(payment);
    auditLog("payments.webhook_success", {
      businessId: String(payment.businessId || ""),
      paymentId: String(payment._id),
      reference,
      webhookEvent: String(event.event || "").toLowerCase(),
    });

    return res.status(200).json({ received: true });
  } catch (error) {
    return next(error);
  }
};

exports.sendExpiryWarning = async (req, res, next) => {
  try {
    const businessId = getBusinessId(req);
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const daysBefore = Number(req.body.daysBefore || 3);
    const subscription = await Subscription.findOne({ businessId });
    const business = await Business.findById(businessId).select("name email subscription");
    const renewalDate = subscription?.renewalDate || business?.subscription?.renewalDate || null;
    const plan = String(subscription?.plan || business?.subscription?.plan || "free").toLowerCase();

    if (!business?.email || !renewalDate || !["growth", "pro"].includes(plan)) {
      return res.status(400).json({ message: "No expiring paid subscription found." });
    }

    const renewal = new Date(renewalDate);
    const diffDays = Math.ceil((renewal.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (diffDays < 0 || diffDays > daysBefore) {
      return res.status(400).json({ message: "Subscription is not within the warning window." });
    }

    const record = subscription || (await Subscription.findOneAndUpdate(
      { businessId },
      { $setOnInsert: { businessId, plan, status: business.subscription?.status || "active", renewalDate: renewal } },
      { upsert: true, returnDocument: "after" },
    ));

    const lastSent = record?.lastExpiryWarningSentAt ? new Date(record.lastExpiryWarningSentAt) : null;
    if (lastSent && lastSent.toDateString() === new Date().toDateString()) {
      return res.status(200).json({ ok: true, message: "Expiry warning already sent today." });
    }

    sendSubscriptionExpiryWarningEmail({
      to: business.email,
      companyName: business.name || "ManagelyHQ",
      planName: plan,
      renewalDate: renewal.toISOString(),
      daysBefore: diffDays,
    });

    await Subscription.updateOne({ businessId }, { $set: { lastExpiryWarningSentAt: new Date() } });

    return res.status(200).json({ ok: true, daysBefore: diffDays });
  } catch (error) {
    return next(error);
  }
};
