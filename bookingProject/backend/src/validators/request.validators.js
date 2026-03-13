const Joi = require("joi");

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);
const hexColor = Joi.string().pattern(/^#([0-9a-fA-F]{6})$/);
const slug = Joi.string().trim().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const bookingStatus = Joi.string().valid("pending", "confirmed", "completed", "cancelled", "no_show");
const paymentStatus = Joi.string().valid("pending", "success", "failed", "refunded");
const notificationChannels = Joi.object({
  email: Joi.boolean(),
});
const branchNotificationSettings = Joi.object({
  customerConfirmation: Joi.boolean(),
  customerReminder: Joi.boolean(),
  customerCancellation: Joi.boolean(),
  customerReschedule: Joi.boolean(),
  ownerNewBookingAlert: Joi.boolean(),
  staffAssignment: Joi.boolean(),
  channels: notificationChannels,
});

const withAtLeastOneKey = (schema) => schema.min(1);

exports.business = {
  register: {
    body: Joi.object({
      businessName: Joi.string().trim().allow(""),
      name: Joi.string().trim().allow(""),
      email: Joi.string().email().required(),
      password: Joi.string().min(1).required(),
      address: Joi.string().allow(""),
      businessType: Joi.string().trim().allow(""),
      hasBranches: Joi.boolean(),
      brandColor: hexColor.optional(),
      logo: Joi.string().allow(""),
      description: Joi.string().allow(""),
      notificationSettings: branchNotificationSettings,
    }).custom((value, helpers) => {
      if (!(value.businessName || value.name)) {
        return helpers.error("any.invalid");
      }
      return value;
    }, "Business name requirement")
      .messages({
        "any.invalid": "Either businessName or name is required.",
      }),
  },
  login: {
    body: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(1).required(),
    }),
  },
  updateMe: {
    body: withAtLeastOneKey(Joi.object({
      name: Joi.string().trim().min(1),
      type: Joi.string().trim(),
      brandColor: hexColor,
      logo: Joi.string().allow(""),
      description: Joi.string().allow(""),
      address: Joi.string().allow(""),
      phone: Joi.string().allow(""),
      currency: Joi.string().allow(""),
      timezone: Joi.string().allow(""),
      hasBranches: Joi.boolean(),
      bookingSlug: Joi.alternatives().try(slug, Joi.allow("")),
      defaultDuration: Joi.number().min(0),
      notificationSettings: branchNotificationSettings,
    })),
  },
  changePassword: {
    body: Joi.object({
      currentPassword: Joi.string().min(1).required(),
      newPassword: Joi.string().min(1).required(),
    }),
  },
  verifyEmail: {
    body: Joi.object({
      token: Joi.string().trim().allow(""),
      email: Joi.string().email().allow(""),
      otp: Joi.string().trim().pattern(/^\d{6}$/).allow(""),
    }).custom((value, helpers) => {
      if (value.token) {
        return value;
      }
      if (value.email && value.otp) {
        return value;
      }
      return helpers.error("any.invalid");
    }, "Verification token or OTP requirement")
      .messages({
        "any.invalid": "Provide either a verification token or both email and OTP.",
      }),
  },
  resendVerification: {
    body: Joi.object({
      email: Joi.string().email().required(),
    }),
  },
  notificationActivity: {
    query: Joi.object({
      branchId: objectId.allow(""),
      limit: Joi.number().integer().min(1).max(50),
    }),
  },
};

exports.onboarding = {
  complete: {
    body: withAtLeastOneKey(Joi.object({
      name: Joi.string().trim().min(1),
      type: Joi.string().trim(),
      brandColor: hexColor,
      logo: Joi.string().allow(""),
      description: Joi.string().allow(""),
      address: Joi.string().allow(""),
      phone: Joi.string().allow(""),
      currency: Joi.string().allow(""),
      timezone: Joi.string().allow(""),
      hasBranches: Joi.boolean(),
      bookingSlug: Joi.alternatives().try(slug, Joi.allow("")),
      defaultDuration: Joi.number().min(0),
      notificationSettings: branchNotificationSettings,
    })),
  },
};

exports.services = {
  list: {
    query: Joi.object({
      active: Joi.string().valid("true", "false"),
    }),
  },
  create: {
    body: Joi.object({
      name: Joi.string().trim().min(1).required(),
      branchId: objectId.allow(null, ""),
      duration: Joi.number().min(0),
      price: Joi.number().min(0),
      active: Joi.boolean(),
      image: Joi.string().allow(""),
      imagePublicId: Joi.string().allow(""),
      description: Joi.string().allow(""),
      sortOrder: Joi.number(),
    }),
  },
  update: {
    params: Joi.object({
      serviceId: objectId.required(),
    }),
    body: withAtLeastOneKey(Joi.object({
      name: Joi.string().trim().min(1),
      branchId: objectId.allow(null, ""),
      duration: Joi.number().min(0),
      price: Joi.number().min(0),
      active: Joi.boolean(),
      image: Joi.string().allow(""),
      imagePublicId: Joi.string().allow(""),
      description: Joi.string().allow(""),
      sortOrder: Joi.number(),
    })),
  },
  remove: {
    params: Joi.object({
      serviceId: objectId.required(),
    }),
  },
};

exports.staff = {
  create: {
    body: Joi.object({
      name: Joi.string().trim().min(1).required(),
      email: Joi.string().email().allow(""),
      branchId: objectId.allow(null, ""),
      password: Joi.string().allow(""),
      role: Joi.string().allow(""),
      availability: Joi.string().allow(""),
      services: Joi.array().items(objectId),
      availableForBooking: Joi.boolean(),
      active: Joi.boolean(),
    }),
  },
  update: {
    params: Joi.object({
      staffId: objectId.required(),
    }),
    body: withAtLeastOneKey(Joi.object({
      name: Joi.string().trim().min(1),
      email: Joi.string().email().allow(""),
      branchId: objectId.allow(null, ""),
      password: Joi.string().allow(""),
      role: Joi.string().allow(""),
      availability: Joi.string().allow(""),
      services: Joi.array().items(objectId),
      availableForBooking: Joi.boolean(),
      active: Joi.boolean(),
    })),
  },
  remove: {
    params: Joi.object({
      staffId: objectId.required(),
    }),
  },
};

exports.customers = {
  list: {
    query: Joi.object({
      branchId: objectId.allow(""),
    }),
  },
  detail: {
    params: Joi.object({
      customerId: objectId.required(),
    }),
  },
  update: {
    params: Joi.object({
      customerId: objectId.required(),
    }),
    body: withAtLeastOneKey(Joi.object({
      notes: Joi.string().allow(""),
    })),
  },
};

exports.bookings = {
  create: {
    body: Joi.object({
      customer: Joi.string().trim().min(1).required(),
      email: Joi.string().email().allow(""),
      phone: Joi.string().allow(""),
      branchId: objectId.allow(null, ""),
      serviceId: objectId.allow(null, ""),
      service: Joi.string().allow(""),
      staffId: objectId.allow(null, ""),
      staff: Joi.string().allow(""),
      date: Joi.string().trim().required(),
      time: Joi.string().trim().required(),
      status: bookingStatus,
      price: Joi.number().min(0),
      source: Joi.string().valid("owner", "public"),
      notes: Joi.string().allow(""),
    }),
  },
  update: {
    params: Joi.object({
      bookingId: objectId.required(),
    }),
    body: withAtLeastOneKey(Joi.object({
      customer: Joi.string().trim().min(1),
      email: Joi.string().email().allow(""),
      phone: Joi.string().allow(""),
      branchId: objectId.allow(null, ""),
      serviceId: objectId.allow(null, ""),
      service: Joi.string().allow(""),
      staffId: objectId.allow(null, ""),
      staff: Joi.string().allow(""),
      date: Joi.string().trim(),
      time: Joi.string().trim(),
      status: bookingStatus,
      price: Joi.number().min(0),
      source: Joi.string().valid("owner", "public"),
      notes: Joi.string().allow(""),
    })),
  },
  updateStatus: {
    params: Joi.object({
      bookingId: objectId.required(),
    }),
    body: Joi.object({
      status: bookingStatus.required(),
      paymentMethod: Joi.string().valid("cash", "bank_transfer", "pos_card", "online_card").allow(""),
    }),
  },
  remove: {
    params: Joi.object({
      bookingId: objectId.required(),
    }),
  },
  sendReminders: {
    body: Joi.object({
      date: Joi.string().trim().required(),
      branchId: objectId.allow(null, ""),
    }),
  },
  resendNotification: {
    params: Joi.object({
      bookingId: objectId.required(),
    }),
    body: Joi.object({
      purpose: Joi.string().valid("booking_confirmation", "booking_reminder").required(),
    }),
  },
};

exports.payments = {
  list: {
    query: Joi.object({
      status: paymentStatus,
      method: Joi.string().valid("cash", "bank_transfer", "pos_card", "online_card"),
    }),
  },
  initialize: {
    body: Joi.object({
      amount: Joi.number().greater(0).required(),
      email: Joi.string().email().required(),
      currency: Joi.string().length(3),
      purpose: Joi.string().valid("subscription_upgrade").required(),
      planId: Joi.string().valid("growth", "pro").required(),
      bookingId: objectId.allow(null, ""),
      customerId: objectId.allow(null, ""),
      customerName: Joi.string().allow(""),
      callbackUrl: Joi.string().uri().allow(""),
      notes: Joi.string().allow(""),
      metadata: Joi.object().unknown(true),
    }),
  },
  manual: {
    body: Joi.object({
      amount: Joi.number().greater(0).required(),
      method: Joi.string().valid("cash", "bank_transfer", "pos_card").required(),
      currency: Joi.string().length(3),
      branchId: objectId.allow(null, ""),
      bookingId: objectId.allow(null, ""),
      customerId: objectId.allow(null, ""),
      customerName: Joi.string().allow(""),
      reference: Joi.string().allow(""),
      channel: Joi.string().allow(""),
      notes: Joi.string().allow(""),
      metadata: Joi.object().unknown(true),
    }),
  },
  verify: {
    body: Joi.object({
      reference: Joi.string().trim().required(),
    }),
  },
  updateStatus: {
    params: Joi.object({
      paymentId: objectId.required(),
    }),
    body: Joi.object({
      status: paymentStatus.required(),
      notes: Joi.string().allow(""),
    }),
  },
};

exports.subscription = {
  update: {
    body: Joi.object({
      plan: Joi.string().valid("free", "growth", "pro").required(),
      status: Joi.string().valid("active", "trialing", "expired", "cancelled").required(),
      renewalDate: Joi.alternatives().try(Joi.string().isoDate(), Joi.allow(null, "")),
      trialEndsAt: Joi.alternatives().try(Joi.string().isoDate(), Joi.allow(null, "")),
    }),
  },
  sendWarning: {
    body: Joi.object({
      daysBefore: Joi.number().integer().min(1).max(30).default(3),
    }),
  },
};

exports.expenses = {
  list: {
    query: Joi.object({}),
  },
  activity: {
    query: Joi.object({
      branchId: objectId.allow(""),
      limit: Joi.number().integer().min(1).max(50),
    }),
  },
  create: {
    body: Joi.object({
      title: Joi.string().trim().min(1).required(),
      amount: Joi.number().greater(0).required(),
      branchId: objectId.allow(null, ""),
      category: Joi.string().allow(""),
      spentAt: Joi.alternatives().try(Joi.string().isoDate(), Joi.date(), Joi.allow(null, "")),
      notes: Joi.string().allow(""),
    }),
  },
  remove: {
    params: Joi.object({
      expenseId: objectId.required(),
    }),
  },
};

exports.branches = {
  list: {
    query: Joi.object({}),
  },
  create: {
    body: Joi.object({
      name: Joi.string().trim().min(1).required(),
      slug: Joi.string().trim().allow(""),
      address: Joi.string().allow(""),
      phone: Joi.string().allow(""),
      email: Joi.string().email().allow(""),
      managerStaffId: objectId.allow(null, ""),
      active: Joi.boolean(),
      notificationSettings: branchNotificationSettings,
    }),
  },
  update: {
    params: Joi.object({
      branchId: objectId.required(),
    }),
    body: withAtLeastOneKey(Joi.object({
      name: Joi.string().trim().min(1),
      slug: Joi.string().trim().allow(""),
      address: Joi.string().allow(""),
      phone: Joi.string().allow(""),
      email: Joi.string().email().allow(""),
      managerStaffId: objectId.allow(null, ""),
      active: Joi.boolean(),
      notificationSettings: branchNotificationSettings,
    })),
  },
  remove: {
    params: Joi.object({
      branchId: objectId.required(),
    }),
  },
  reassign: {
    params: Joi.object({
      branchId: objectId.required(),
    }),
    body: Joi.object({
      targetBranchId: objectId.required(),
      deleteSource: Joi.boolean(),
    }),
  },
};

exports.public = {
  listBookings: {
    params: Joi.object({
      slug: slug.required(),
    }),
    query: Joi.object({
      date: Joi.string().trim().allow(""),
    }),
  },
  createBooking: {
    params: Joi.object({
      slug: slug.required(),
    }),
    body: Joi.object({
      customer: Joi.string().trim().min(1).required(),
      email: Joi.string().email().allow(""),
      phone: Joi.string().allow(""),
      serviceId: objectId.allow(null, ""),
      service: Joi.string().allow(""),
      staff: Joi.string().allow(""),
      date: Joi.string().trim().required(),
      time: Joi.string().trim().required(),
      price: Joi.number().min(0),
      notes: Joi.string().allow(""),
    }),
  },
};
