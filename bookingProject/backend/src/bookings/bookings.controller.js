const { randomUUID } = require("crypto");
const mongoose = require("mongoose");
const Booking = require("./bookings.schema");
const AuditLog = require("../audit/audit.schema");
const Customer = require("../customers/customers.schema");
const Payment = require("../payments/payments.schema");
const Service = require("../services/services.schema");
const Staff = require("../staff/staff.schema");
const Business = require("../business/business.schema");
const Branch = require("../branches/branches.schema");
const { resolveBranchId, getScopedBranchFilter } = require("../branches/branch-access.service");
const { auditLog } = require("../utils/audit-log");
const {
  sendBookingConfirmationEmail,
  sendOwnerNewBookingAlertEmail,
  sendStaffAssignedEmail,
  sendBookingReminderEmail,
  sendBookingCancelledEmail,
  sendBookingRescheduledEmail,
  sendPaymentReceiptEmail,
} = require("../email/email-client");

const getBusinessId = (req) => req.auth?.sub || null;

const auditCustomerEmailDelivery = ({ businessId, booking, purpose, result }) => {
  auditLog(result?.ok ? "notifications.email_sent" : "notifications.email_failed", {
    businessId: String(businessId || ""),
    branchId: booking?.branchId ? String(booking.branchId) : null,
    bookingId: booking?._id ? String(booking._id) : null,
    email: String(booking?.email || "").toLowerCase(),
    purpose,
    reason: result?.ok ? "" : String(result?.error || "delivery_failed"),
  });
};

const getBranchDetails = async (businessId, branchId) => {
  if (!branchId) {
    return { branchName: "", branchAddress: "" };
  }

  const branch = await Branch.findOne({ _id: branchId, businessId }).select("name address");
  return {
    branchName: branch?.name || "",
    branchAddress: branch?.address || "",
  };
};

const getBranchNotificationSettings = async (businessId, branchId) => {
  const business = await Business.findById(businessId).select("notificationSettings");
  const defaults = business?.notificationSettings || {};
  if (!branchId) {
    return {
      customerConfirmation: defaults.customerConfirmation !== false,
      customerReminder: defaults.customerReminder !== false,
      customerCancellation: defaults.customerCancellation !== false,
      customerReschedule: defaults.customerReschedule !== false,
      ownerNewBookingAlert: defaults.ownerNewBookingAlert !== false,
      staffAssignment: defaults.staffAssignment !== false,
    };
  }

  const branch = await Branch.findOne({ _id: branchId, businessId }).select("notificationSettings");
  const settings = branch?.notificationSettings || {};
  return {
    customerConfirmation: settings.customerConfirmation !== undefined ? settings.customerConfirmation !== false : defaults.customerConfirmation !== false,
    customerReminder: settings.customerReminder !== undefined ? settings.customerReminder !== false : defaults.customerReminder !== false,
    customerCancellation: settings.customerCancellation !== undefined ? settings.customerCancellation !== false : defaults.customerCancellation !== false,
    customerReschedule: settings.customerReschedule !== undefined ? settings.customerReschedule !== false : defaults.customerReschedule !== false,
    ownerNewBookingAlert: settings.ownerNewBookingAlert !== undefined ? settings.ownerNewBookingAlert !== false : defaults.ownerNewBookingAlert !== false,
    staffAssignment: settings.staffAssignment !== undefined ? settings.staffAssignment !== false : defaults.staffAssignment !== false,
  };
};

const getScopedBranchResolution = async (req, businessId, requestedBranchId, fallbackBranchId = undefined) => {
  const role = String(req.auth?.role || "").toLowerCase();
  const authBranchId = req.auth?.branchId || null;

  if (["manager", "staff"].includes(role) && authBranchId) {
    return resolveBranchId(businessId, authBranchId);
  }

  if (requestedBranchId !== undefined) {
    return resolveBranchId(businessId, requestedBranchId);
  }

  return { ok: true, branchId: fallbackBranchId };
};

const notifyBookingStakeholders = async ({ businessId, booking, previousStaffId = "", previousStaffEmail = "" }) => {
  const business = await Business.findById(businessId).select("name email");
  const branchDetails = await getBranchDetails(businessId, booking.branchId);
  const notificationSettings = await getBranchNotificationSettings(businessId, booking.branchId);
  if (business?.email && notificationSettings.ownerNewBookingAlert) {
    sendOwnerNewBookingAlertEmail({
      to: business.email,
      companyName: business.name || "ManagelyHQ",
      customerName: booking.customer,
      serviceName: booking.service,
      date: booking.date,
      time: booking.time,
      branchName: branchDetails.branchName,
    });
  }

  if (booking.staffId && String(booking.staffId) !== String(previousStaffId || "") && notificationSettings.staffAssignment) {
    const staff = await Staff.findOne({ _id: booking.staffId, businessId }).select("name email");
    if (staff?.email && staff.email !== previousStaffEmail) {
      sendStaffAssignedEmail({
        to: staff.email,
        companyName: business?.name || "ManagelyHQ",
        staffName: staff.name,
        customerName: booking.customer,
        serviceName: booking.service,
        date: booking.date,
        time: booking.time,
        branchName: branchDetails.branchName,
      });
    }
  }
};

const sendCustomerBookingEmail = async ({ businessId, booking, purpose }) => {
  const business = await Business.findById(businessId).select("name");
  const branchDetails = await getBranchDetails(businessId, booking.branchId);

  if (purpose === "booking_confirmation") {
    return sendBookingConfirmationEmail({
      to: booking.email,
      companyName: business?.name || "ManagelyHQ",
      customerName: booking.customer,
      serviceName: booking.service,
      date: booking.date,
      time: booking.time,
      branchName: branchDetails.branchName,
      branchAddress: branchDetails.branchAddress,
    });
  }

  if (purpose === "booking_reminder") {
    return sendBookingReminderEmail({
      to: booking.email,
      companyName: business?.name || "ManagelyHQ",
      customerName: booking.customer,
      serviceName: booking.service,
      date: booking.date,
      time: booking.time,
      branchName: branchDetails.branchName,
      branchAddress: branchDetails.branchAddress,
    });
  }

  return { ok: false, error: "unsupported_notification_purpose" };
};

const attachLatestNotificationStatus = async (businessId, bookings) => {
  const bookingIds = bookings
    .map((booking) => String(booking?._id || ""))
    .filter(Boolean);

  if (!bookingIds.length) {
    return bookings;
  }

  const notificationLogs = await AuditLog.find({
    businessId,
    bookingId: { $in: bookingIds },
    event: { $in: ["notifications.email_sent", "notifications.email_failed"] },
  }).sort({ createdAt: -1 });

  const latestByBookingId = new Map();
  notificationLogs.forEach((item) => {
    const bookingId = String(item.bookingId || "");
    if (!bookingId || latestByBookingId.has(bookingId)) return;
    latestByBookingId.set(bookingId, {
      event: item.event,
      purpose: item.purpose || "",
      reason: item.reason || "",
      createdAt: item.createdAt || item.updatedAt || null,
    });
  });

  return bookings.map((booking) => {
    const payload = typeof booking?.toObject === "function" ? booking.toObject() : { ...booking };
    payload.notificationStatus = latestByBookingId.get(String(booking?._id || "")) || null;
    return payload;
  });
};

const attachPaymentSummary = async (businessId, bookings) => {
  const bookingIds = bookings
    .map((booking) => String(booking?._id || ""))
    .filter(Boolean);

  if (!bookingIds.length) {
    return bookings;
  }

  const payments = await Payment.find({
    businessId,
    bookingId: { $in: bookingIds },
    status: "success",
    "metadata.purpose": { $ne: "subscription_upgrade" },
  }).select("bookingId amount paidAt createdAt status");

  const amountPaidByBookingId = new Map();
  payments.forEach((payment) => {
    const bookingId = String(payment.bookingId || "");
    if (!bookingId) return;
    amountPaidByBookingId.set(
      bookingId,
      Number(amountPaidByBookingId.get(bookingId) || 0) + Number(payment.amount || 0),
    );
  });

  return bookings.map((booking) => {
    const payload = typeof booking?.toObject === "function" ? booking.toObject() : { ...booking };
    const bookingId = String(booking?._id || "");
    const totalAmount = Math.max(0, Number(payload.price || 0));
    const amountPaid = Math.max(0, Number(amountPaidByBookingId.get(bookingId) || 0));
    const balanceDue = Math.max(0, totalAmount - amountPaid);

    payload.paymentSummary = {
      totalAmount,
      amountPaid,
      balanceDue,
      status: balanceDue <= 0 ? "paid" : amountPaid > 0 ? "partial" : "unpaid",
    };
    return payload;
  });
};

const ensureCompletedBookingPayment = async (req, booking) => {
  if (!booking || String(booking.status || "").toLowerCase() !== "completed") return;

  const successfulPayments = await Payment.find({
    businessId: booking.businessId,
    bookingId: booking._id,
    status: "success",
    "metadata.purpose": { $ne: "subscription_upgrade" },
  }).select("amount");

  const totalPrice = Number(booking.price || 0);
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) return;

  const amountAlreadyPaid = successfulPayments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );
  const amount = Math.max(0, totalPrice - amountAlreadyPaid);
  if (amount <= 0) return;

  const paymentMethod = String(req.body.paymentMethod || "cash").trim();

  const payment = await Payment.create({
    businessId: booking.businessId,
    branchId: booking.branchId || null,
    bookingId: booking._id,
    customerId: booking.customerId || null,
    customerName: String(booking.customer || "").trim(),
    amount,
    currency: "NGN",
    provider: "manual",
    method: ["cash", "bank_transfer", "pos_card", "online_card"].includes(paymentMethod) ? paymentMethod : "cash",
    reference: `apt_${booking._id}_${randomUUID().slice(0, 8)}`,
    channel: paymentMethod || "booking_completion",
    status: "success",
    paidAt: new Date(),
    recordedBy: String(req.auth?.email || ""),
    notes: `Auto-recorded when appointment was marked completed.`,
    metadata: {
      source: "booking_completion",
      bookingDate: booking.date,
      bookingTime: booking.time,
      service: booking.service,
    },
  });

  const business = await Business.findById(booking.businessId).select("name");
  if (booking.email) {
    sendPaymentReceiptEmail({
      to: booking.email,
      companyName: business?.name || "ManagelyHQ",
      customerName: booking.customer,
      amount,
      method: payment.method,
      reference: payment.reference,
      serviceName: booking.service,
    });
  }
};

const upsertCustomerFromBooking = async (businessId, payload, amount, when, branchId = null) => {
  const filters = [{ name: payload.customer.trim() }];
  if (payload.email) {
    filters.unshift({ email: String(payload.email).toLowerCase().trim() });
  }
  if (payload.phone) {
    filters.unshift({ phone: String(payload.phone).trim() });
  }

  let customer = await Customer.findOne({ businessId, $or: filters });

  if (!customer) {
    customer = new Customer({
      businessId,
      branchId,
      name: payload.customer.trim(),
      email: payload.email ? String(payload.email).toLowerCase().trim() : "",
      phone: payload.phone ? String(payload.phone).trim() : "",
      notes: "",
      visits: 0,
      totalSpend: 0,
      lastVisit: null,
    });
  }

  customer.name = customer.name || payload.customer.trim();
  customer.email = customer.email || (payload.email ? String(payload.email).toLowerCase().trim() : "");
  customer.phone = customer.phone || (payload.phone ? String(payload.phone).trim() : "");
  customer.branchId = customer.branchId || branchId || null;
  customer.visits += 1;
  customer.totalSpend += amount;
  customer.lastVisit = when || customer.lastVisit;
  await customer.save();
  return customer;
};

exports.listBookings = async (req, res, next) => {
  try {
    const businessId = getBusinessId(req);
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const branchFilter = await getScopedBranchFilter(req, businessId, req.query.branchId);
    if (!branchFilter.ok) {
      return res.status(400).json({ message: branchFilter.message });
    }
    const bookings = await Booking.find({ businessId, ...branchFilter.filter }).sort({ date: 1, time: 1, createdAt: -1 });
    const withNotifications = await attachLatestNotificationStatus(businessId, bookings);
    const withPaymentSummary = await attachPaymentSummary(businessId, withNotifications);
    return res.status(200).json(withPaymentSummary);
  } catch (error) {
    return next(error);
  }
};

exports.createBooking = async (req, res, next) => {
  try {
    const businessId = getBusinessId(req);
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const customerName = String(req.body.customer || "").trim();
    const date = String(req.body.date || "").trim();
    const time = String(req.body.time || "").trim();

    if (!customerName || !date || !time) {
      return res.status(400).json({ message: "Customer name, date, and time are required." });
    }
    const resolvedBranch = await getScopedBranchResolution(req, businessId, req.body.branchId, null);
    if (!resolvedBranch.ok) {
      return res.status(400).json({ message: resolvedBranch.message });
    }

    const conflict = await Booking.findOne({
      businessId,
      branchId: resolvedBranch.branchId ?? null,
      date,
      time,
      status: { $ne: "cancelled" },
    });
    if (conflict) {
      return res.status(409).json({ message: "Time slot already booked." });
    }

    let serviceName = String(req.body.service || "Service").trim() || "Service";
    let price = Number(req.body.price || 0);
    let serviceId = req.body.serviceId || null;

    if (serviceId) {
      if (!mongoose.Types.ObjectId.isValid(serviceId)) {
        return res.status(400).json({ message: "Invalid serviceId." });
      }
      const service = await Service.findOne({ _id: serviceId, businessId });
      if (!service) {
        return res.status(404).json({ message: "Service not found." });
      }
      serviceName = service.name;
      price = Number(service.price || 0);
      serviceId = service._id;
    }

    let staffName = String(req.body.staff || "").trim();
    let staffId = req.body.staffId || null;
    if (staffId) {
      if (!mongoose.Types.ObjectId.isValid(staffId)) {
        return res.status(400).json({ message: "Invalid staffId." });
      }
      const staff = await Staff.findOne({ _id: staffId, businessId });
      if (!staff) {
        return res.status(404).json({ message: "Staff not found." });
      }
      staffName = staff.name;
      staffId = staff._id;
    }

    const booking = await Booking.create({
      businessId,
      branchId: resolvedBranch.branchId ?? null,
      customerId: null,
      customer: customerName,
      email: req.body.email ? String(req.body.email).toLowerCase().trim() : "",
      phone: req.body.phone ? String(req.body.phone).trim() : "",
      serviceId,
      service: serviceName,
      staffId,
      staff: staffName,
      date,
      time,
      status: req.body.status || "pending",
      price: Number.isFinite(price) ? Math.max(0, price) : 0,
      source: req.body.source || "owner",
      notes: req.body.notes || "",
    });

    const customer = await upsertCustomerFromBooking(
      businessId,
      {
        customer: customerName,
        email: booking.email,
        phone: booking.phone,
      },
      booking.price,
      new Date(`${booking.date}T${booking.time}:00`),
      resolvedBranch.branchId ?? null,
    );

    booking.customerId = customer._id;
    await booking.save();
    await notifyBookingStakeholders({ businessId, booking });

    return res.status(201).json(booking);
  } catch (error) {
    return next(error);
  }
};

exports.updateBooking = async (req, res, next) => {
  try {
    const businessId = getBusinessId(req);
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const { bookingId } = req.params;
    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ message: "Invalid booking id." });
    }

    const booking = await Booking.findOne({ _id: bookingId, businessId });
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }
    const previousDate = booking.date;
    const previousTime = booking.time;
    const previousStatus = booking.status;
    const previousStaffId = booking.staffId ? String(booking.staffId) : "";
    let previousStaffEmail = "";
    if (previousStaffId) {
      const previousStaff = await Staff.findOne({ _id: previousStaffId, businessId }).select("email");
      previousStaffEmail = previousStaff?.email || "";
    }

    const nextDate = req.body.date !== undefined ? String(req.body.date || "").trim() : booking.date;
    const nextTime = req.body.time !== undefined ? String(req.body.time || "").trim() : booking.time;
    const nextBranch = await getScopedBranchResolution(req, businessId, req.body.branchId, booking.branchId);
    if (!nextBranch.ok) {
      return res.status(400).json({ message: nextBranch.message });
    }

    if (!nextDate || !nextTime) {
      return res.status(400).json({ message: "Date and time are required." });
    }

    if (nextDate !== booking.date || nextTime !== booking.time || String(nextBranch.branchId || "") !== String(booking.branchId || "")) {
      const conflict = await Booking.findOne({
        _id: { $ne: booking._id },
        businessId,
        branchId: nextBranch.branchId ?? null,
        date: nextDate,
        time: nextTime,
        status: { $ne: "cancelled" },
      });
      if (conflict) {
        return res.status(409).json({ message: "Time slot already booked." });
      }
    }

    if (req.body.customer !== undefined) {
      const customerName = String(req.body.customer || "").trim();
      if (!customerName) {
        return res.status(400).json({ message: "Customer name cannot be empty." });
      }
      booking.customer = customerName;
    }

    if (req.body.email !== undefined) {
      booking.email = String(req.body.email || "").toLowerCase().trim();
    }

    if (req.body.phone !== undefined) {
      booking.phone = String(req.body.phone || "").trim();
    }

    if (req.body.date !== undefined) {
      booking.date = nextDate;
    }

    if (req.body.time !== undefined) {
      booking.time = nextTime;
    }

    if (req.body.branchId !== undefined) {
      booking.branchId = nextBranch.branchId;
    }

    if (req.body.status !== undefined) {
      booking.status = req.body.status;
    }

    if (req.body.notes !== undefined) {
      booking.notes = String(req.body.notes || "");
    }

    if (req.body.source !== undefined) {
      booking.source = req.body.source;
    }

    if (req.body.serviceId !== undefined) {
      if (!req.body.serviceId) {
        booking.serviceId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(req.body.serviceId)) {
          return res.status(400).json({ message: "Invalid serviceId." });
        }
        const service = await Service.findOne({ _id: req.body.serviceId, businessId });
        if (!service) {
          return res.status(404).json({ message: "Service not found." });
        }
        booking.serviceId = service._id;
        booking.service = service.name;
        booking.price = Number(service.price || booking.price || 0);
      }
    }

    if (req.body.service !== undefined) {
      booking.service = String(req.body.service || "Service").trim() || "Service";
    }

    if (req.body.price !== undefined) {
      const price = Number(req.body.price);
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ message: "Price must be a non-negative number." });
      }
      booking.price = price;
    }

    if (req.body.staffId !== undefined) {
      if (!req.body.staffId) {
        booking.staffId = null;
        booking.staff = "";
      } else {
        if (!mongoose.Types.ObjectId.isValid(req.body.staffId)) {
          return res.status(400).json({ message: "Invalid staffId." });
        }
        const staff = await Staff.findOne({ _id: req.body.staffId, businessId });
        if (!staff) {
          return res.status(404).json({ message: "Staff not found." });
        }
        booking.staffId = staff._id;
        booking.staff = staff.name;
      }
    }

    if (req.body.staff !== undefined) {
      booking.staff = String(req.body.staff || "").trim();
    }

    await booking.save();
    if (booking.email) {
      const branchDetails = await getBranchDetails(businessId, booking.branchId);
      const notificationSettings = await getBranchNotificationSettings(businessId, booking.branchId);
      if (previousStatus !== "cancelled" && booking.status === "cancelled") {
        if (notificationSettings.customerCancellation) {
          const businessName = (await Business.findById(businessId).select("name"))?.name || "ManagelyHQ";
          const result = await sendBookingCancelledEmail({
            to: booking.email,
            companyName: businessName,
            customerName: booking.customer,
            serviceName: booking.service,
            date: booking.date,
            time: booking.time,
            branchName: branchDetails.branchName,
          });
          auditCustomerEmailDelivery({ businessId, booking, purpose: "booking_cancellation", result });
        }
      } else if ((previousDate !== booking.date || previousTime !== booking.time) && booking.status !== "cancelled") {
        if (notificationSettings.customerReschedule) {
          const businessName = (await Business.findById(businessId).select("name"))?.name || "ManagelyHQ";
          const result = await sendBookingRescheduledEmail({
            to: booking.email,
            companyName: businessName,
            customerName: booking.customer,
            serviceName: booking.service,
            previousDate,
            previousTime,
            nextDate: booking.date,
            nextTime: booking.time,
            branchName: branchDetails.branchName,
          });
          auditCustomerEmailDelivery({ businessId, booking, purpose: "booking_reschedule", result });
        }
      }
    }
    await notifyBookingStakeholders({ businessId, booking, previousStaffId, previousStaffEmail });
    return res.status(200).json(booking);
  } catch (error) {
    return next(error);
  }
};

exports.updateBookingStatus = async (req, res, next) => {
  try {
    const businessId = getBusinessId(req);
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const { bookingId } = req.params;
    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ message: "Invalid booking id." });
    }

    const status = String(req.body.status || "").trim();
    if (!status) {
      return res.status(400).json({ message: "Status is required." });
    }

    const booking = await Booking.findOne({ _id: bookingId, businessId });
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    booking.status = status;
    await booking.save();
    await ensureCompletedBookingPayment(req, booking);
    return res.status(200).json(booking);
  } catch (error) {
    return next(error);
  }
};

exports.deleteBooking = async (req, res, next) => {
  try {
    const businessId = getBusinessId(req);
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const { bookingId } = req.params;
    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ message: "Invalid booking id." });
    }

    const booking = await Booking.findOne({ _id: bookingId, businessId });
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const business = await Business.findById(businessId).select("name");
    const branchDetails = await getBranchDetails(businessId, booking.branchId);
    const notificationSettings = await getBranchNotificationSettings(businessId, booking.branchId);
    if (booking.email && notificationSettings.customerCancellation) {
      const result = await sendBookingCancelledEmail({
        to: booking.email,
        companyName: business?.name || "ManagelyHQ",
        customerName: booking.customer,
        serviceName: booking.service,
        date: booking.date,
        time: booking.time,
        branchName: branchDetails.branchName,
      });
      auditCustomerEmailDelivery({ businessId, booking, purpose: "booking_cancellation", result });
    }

    await Booking.deleteOne({ _id: booking._id, businessId });
    return res.status(200).json({ ok: true });
  } catch (error) {
    return next(error);
  }
};

exports.sendBookingReminders = async (req, res, next) => {
  try {
    const businessId = getBusinessId(req);
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const date = String(req.body.date || "").trim();
    if (!date) {
      return res.status(400).json({ message: "Date is required." });
    }
    const branchFilter = await getScopedBranchFilter(req, businessId, req.body.branchId);
    if (!branchFilter.ok) {
      return res.status(400).json({ message: branchFilter.message });
    }

    const business = await Business.findById(businessId).select("name");
    const bookings = await Booking.find({
      businessId,
      ...branchFilter.filter,
      date,
      email: { $ne: "" },
      status: { $in: ["pending", "confirmed"] },
    }).sort({ time: 1 });

    let sentCount = 0;
    let failedCount = 0;
    await Promise.all(
      bookings.map(async (booking) => {
        const notificationSettings = await getBranchNotificationSettings(businessId, booking.branchId);
        if (!notificationSettings.customerReminder) {
          return;
        }
        const branchDetails = await getBranchDetails(businessId, booking.branchId);
        const result = await sendBookingReminderEmail({
          to: booking.email,
          companyName: business?.name || "ManagelyHQ",
          customerName: booking.customer,
          serviceName: booking.service,
          date: booking.date,
          time: booking.time,
          branchName: branchDetails.branchName,
          branchAddress: branchDetails.branchAddress,
        });
        auditCustomerEmailDelivery({ businessId, booking, purpose: "booking_reminder", result });
        if (result?.ok) {
          sentCount += 1;
        } else {
          failedCount += 1;
        }
      }),
    );

    return res.status(200).json({ ok: true, sent: sentCount, failed: failedCount });
  } catch (error) {
    return next(error);
  }
};

exports.resendBookingNotification = async (req, res, next) => {
  try {
    const businessId = getBusinessId(req);
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const { bookingId } = req.params;
    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ message: "Invalid booking id." });
    }

    const purpose = String(req.body.purpose || "").trim();
    const branchFilter = await getScopedBranchFilter(req, businessId, undefined);
    if (!branchFilter.ok) {
      return res.status(400).json({ message: branchFilter.message });
    }

    const booking = await Booking.findOne({ _id: bookingId, businessId, ...branchFilter.filter });
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    if (!booking.email) {
      return res.status(400).json({ message: "Booking has no customer email." });
    }

    const result = await sendCustomerBookingEmail({ businessId, booking, purpose });
    auditCustomerEmailDelivery({ businessId, booking, purpose, result });

    if (!result?.ok) {
      return res.status(502).json({ message: "Could not resend booking email.", reason: result?.error || "delivery_failed" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return next(error);
  }
};
