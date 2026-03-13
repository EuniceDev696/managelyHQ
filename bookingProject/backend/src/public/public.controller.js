const Business = require("../business/business.schema");
const Service = require("../services/services.schema");
const Staff = require("../staff/staff.schema");
const Booking = require("../bookings/bookings.schema");
const Customer = require("../customers/customers.schema");
const Branch = require("../branches/branches.schema");
const { sendBookingConfirmationEmail } = require("../email/email-client");
const { resolveBranchId } = require("../branches/branch-access.service");
const { auditLog } = require("../utils/audit-log");

const getPublicCatalogBranchFilter = (branchId) => {
  if (branchId === undefined || branchId === null) {
    return {};
  }

  return {
    $or: [{ branchId }, { branchId: null }],
  };
};

const getBranchNotificationSettings = async (businessId, branchId) => {
  const business = await Business.findById(businessId).select("notificationSettings");
  const defaults = business?.notificationSettings || {};
  if (!branchId) {
    return {
      customerConfirmation: defaults.customerConfirmation !== false,
    };
  }
  const branch = await Branch.findOne({ _id: branchId, businessId }).select("notificationSettings");
  return {
    customerConfirmation:
      branch?.notificationSettings?.customerConfirmation !== undefined
        ? branch.notificationSettings.customerConfirmation !== false
        : defaults.customerConfirmation !== false,
  };
};

const upsertCustomerFromBooking = async (businessId, payload, amount, when, branchId = null) => {
  const filters = [{ name: payload.customer.trim() }];
  if (payload.email) filters.unshift({ email: String(payload.email).toLowerCase().trim() });
  if (payload.phone) filters.unshift({ phone: String(payload.phone).trim() });

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

exports.getPublicBusiness = async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    if (!slug) {
      return res.status(400).json({ message: "Business slug is required." });
    }

    const business = await Business.findOne({ slug }).select("-password");
    if (!business) {
      return res.status(404).json({ message: "Business not found." });
    }
    const branchFilter = await resolveBranchId(business._id, req.query.branchId);
    if (!branchFilter.ok) {
      return res.status(400).json({ message: branchFilter.message });
    }

    const catalogBranchFilter = getPublicCatalogBranchFilter(branchFilter.branchId);

    const [services, staff, branches] = await Promise.all([
      Service.find({ businessId: business._id, active: true, ...catalogBranchFilter }).sort({ sortOrder: 1, createdAt: -1 }),
      Staff.find({ businessId: business._id, availableForBooking: { $ne: false }, ...catalogBranchFilter }).select("-password").sort({ createdAt: -1 }),
      Branch.find({ businessId: business._id, active: true }).sort({ createdAt: 1 }),
    ]);

    return res.status(200).json({ business, services, staff, branches });
  } catch (error) {
    return next(error);
  }
};

exports.getPublicBusinessById = async (req, res, next) => {
  try {
    const businessId = String(req.params.businessId || "").trim();
    if (!businessId || !businessId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Valid business id is required." });
    }

    const business = await Business.findById(businessId).select("-password");
    if (!business) {
      return res.status(404).json({ message: "Business not found." });
    }
    const branchFilter = await resolveBranchId(business._id, req.query.branchId);
    if (!branchFilter.ok) {
      return res.status(400).json({ message: branchFilter.message });
    }

    const catalogBranchFilter = getPublicCatalogBranchFilter(branchFilter.branchId);

    const [services, staff, branches] = await Promise.all([
      Service.find({ businessId: business._id, active: true, ...catalogBranchFilter }).sort({ sortOrder: 1, createdAt: -1 }),
      Staff.find({ businessId: business._id, availableForBooking: { $ne: false }, ...catalogBranchFilter }).select("-password").sort({ createdAt: -1 }),
      Branch.find({ businessId: business._id, active: true }).sort({ createdAt: 1 }),
    ]);

    return res.status(200).json({ business, services, staff, branches });
  } catch (error) {
    return next(error);
  }
};

exports.listPublicBookings = async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    const date = String(req.query.date || "").trim();

    if (!slug) {
      return res.status(400).json({ message: "Business slug is required." });
    }

    const business = await Business.findOne({ slug }).select("_id");
    if (!business) {
      return res.status(404).json({ message: "Business not found." });
    }
    const branchFilter = await resolveBranchId(business._id, req.query.branchId);
    if (!branchFilter.ok) {
      return res.status(400).json({ message: branchFilter.message });
    }

    const query = {
      businessId: business._id,
      status: { $ne: "cancelled" },
      ...(branchFilter.branchId !== undefined ? { branchId: branchFilter.branchId } : {}),
    };
    if (date) {
      query.date = date;
    }

    const bookings = await Booking.find(query).sort({ date: 1, time: 1, createdAt: -1 });
    return res.status(200).json(bookings);
  } catch (error) {
    return next(error);
  }
};

exports.createPublicBooking = async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    if (!slug) {
      return res.status(400).json({ message: "Business slug is required." });
    }

    const business = await Business.findOne({ slug }).select("_id defaultDuration name");
    if (!business) {
      return res.status(404).json({ message: "Business not found." });
    }

    const customerName = String(req.body.customer || "").trim();
    const date = String(req.body.date || "").trim();
    const time = String(req.body.time || "").trim();
    if (!customerName || !date || !time) {
      return res.status(400).json({ message: "Customer name, date, and time are required." });
    }

    const resolvedBranch = await resolveBranchId(business._id, req.body.branchId);
    if (!resolvedBranch.ok) {
      return res.status(400).json({ message: resolvedBranch.message });
    }

    const conflict = await Booking.findOne({
      businessId: business._id,
      branchId: resolvedBranch.branchId ?? null,
      date,
      time,
      status: { $ne: "cancelled" },
    });
    if (conflict) {
      return res.status(409).json({ message: "Selected time slot is not available." });
    }

    let serviceName = String(req.body.service || "Service").trim() || "Service";
    let price = Number(req.body.price || 0);
    let serviceId = null;

    if (req.body.serviceId) {
      const service = await Service.findOne({
        _id: req.body.serviceId,
        businessId: business._id,
        active: true,
      });
      if (!service) {
        return res.status(404).json({ message: "Service not found." });
      }
      serviceId = service._id;
      serviceName = service.name;
      price = Number(service.price || 0);
    }

    let staffName = String(req.body.staff || "").trim();
    let staffId = null;
    if (staffName) {
      const staff = await Staff.findOne({ businessId: business._id, name: staffName, availableForBooking: { $ne: false } });
      if (staff) {
        staffId = staff._id;
        staffName = staff.name;
      }
    }

    const booking = await Booking.create({
      businessId: business._id,
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
      status: "pending",
      price: Number.isFinite(price) ? Math.max(0, price) : 0,
      source: "public",
      notes: String(req.body.notes || ""),
    });

    const customer = await upsertCustomerFromBooking(
      business._id,
      { customer: customerName, email: booking.email, phone: booking.phone },
      booking.price,
      new Date(`${booking.date}T${booking.time}:00`),
      resolvedBranch.branchId ?? null,
    );

    booking.customerId = customer._id;
    await booking.save();

    if (booking.email) {
      const branch = booking.branchId
        ? await Branch.findOne({ _id: booking.branchId, businessId: business._id }).select("name address")
        : null;
      const notificationSettings = await getBranchNotificationSettings(business._id, booking.branchId);
      if (notificationSettings.customerConfirmation) {
        const result = await sendBookingConfirmationEmail({
          to: booking.email,
          companyName: business.name || "ManagelyHQ",
          customerName,
          serviceName: booking.service,
          date: booking.date,
          time: booking.time,
          branchName: branch?.name || "",
          branchAddress: branch?.address || "",
        });
        auditLog(result?.ok ? "notifications.email_sent" : "notifications.email_failed", {
          businessId: String(business._id),
          branchId: booking.branchId ? String(booking.branchId) : null,
          bookingId: String(booking._id),
          email: booking.email,
          purpose: "booking_confirmation",
          reason: result?.ok ? "" : String(result?.error || "delivery_failed"),
        });
      }
    }

    return res.status(201).json(booking);
  } catch (error) {
    return next(error);
  }
};
