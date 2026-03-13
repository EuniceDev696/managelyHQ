const mongoose = require("mongoose");
const Customer = require("./customers.schema");
const Booking = require("../bookings/bookings.schema");
const { getScopedBranchFilter } = require("../branches/branch-access.service");

const getBusinessId = (req) => req.auth?.sub || null;

const findScopedCustomer = async (req, customerId) => {
  const businessId = getBusinessId(req);
  const branchFilter = await getScopedBranchFilter(req, businessId, req.query.branchId);
  if (!branchFilter.ok) {
    return branchFilter;
  }

  const customer = await Customer.findOne({ _id: customerId, businessId, ...branchFilter.filter });
  if (!customer) {
    return { ok: false, status: 404, message: "Customer not found." };
  }

  return { ok: true, businessId, branchFilter, customer };
};

exports.listCustomers = async (req, res, next) => {
  try {
    const businessId = getBusinessId(req);
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const branchFilter = await getScopedBranchFilter(req, businessId, req.query.branchId);
    if (!branchFilter.ok) {
      return res.status(400).json({ message: branchFilter.message });
    }

    const customers = await Customer.find({ businessId, ...branchFilter.filter }).sort({ lastVisit: -1, createdAt: -1 });
    return res.status(200).json(customers);
  } catch (error) {
    return next(error);
  }
};

exports.getCustomerDetail = async (req, res, next) => {
  try {
    const businessId = getBusinessId(req);
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const { customerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "Invalid customer id." });
    }

    const scoped = await findScopedCustomer(req, customerId);
    if (!scoped.ok) {
      return res.status(scoped.status || 400).json({ message: scoped.message });
    }

    const bookings = await Booking.find({
      businessId,
      customerId: scoped.customer._id,
    }).sort({ date: -1, time: -1, createdAt: -1 }).limit(20);

    const statusCounts = bookings.reduce((acc, booking) => {
      const key = String(booking.status || "pending").toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const serviceCounts = bookings.reduce((acc, booking) => {
      const key = String(booking.service || "").trim();
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const favoriteServices = Object.entries(serviceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    return res.status(200).json({
      customer: scoped.customer,
      history: {
        bookings,
        counts: {
          total: bookings.length,
          completed: statusCounts.completed || 0,
          cancelled: statusCounts.cancelled || 0,
          pending: statusCounts.pending || 0,
          confirmed: statusCounts.confirmed || 0,
        },
        favoriteServices,
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const businessId = getBusinessId(req);
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const { customerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "Invalid customer id." });
    }

    const scoped = await findScopedCustomer(req, customerId);
    if (!scoped.ok) {
      return res.status(scoped.status || 400).json({ message: scoped.message });
    }

    if (req.body.notes !== undefined) {
      scoped.customer.notes = String(req.body.notes || "");
    }

    await scoped.customer.save();
    return res.status(200).json(scoped.customer);
  } catch (error) {
    return next(error);
  }
};
