const slugify = require("slugify");
const Business = require("../business/business.schema");
const { canAccessBranches } = require("../subscription/plan-limits.service");

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

exports.completeOnboarding = async (req, res, next) => {
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

    return res.status(200).json({
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
  } catch (error) {
    return next(error);
  }
};
