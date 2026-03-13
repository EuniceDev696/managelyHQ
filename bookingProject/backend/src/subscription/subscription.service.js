const Business = require("../business/business.schema");
const Subscription = require("./subscription.schema");

const isExpiredPaidSubscription = (subscription = {}) => {
  const plan = String(subscription.plan || "").toLowerCase();
  const renewalDate = subscription.renewalDate ? new Date(subscription.renewalDate) : null;

  if (!["growth", "pro"].includes(plan)) return false;
  if (!(renewalDate instanceof Date) || Number.isNaN(renewalDate.getTime())) return false;

  return renewalDate.getTime() <= Date.now();
};

const buildExpiredFreeState = () => ({
  plan: "free",
  status: "expired",
  renewalDate: null,
  trialEndsAt: null,
});

exports.syncExpiredSubscription = async (businessId) => {
  if (!businessId) return null;

  const business = await Business.findById(businessId).select("subscription");
  if (!business) return null;

  if (!isExpiredPaidSubscription(business.subscription)) {
    return business.subscription || null;
  }

  const nextSubscription = buildExpiredFreeState();

  await Business.updateOne(
    { _id: businessId },
    {
      $set: {
        "subscription.plan": nextSubscription.plan,
        "subscription.status": nextSubscription.status,
        "subscription.renewalDate": nextSubscription.renewalDate,
        "subscription.trialEndsAt": nextSubscription.trialEndsAt,
      },
    },
  );

  await Subscription.findOneAndUpdate(
    { businessId },
    { $set: nextSubscription },
    { upsert: true, returnDocument: "after" },
  );

  return nextSubscription;
};
