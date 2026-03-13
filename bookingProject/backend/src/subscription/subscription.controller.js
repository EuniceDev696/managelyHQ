const Business = require("../business/business.schema");
const Subscription = require("./subscription.schema");
const { sendSubscriptionExpiryWarningEmail } = require("../email/email-client");

exports.getSubscription = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    let subscription = await Subscription.findOne({ businessId });
    if (!subscription) {
      const business = await Business.findById(businessId).select("subscription");
      if (!business) {
        return res.status(404).json({ message: "Business not found." });
      }
      subscription = await Subscription.create({
        businessId,
        plan: business.subscription?.plan || "free",
        status: business.subscription?.status || "active",
        renewalDate: business.subscription?.renewalDate || null,
        trialEndsAt: business.subscription?.trialEndsAt || null,
      });
    }

    return res.status(200).json(subscription);
  } catch (error) {
    return next(error);
  }
};

exports.updateSubscription = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const plan = String(req.body.plan || "").toLowerCase();
    const status = String(req.body.status || "").toLowerCase() || "active";
    const renewalDate = req.body.renewalDate || null;
    const trialEndsAt = req.body.trialEndsAt || null;

    if (!["free", "growth", "pro"].includes(plan)) {
      return res.status(400).json({ message: "Invalid plan." });
    }
    if (!["active", "trialing", "expired", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid subscription status." });
    }

    await Business.findByIdAndUpdate(businessId, {
      $set: {
        "subscription.plan": plan,
        "subscription.status": status,
        "subscription.renewalDate": renewalDate,
        "subscription.trialEndsAt": trialEndsAt,
      },
    });

    await Subscription.findOneAndUpdate(
      { businessId },
      {
        $set: {
          plan,
          status,
          renewalDate,
          trialEndsAt,
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    const business = await Business.findById(businessId).select("-password");
    return res.status(200).json(business);
  } catch (error) {
    return next(error);
  }
};

exports.sendExpiryWarning = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
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

    const lastSent = subscription?.lastExpiryWarningSentAt ? new Date(subscription.lastExpiryWarningSentAt) : null;
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
