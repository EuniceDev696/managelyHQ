const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const slugify = require("slugify");
const Business = require("./business.schema");
const Service = require("../services/services.schema");
const Staff = require("../staff/staff.schema");
const Booking = require("../bookings/bookings.schema");
const Customer = require("../customers/customers.schema");
const Payment = require("../payments/payments.schema");
const Expense = require("../expenses/expenses.schema");
const Branch = require("../branches/branches.schema");
const Subscription = require("../subscription/subscription.schema");
const AuditLog = require("../audit/audit.schema");
const { deleteImage } = require("../uploads/cloudinary.service");
const { verifyStaffPassword } = require("../auth/staff-password.service");
const rateLimit = require("../middleware/rate-limit.middleware");
const { auditLog } = require("../utils/audit-log");
const { getScopedBranchFilter } = require("../branches/branch-access.service");
const { canAccessBranches } = require("../subscription/plan-limits.service");
const { sendOwnerWelcomeEmail, sendVerificationEmail } = require("../email/email-client");
const {
  createEmailVerification,
  hashEmailVerificationToken,
  hashEmailVerificationOtp,
  buildVerificationLink,
} = require("../auth/email-verification.service");

const issueToken = (business, overrides = {}) =>
  jwt.sign(
    {
      sub: business._id.toString(),
      role: overrides.role || "owner",
      email: overrides.email || business.email,
      staffId: overrides.staffId || null,
      branchId: overrides.branchId || null,
    },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );

const toAuthUser = (business, staff = null) => ({
  id: staff?._id || business._id,
  businessId: business._id,
  name: staff?.name || business.name,
  email: staff?.email || business.email,
  role: staff?.role || "owner",
  forcePasswordReset: Boolean(staff?.mustChangePassword),
  branchId: staff?.branchId || null,
});

const toBusinessPayload = (business) => ({
  _id: business._id,
  name: business.name,
  email: business.email,
  type: business.type,
  brandColor: business.brandColor,
  logo: business.logo,
  description: business.description,
  address: business.address,
  phone: business.phone,
  currency: business.currency,
  timezone: business.timezone,
  hasBranches: business.hasBranches === true,
  slug: business.slug,
  bookingSlug: business.slug,
  defaultDuration: business.defaultDuration,
  subscription: business.subscription,
  notificationSettings: normalizeNotificationSettings(business.notificationSettings || {}),
  createdAt: business.createdAt,
  updatedAt: business.updatedAt,
});

const makeUniqueSlug = async (value, ignoreId = null) => {
  const base = slugify(value || "business", { lower: true, strict: true }) || "business";
  let candidate = base;
  let counter = 1;

  while (true) {
    const existing = await Business.findOne({ slug: candidate });
    if (!existing || (ignoreId && existing._id.toString() === ignoreId.toString())) {
      return candidate;
    }
    counter += 1;
    candidate = `${base}-${counter}`;
  }
};

const assignEmailVerification = (record) => {
  const verification = createEmailVerification();
  record.emailVerified = false;
  record.emailVerificationTokenHash = verification.tokenHash;
  record.emailVerificationOtpHash = verification.otpHash;
  record.emailVerificationExpiresAt = verification.expiresAt;
  return verification;
};

const clearEmailVerification = (record) => {
  record.emailVerified = true;
  record.emailVerificationTokenHash = "";
  record.emailVerificationOtpHash = "";
  record.emailVerificationExpiresAt = null;
};

const sendVerification = ({ email, companyName, token, otp, staffName = "", temporaryPassword = "" }) =>
  sendVerificationEmail({
    to: email,
    companyName,
    verificationLink: buildVerificationLink(token, email),
    verificationOtp: otp,
    staffName,
    temporaryPassword,
  }).then((result) => {
    if (!result?.ok) {
      throw new Error(result?.error || "Verification email could not be sent.");
    }
    return result;
  });

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

const getAuthIdentityKey = (email, req) => {
  const ip = String(req.ip || req.headers["x-forwarded-for"] || "unknown");
  const normalizedEmail = String(email || "").toLowerCase().trim();
  return normalizedEmail ? `${ip}:${normalizedEmail}` : ip;
};

const clearLoginAttempts = (req, email) => {
  rateLimit.reset("auth-login", getAuthIdentityKey(email, req));
};

exports.register = async (req, res, next) => {
  try {
    const {
      businessName,
      name,
      email,
      password,
      address,
      businessType,
      brandColor,
      logo,
      description,
      hasBranches,
    } = req.body;

    if (!email || !password || !(businessName || name)) {
      return res.status(400).json({ message: "Business name, email, and password are required." });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await Business.findOne({ email: normalizedEmail });
    if (existing) {
      auditLog("auth.register_conflict", { email: normalizedEmail });
      return res.status(409).json({ message: "Email already in use." });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const finalName = (businessName || name).trim();
    const slug = await makeUniqueSlug(finalName);
    const verification = createEmailVerification();

    const business = await Business.create({
      name: finalName,
      email: normalizedEmail,
      emailVerified: false,
      emailVerificationTokenHash: verification.tokenHash,
      emailVerificationOtpHash: verification.otpHash,
      emailVerificationExpiresAt: verification.expiresAt,
      password: hashedPassword,
      type: businessType || "Other",
      brandColor: brandColor || "#18c491",
      logo: logo || "",
      description: description || "Premium service business",
      address: address || "",
      phone: "",
      currency: "NGN",
      timezone: "Africa/Lagos",
      hasBranches: hasBranches === true,
      slug,
      defaultDuration: 30,
      notificationSettings: normalizeNotificationSettings(),
      subscription: {
        plan: "free",
        status: "active",
        renewalDate: null,
        trialEndsAt: null,
      },
    });

    auditLog("auth.register_success", {
      businessId: String(business._id),
      email: normalizedEmail,
      role: "owner",
    });
    await sendVerification({
      email: normalizedEmail,
      companyName: business.name,
      token: verification.token,
      otp: verification.otp,
    });
    return res.status(201).json({
      requiresEmailVerification: true,
      message: "Account created. Check your email to verify your account before signing in.",
    });
  } catch (error) {
    return next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const business = await Business.findOne({ email: normalizedEmail });
    if (business) {
      if (!business.emailVerified) {
        auditLog("auth.login_blocked", {
          businessId: String(business._id),
          email: normalizedEmail,
          reason: "email_not_verified",
          actorType: "owner",
        });
        return res.status(403).json({ message: "Please verify your email before signing in." });
      }
      const validPassword = await bcrypt.compare(String(password), business.password);
      if (!validPassword) {
        auditLog("auth.login_failed", { email: normalizedEmail, actorType: "owner" });
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const token = issueToken(business);
      clearLoginAttempts(req, normalizedEmail);
      auditLog("auth.login_success", {
        businessId: String(business._id),
        email: normalizedEmail,
        role: "owner",
      });
      return res.status(200).json({ token, business: toAuthUser(business) });
    }

    const staff = await Staff.findOne({ email: normalizedEmail, active: true });
    if (!staff) {
      auditLog("auth.login_failed", { email: normalizedEmail, actorType: "unknown" });
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!staff.emailVerified) {
      auditLog("auth.login_blocked", {
        businessId: String(staff.businessId || ""),
        staffId: String(staff._id || ""),
        email: normalizedEmail,
        reason: "email_not_verified",
        actorType: "staff",
      });
      return res.status(403).json({ message: "Please verify your email before signing in." });
    }

    const passwordCheck = await verifyStaffPassword(staff.password, password);
    if (!passwordCheck.valid) {
      auditLog("auth.login_failed", {
        email: normalizedEmail,
        actorType: "staff",
        businessId: String(staff.businessId || ""),
      });
      return res.status(401).json({ message: "Invalid email or password." });
    }
    if (passwordCheck.upgradedHash) {
      staff.password = passwordCheck.upgradedHash;
      await staff.save();
    }

    const parentBusiness = await Business.findById(staff.businessId);
    if (!parentBusiness) {
      return res.status(404).json({ message: "Business not found." });
    }

    const token = issueToken(parentBusiness, {
      role: staff.role || "staff",
      email: staff.email || parentBusiness.email,
      staffId: staff._id.toString(),
      branchId: staff.branchId ? staff.branchId.toString() : null,
    });
    clearLoginAttempts(req, normalizedEmail);
    auditLog("auth.login_success", {
      businessId: String(parentBusiness._id),
      staffId: String(staff._id),
      email: normalizedEmail,
      role: staff.role || "staff",
      forcePasswordReset: Boolean(staff.mustChangePassword),
    });
    return res.status(200).json({ token, business: toAuthUser(parentBusiness, staff) });
  } catch (error) {
    return next(error);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const token = String(req.body.token || "").trim();
    const email = String(req.body.email || "").toLowerCase().trim();
    const otp = String(req.body.otp || "").trim();
    const now = new Date();

    const businessQuery = token
      ? {
          emailVerificationTokenHash: hashEmailVerificationToken(token),
          emailVerificationExpiresAt: { $gt: now },
        }
      : {
          email,
          emailVerificationOtpHash: hashEmailVerificationOtp(otp),
          emailVerificationExpiresAt: { $gt: now },
        };

    let business = await Business.findOne(businessQuery);

    if (business) {
      clearEmailVerification(business);
      await business.save();
      const authToken = issueToken(business);
      auditLog("auth.email_verified", {
        businessId: String(business._id),
        email: business.email,
        method: token ? "link" : "otp",
        actorType: "owner",
      });
      sendOwnerWelcomeEmail({ to: business.email, companyName: business.name });
      return res.status(200).json({
        ok: true,
        actorType: "owner",
        email: business.email,
        token: authToken,
        business: toAuthUser(business),
      });
    }

    if (token && email) {
      business = await Business.findOne({ email });
      if (business?.emailVerified) {
        const authToken = issueToken(business);
        return res.status(200).json({
          ok: true,
          actorType: "owner",
          email: business.email,
          token: authToken,
          business: toAuthUser(business),
        });
      }
    }

    const staffQuery = token
      ? {
          emailVerificationTokenHash: hashEmailVerificationToken(token),
          emailVerificationExpiresAt: { $gt: now },
        }
      : {
          email,
          emailVerificationOtpHash: hashEmailVerificationOtp(otp),
          emailVerificationExpiresAt: { $gt: now },
        };

    let staff = await Staff.findOne(staffQuery);

    if (!staff && token && email) {
      staff = await Staff.findOne({ email });
      if (staff?.emailVerified) {
        const parentBusiness = await Business.findById(staff.businessId);
        if (!parentBusiness) {
          return res.status(404).json({ message: "Business not found." });
        }
        const authToken = issueToken(parentBusiness, {
          role: staff.role || "staff",
          email: staff.email || parentBusiness.email,
          staffId: staff._id.toString(),
          branchId: staff.branchId ? staff.branchId.toString() : null,
        });
        return res.status(200).json({
          ok: true,
          actorType: "staff",
          email: staff.email,
          token: authToken,
          business: toAuthUser(parentBusiness, staff),
        });
      }
    }

    if (!staff) {
      return res.status(400).json({ message: token ? "Verification link is invalid or has expired." : "Verification code is invalid or has expired." });
    }

    clearEmailVerification(staff);
    await staff.save();
    const parentBusiness = await Business.findById(staff.businessId);
    if (!parentBusiness) {
      return res.status(404).json({ message: "Business not found." });
    }
    const authToken = issueToken(parentBusiness, {
      role: staff.role || "staff",
      email: staff.email || parentBusiness.email,
      staffId: staff._id.toString(),
      branchId: staff.branchId ? staff.branchId.toString() : null,
    });
    auditLog("auth.email_verified", {
      businessId: String(staff.businessId),
      staffId: String(staff._id),
      email: staff.email,
      method: token ? "link" : "otp",
      actorType: "staff",
    });

    return res.status(200).json({
      ok: true,
      actorType: "staff",
      email: staff.email,
      token: authToken,
      business: toAuthUser(parentBusiness, staff),
    });
  } catch (error) {
    return next(error);
  }
};

exports.resendVerificationEmail = async (req, res, next) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    const business = await Business.findOne({ email });
    if (business) {
      if (business.emailVerified) {
        return res.status(200).json({ ok: true, message: "Email is already verified." });
      }
      const verification = assignEmailVerification(business);
      await business.save();
      await sendVerification({
        email,
        companyName: business.name,
        token: verification.token,
        otp: verification.otp,
      });
      auditLog("auth.verification_resent", {
        businessId: String(business._id),
        email,
        actorType: "owner",
      });
      return res.status(200).json({ ok: true, message: "Verification email sent." });
    }

    const staff = await Staff.findOne({ email });
    if (!staff) {
      return res.status(404).json({ message: "Account not found." });
    }
    if (staff.emailVerified) {
      return res.status(200).json({ ok: true, message: "Email is already verified." });
    }

    const parentBusiness = await Business.findById(staff.businessId).select("name");
    const verification = assignEmailVerification(staff);
    await staff.save();
    await sendVerification({
      email,
      companyName: parentBusiness?.name || "ManagelyHQ",
      token: verification.token,
      otp: verification.otp,
      staffName: staff.name,
    });
    auditLog("auth.verification_resent", {
      businessId: String(staff.businessId),
      staffId: String(staff._id),
      email,
      actorType: "staff",
    });
    return res.status(200).json({ ok: true, message: "Verification email sent." });
  } catch (error) {
    return next(error);
  }
};

exports.getBusinessMe = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const business = await Business.findById(businessId).select("-password");
    if (!business) {
      return res.status(404).json({ message: "Business not found." });
    }

    return res.status(200).json(toBusinessPayload(business));
  } catch (error) {
    return next(error);
  }
};

exports.listNotificationActivity = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const scopedBranch = await getScopedBranchFilter(req, businessId, req.query.branchId);
    if (!scopedBranch.ok) {
      return res.status(400).json({ message: scopedBranch.message });
    }

    const limit = Math.min(Math.max(Number(req.query.limit || 8), 1), 50);
    const baseQuery = {
      businessId,
      event: { $in: ["notifications.email_sent", "notifications.email_failed"] },
      ...scopedBranch.filter,
    };

    const [items, sent, failed] = await Promise.all([
      AuditLog.find(baseQuery).sort({ createdAt: -1 }).limit(limit),
      AuditLog.countDocuments({ ...baseQuery, event: "notifications.email_sent" }),
      AuditLog.countDocuments({ ...baseQuery, event: "notifications.email_failed" }),
    ]);

    return res.status(200).json({
      items,
      summary: {
        sent,
        failed,
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateBusinessMe = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ message: "Business not found." });
    }

    const allowed = [
      "name",
      "type",
      "brandColor",
      "logo",
      "description",
      "address",
      "phone",
      "currency",
      "timezone",
      "hasBranches",
      "defaultDuration",
      "notificationSettings",
    ];

    if (req.body.hasBranches === true && !(await canAccessBranches(businessId))) {
      return res.status(403).json({ message: "Branches are available on the Pro plan only." });
    }

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        business[key] = key === "notificationSettings" ? normalizeNotificationSettings(req.body[key] || {}) : req.body[key];
      }
    }

    if (req.body.bookingSlug !== undefined) {
      const nextSlug = String(req.body.bookingSlug || "").trim().toLowerCase();
      business.slug = nextSlug ? await makeUniqueSlug(nextSlug, business._id) : await makeUniqueSlug(business.name, business._id);
    } else if (req.body.name) {
      business.slug = await makeUniqueSlug(req.body.name, business._id);
    }

    await business.save();
    auditLog("business.updated", {
      businessId: String(business._id),
      updatedFields: allowed.filter((key) => req.body[key] !== undefined).concat(req.body.bookingSlug !== undefined ? ["bookingSlug"] : []),
    });
    return res.status(200).json(toBusinessPayload(business));
  } catch (error) {
    return next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required." });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ message: "Business not found." });
    }

    const matches = await bcrypt.compare(currentPassword, business.password);
    if (!matches) {
      auditLog("auth.password_change_failed", { businessId: String(businessId), reason: "invalid_current_password" });
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    business.password = await bcrypt.hash(newPassword, 10);
    await business.save();
    auditLog("auth.password_change_success", { businessId: String(businessId), role: "owner" });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return next(error);
  }
};

exports.changeStaffPassword = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    const staffId = req.auth?.staffId;
    if (!businessId || !staffId) {
      return res.status(401).json({ message: "Staff authentication required." });
    }

    const newPassword = String(req.body.newPassword || "");
    if (!newPassword) {
      return res.status(400).json({ message: "New password is required." });
    }

    const staff = await Staff.findOne({ _id: staffId, businessId, active: true });
    if (!staff) {
      auditLog("auth.staff_password_change_failed", {
        businessId: String(businessId),
        staffId: String(staffId),
        reason: "staff_not_found",
      });
      return res.status(404).json({ message: "Staff account not found." });
    }

    staff.password = await bcrypt.hash(newPassword, 10);
    staff.mustChangePassword = false;
    await staff.save();
    auditLog("auth.staff_password_change_success", {
      businessId: String(businessId),
      staffId: String(staff._id),
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return next(error);
  }
};

exports.deleteBusinessMe = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const services = await Service.find({ businessId }).select("imagePublicId");
    await Promise.all(services.map((service) => deleteImage(service.imagePublicId || "").catch(() => null)));

    await Promise.all([
      Booking.deleteMany({ businessId }),
      Customer.deleteMany({ businessId }),
      Payment.deleteMany({ businessId }),
      Expense.deleteMany({ businessId }),
      Branch.deleteMany({ businessId }),
      Service.deleteMany({ businessId }),
      Staff.deleteMany({ businessId }),
      Subscription.deleteMany({ businessId }),
      Business.deleteOne({ _id: businessId }),
    ]);
    auditLog("business.deleted", { businessId: String(businessId) });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return next(error);
  }
};
