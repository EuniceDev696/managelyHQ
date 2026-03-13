const { randomUUID } = require("crypto");
const mongoose = require("mongoose");
const Staff = require("./staff.schema");
const Booking = require("../bookings/bookings.schema");
const Business = require("../business/business.schema");
const { getPlanLimit } = require("../subscription/plan-limits.service");
const { hashStaffPassword } = require("../auth/staff-password.service");
const { sendVerificationEmail } = require("../email/email-client");
const { createEmailVerification, buildVerificationLink } = require("../auth/email-verification.service");
const { resolveBranchId, getScopedBranchFilter } = require("../branches/branch-access.service");

const normalizeRole = (role) => {
  const value = String(role || "").toLowerCase().trim();
  if (value === "owner") return "owner";
  if (value === "admin") return "admin";
  if (value === "manager") return "manager";
  return "staff";
};

const actorCanGrantLoginAccess = (req) => normalizeRole(req.auth?.role) === "owner";

exports.listStaff = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const branchFilter = await getScopedBranchFilter(req, businessId, req.query.branchId);
    if (!branchFilter.ok) {
      return res.status(400).json({ message: branchFilter.message });
    }

    const staff = await Staff.find({ businessId, ...branchFilter.filter }).select("-password").sort({ createdAt: -1 });
    return res.status(200).json(staff);
  } catch (error) {
    return next(error);
  }
};

exports.createStaff = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const canGrantLoginAccess = actorCanGrantLoginAccess(req);
    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ message: "Staff name is required." });
    }

    const staffLimit = await getPlanLimit(businessId, "staff");
    if (Number.isFinite(staffLimit)) {
      const count = await Staff.countDocuments({ businessId });
      if (count >= staffLimit) {
        return res.status(403).json({ message: `Your current plan allows up to ${staffLimit} staff accounts.` });
      }
    }

    const requestedEmail = req.body.email ? String(req.body.email).toLowerCase().trim() : "";
    if (!canGrantLoginAccess && requestedEmail) {
      return res.status(403).json({ message: "Only the owner can give staff login access." });
    }
    if (!canGrantLoginAccess && req.body.password !== undefined && String(req.body.password || "").trim()) {
      return res.status(403).json({ message: "Only the owner can set staff login credentials." });
    }
    if (!canGrantLoginAccess && req.body.active !== undefined && Boolean(req.body.active) !== false) {
      return res.status(403).json({ message: "Only the owner can enable staff login access." });
    }

    const email = canGrantLoginAccess && requestedEmail ? requestedEmail : undefined;
    if (email) {
      const duplicate = await Staff.findOne({ businessId, email });
      if (duplicate) {
        return res.status(409).json({ message: "Email already in use for this business." });
      }
    }

    const validServices = Array.isArray(req.body.services)
      ? req.body.services.filter((id) => mongoose.Types.ObjectId.isValid(id))
      : [];
    const requestedBranchId = ["staff"].includes(String(req.auth?.role || "").toLowerCase())
      ? req.auth?.branchId || null
      : req.body.branchId;
    const resolvedBranch = await resolveBranchId(businessId, requestedBranchId);
    if (!resolvedBranch.ok) {
      return res.status(400).json({ message: resolvedBranch.message });
    }

    const shouldEnableLogin = Boolean(
      canGrantLoginAccess && email && (req.body.active !== undefined ? Boolean(req.body.active) : true),
    );
    const passwordInput = canGrantLoginAccess && shouldEnableLogin ? String(req.body.password || "staff123") : randomUUID();
    const verification = email ? createEmailVerification() : null;

    const staff = await Staff.create({
      businessId,
      branchId: resolvedBranch.branchId ?? null,
      name,
      email,
      emailVerified: !email,
      emailVerificationTokenHash: verification?.tokenHash || "",
      emailVerificationOtpHash: verification?.otpHash || "",
      emailVerificationExpiresAt: verification?.expiresAt || null,
      password: await hashStaffPassword(passwordInput),
      mustChangePassword: shouldEnableLogin,
      role: normalizeRole(req.body.role),
      availability: req.body.availability || "Mon - Fri",
      services: validServices,
      availableForBooking: req.body.availableForBooking !== false,
      active: shouldEnableLogin,
    });

    const output = staff.toObject();
    delete output.password;

    if (shouldEnableLogin && email) {
      const business = await Business.findById(businessId).select("name");
      sendVerificationEmail({
        to: email,
        companyName: business?.name || "ManagelyHQ",
        staffName: staff.name,
        temporaryPassword: passwordInput,
        verificationLink: buildVerificationLink(verification.token, email),
        verificationOtp: verification.otp,
      });
    }

    return res.status(201).json(output);
  } catch (error) {
    return next(error);
  }
};

exports.updateStaff = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const canGrantLoginAccess = actorCanGrantLoginAccess(req);
    const { staffId } = req.params;
    if (!staffId || !mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({ message: "Invalid staff id." });
    }

    const staff = await Staff.findOne({ _id: staffId, businessId });
    if (!staff) {
      return res.status(404).json({ message: "Staff member not found." });
    }

    if (req.body.name !== undefined) {
      const name = String(req.body.name || "").trim();
      if (!name) return res.status(400).json({ message: "Staff name cannot be empty." });
      staff.name = name;
    }

    if (req.body.email !== undefined) {
      if (!canGrantLoginAccess && String(req.body.email || "").trim()) {
        return res.status(403).json({ message: "Only the owner can give staff login access." });
      }
      const email = String(req.body.email || "").toLowerCase().trim();
      if (email && email !== staff.email) {
        const duplicate = await Staff.findOne({ businessId, email, _id: { $ne: staff._id } });
        if (duplicate) {
          return res.status(409).json({ message: "Email already in use for this business." });
        }
      }
      staff.email = email || undefined;
    }

    if (req.body.password !== undefined) {
      if (!canGrantLoginAccess) {
        return res.status(403).json({ message: "Only the owner can set staff login credentials." });
      }
      staff.password = await hashStaffPassword(String(req.body.password || ""));
      staff.mustChangePassword = true;
    }

    if (req.body.branchId !== undefined) {
      const requestedBranchId = ["staff"].includes(String(req.auth?.role || "").toLowerCase())
        ? req.auth?.branchId || null
        : req.body.branchId;
      const resolvedBranch = await resolveBranchId(businessId, requestedBranchId);
      if (!resolvedBranch.ok) {
        return res.status(400).json({ message: resolvedBranch.message });
      }
      staff.branchId = resolvedBranch.branchId;
    }

    if (req.body.role !== undefined) {
      staff.role = normalizeRole(req.body.role);
    }

    if (req.body.availability !== undefined) {
      staff.availability = String(req.body.availability || "");
    }

    if (req.body.services !== undefined) {
      staff.services = Array.isArray(req.body.services)
        ? req.body.services.filter((id) => mongoose.Types.ObjectId.isValid(id))
        : [];
    }

    if (req.body.availableForBooking !== undefined) {
      staff.availableForBooking = Boolean(req.body.availableForBooking);
    }

    if (req.body.active !== undefined) {
      if (!canGrantLoginAccess) {
        return res.status(403).json({ message: "Only the owner can enable or disable staff login access." });
      }
      staff.active = Boolean(req.body.active);
    }

    await staff.save();
    const output = staff.toObject();
    delete output.password;
    return res.status(200).json(output);
  } catch (error) {
    return next(error);
  }
};

exports.deleteStaff = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const { staffId } = req.params;
    if (!staffId || !mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({ message: "Invalid staff id." });
    }

    const staff = await Staff.findOne({ _id: staffId, businessId });
    if (!staff) {
      return res.status(404).json({ message: "Staff member not found." });
    }

    await Staff.deleteOne({ _id: staff._id, businessId });
    await Booking.updateMany({ businessId, staffId: staff._id }, { $set: { staffId: null, staff: "" } });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return next(error);
  }
};
