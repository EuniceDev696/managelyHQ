const Branch = require("./branches.schema");
const Staff = require("../staff/staff.schema");
const Service = require("../services/services.schema");
const Booking = require("../bookings/bookings.schema");
const Payment = require("../payments/payments.schema");
const Customer = require("../customers/customers.schema");
const Expense = require("../expenses/expenses.schema");
const AuditLog = require("../audit/audit.schema");
const { auditLog } = require("../utils/audit-log");
const { canAccessBranches } = require("../subscription/plan-limits.service");

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "branch";

const makeUniqueSlug = async (businessId, value, ignoreId = null) => {
  const base = slugify(value);
  let candidate = base;
  let counter = 1;

  while (true) {
    const existing = await Branch.findOne({ businessId, slug: candidate });
    if (!existing || (ignoreId && String(existing._id) === String(ignoreId))) {
      return candidate;
    }
    counter += 1;
    candidate = `${base}-${counter}`;
  }
};

const validateManagerStaff = async (businessId, managerStaffId, ignoreBranchId = null) => {
  if (managerStaffId === undefined) return { ok: true, managerStaffId: undefined };
  if (managerStaffId === null || managerStaffId === "") return { ok: true, managerStaffId: null };

  const manager = await Staff.findOne({ _id: managerStaffId, businessId }).select("_id role");
  if (!manager) {
    return { ok: false, message: "Selected manager does not belong to this business." };
  }

  if (!["manager", "admin"].includes(String(manager.role || "").toLowerCase())) {
    return { ok: false, message: "Branch manager must have a manager or admin role." };
  }

  const existingAssignment = await Branch.findOne({
    businessId,
    managerStaffId,
    ...(ignoreBranchId ? { _id: { $ne: ignoreBranchId } } : {}),
  }).select("_id name");

  if (existingAssignment) {
    return { ok: false, message: "This staff member is already assigned as another branch manager." };
  }

  return { ok: true, managerStaffId: manager._id };
};

const getBranchUsage = async (businessId, branchId) => {
  const [staffCount, servicesCount, bookingsCount, paymentsCount, customersCount, expensesCount] = await Promise.all([
    Staff.countDocuments({ businessId, branchId }),
    Service.countDocuments({ businessId, branchId }),
    Booking.countDocuments({ businessId, branchId }),
    Payment.countDocuments({ businessId, branchId }),
    Customer.countDocuments({ businessId, branchId }),
    Expense.countDocuments({ businessId, branchId }),
  ]);

  return {
    staff: staffCount,
    services: servicesCount,
    bookings: bookingsCount,
    payments: paymentsCount,
    customers: customersCount,
    expenses: expensesCount,
  };
};

const findBranchForBusiness = async (businessId, branchId) => Branch.findOne({ _id: branchId, businessId });
const normalizeNotificationSettings = (value = {}) => ({
  customerConfirmation: value.customerConfirmation !== false,
  customerReminder: value.customerReminder !== false,
  customerCancellation: value.customerCancellation !== false,
  customerReschedule: value.customerReschedule !== false,
  ownerNewBookingAlert: value.ownerNewBookingAlert !== false,
  staffAssignment: value.staffAssignment !== false,
  channels: {
    email: value.channels?.email !== false,
  },
});
const getBusinessNotificationDefaults = async (businessId) => {
  const business = await require("../business/business.schema").findById(businessId).select("notificationSettings");
  return normalizeNotificationSettings(business?.notificationSettings || {});
};

const getAuditActorMeta = (req) => ({
  businessId: String(req.auth?.sub || ""),
  email: String(req.auth?.email || "").toLowerCase(),
  role: String(req.auth?.role || "").toLowerCase(),
  staffId: req.auth?.staffId ? String(req.auth.staffId) : null,
  actorType: "branch_owner",
});

const ensureBranchAccess = async (businessId, res) => {
  const allowed = await canAccessBranches(businessId);
  if (!allowed) {
    res.status(403).json({ message: "Branches are available on the Pro plan only." });
    return false;
  }
  return true;
};

exports.listBranchActivity = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }
    if (!(await ensureBranchAccess(businessId, res))) {
      return;
    }

    const branchId = String(req.query.branchId || "").trim();
    const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 50);
    const query = {
      businessId,
      event: /^branches\./,
    };

    if (branchId) {
      query.$or = [
        { branchId },
        { "meta.branchId": branchId },
        { "meta.sourceBranchId": branchId },
        { "meta.targetBranchId": branchId },
      ];
    }

    const activity = await AuditLog.find(query).sort({ createdAt: -1 }).limit(limit);
    return res.status(200).json(activity);
  } catch (error) {
    return next(error);
  }
};

exports.listBranches = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }
    if (!(await ensureBranchAccess(businessId, res))) {
      return;
    }

    const branches = await Branch.find({ businessId }).sort({ createdAt: -1 });
    return res.status(200).json(branches);
  } catch (error) {
    return next(error);
  }
};

exports.createBranch = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }
    if (!(await ensureBranchAccess(businessId, res))) {
      return;
    }

    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ message: "Branch name is required." });
    }

    const managerValidation = await validateManagerStaff(businessId, req.body.managerStaffId);
    if (!managerValidation.ok) {
      return res.status(400).json({ message: managerValidation.message });
    }

    const defaultNotificationSettings = await getBusinessNotificationDefaults(businessId);
    const branch = await Branch.create({
      businessId,
      name,
      slug: await makeUniqueSlug(businessId, req.body.slug || name),
      address: String(req.body.address || "").trim(),
      phone: String(req.body.phone || "").trim(),
      email: String(req.body.email || "").trim().toLowerCase(),
      managerStaffId: managerValidation.managerStaffId ?? null,
      active: req.body.active !== undefined ? Boolean(req.body.active) : true,
      notificationSettings:
        req.body.notificationSettings !== undefined
          ? normalizeNotificationSettings(req.body.notificationSettings || {})
          : defaultNotificationSettings,
    });

    auditLog("branches.created", {
      ...getAuditActorMeta(req),
      branchId: String(branch._id),
      branchName: branch.name,
      managerStaffId: branch.managerStaffId ? String(branch.managerStaffId) : null,
      active: branch.active,
    });

    return res.status(201).json(branch);
  } catch (error) {
    return next(error);
  }
};

exports.updateBranch = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    const branchId = String(req.params.branchId || "");
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }
    if (!(await ensureBranchAccess(businessId, res))) {
      return;
    }

    const branch = await Branch.findOne({ _id: branchId, businessId });
    if (!branch) {
      return res.status(404).json({ message: "Branch not found." });
    }

    if (req.body.name !== undefined) {
      const name = String(req.body.name || "").trim();
      if (!name) {
        return res.status(400).json({ message: "Branch name cannot be empty." });
      }
      branch.name = name;
    }
    if (req.body.slug !== undefined) {
      branch.slug = await makeUniqueSlug(businessId, req.body.slug || branch.name, branch._id);
    }
    if (req.body.address !== undefined) branch.address = String(req.body.address || "").trim();
    if (req.body.phone !== undefined) branch.phone = String(req.body.phone || "").trim();
    if (req.body.email !== undefined) branch.email = String(req.body.email || "").trim().toLowerCase();
    if (req.body.managerStaffId !== undefined) {
      const managerValidation = await validateManagerStaff(businessId, req.body.managerStaffId, branch._id);
      if (!managerValidation.ok) {
        return res.status(400).json({ message: managerValidation.message });
      }
      branch.managerStaffId = managerValidation.managerStaffId;
    }
    if (req.body.active !== undefined) branch.active = Boolean(req.body.active);
    if (req.body.notificationSettings !== undefined) {
      branch.notificationSettings = normalizeNotificationSettings(req.body.notificationSettings || {});
    }

    const changedFields = Object.keys(req.body || {}).filter((key) => req.body[key] !== undefined);
    await branch.save();

    auditLog("branches.updated", {
      ...getAuditActorMeta(req),
      branchId: String(branch._id),
      branchName: branch.name,
      updatedFields: changedFields,
      active: branch.active,
      managerStaffId: branch.managerStaffId ? String(branch.managerStaffId) : null,
    });

    return res.status(200).json(branch);
  } catch (error) {
    return next(error);
  }
};

exports.reassignBranch = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    const branchId = String(req.params.branchId || "");
    const targetBranchId = String(req.body.targetBranchId || "");
    const deleteSource = req.body.deleteSource !== false;

    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }
    if (!(await ensureBranchAccess(businessId, res))) {
      return;
    }

    if (branchId === targetBranchId) {
      return res.status(400).json({ message: "Choose a different destination branch." });
    }

    const [sourceBranch, targetBranch] = await Promise.all([
      findBranchForBusiness(businessId, branchId),
      findBranchForBusiness(businessId, targetBranchId),
    ]);

    if (!sourceBranch) {
      return res.status(404).json({ message: "Source branch not found." });
    }
    if (!targetBranch) {
      return res.status(404).json({ message: "Target branch not found." });
    }

    const usage = await getBranchUsage(businessId, sourceBranch._id);

    await Promise.all([
      Staff.updateMany({ businessId, branchId: sourceBranch._id }, { $set: { branchId: targetBranch._id } }),
      Service.updateMany({ businessId, branchId: sourceBranch._id }, { $set: { branchId: targetBranch._id } }),
      Booking.updateMany({ businessId, branchId: sourceBranch._id }, { $set: { branchId: targetBranch._id } }),
      Payment.updateMany({ businessId, branchId: sourceBranch._id }, { $set: { branchId: targetBranch._id } }),
      Customer.updateMany({ businessId, branchId: sourceBranch._id }, { $set: { branchId: targetBranch._id } }),
      Expense.updateMany({ businessId, branchId: sourceBranch._id }, { $set: { branchId: targetBranch._id } }),
    ]);

    if (deleteSource) {
      await Branch.deleteOne({ _id: sourceBranch._id, businessId });
    }

    auditLog("branches.reassigned", {
      ...getAuditActorMeta(req),
      branchId: String(sourceBranch._id),
      branchName: sourceBranch.name,
      sourceBranchId: String(sourceBranch._id),
      sourceBranchName: sourceBranch.name,
      targetBranchId: String(targetBranch._id),
      targetBranchName: targetBranch.name,
      deleteSource,
      reassigned: usage,
    });

    return res.status(200).json({
      ok: true,
      sourceBranchId: String(sourceBranch._id),
      targetBranchId: String(targetBranch._id),
      deletedSource: deleteSource,
      reassigned: usage,
    });
  } catch (error) {
    return next(error);
  }
};

exports.deleteBranch = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    const branchId = String(req.params.branchId || "");
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }
    if (!(await ensureBranchAccess(businessId, res))) {
      return;
    }

    const branch = await Branch.findOne({ _id: branchId, businessId });
    if (!branch) {
      return res.status(404).json({ message: "Branch not found." });
    }

    const usage = await getBranchUsage(businessId, branch._id);
    if (Object.values(usage).some((count) => count > 0)) {
      return res.status(409).json({
        message: "This branch is in use. Reassign or remove linked records before deleting it.",
        usage,
      });
    }

    await Branch.deleteOne({ _id: branch._id, businessId });

    auditLog("branches.deleted", {
      ...getAuditActorMeta(req),
      branchId: String(branch._id),
      branchName: branch.name,
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return next(error);
  }
};
