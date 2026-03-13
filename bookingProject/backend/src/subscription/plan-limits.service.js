const Business = require("../business/business.schema");

const PLANS = {
  free: { limits: { services: 3, staff: 2 } },
  growth: { limits: { services: Infinity, staff: Infinity } },
  pro: { limits: { services: Infinity, staff: Infinity } },
};

const getPlanConfig = (planId = "free") => PLANS[String(planId || "free").toLowerCase()] || PLANS.free;

const getCurrentPlan = async (businessId) => {
  const business = await Business.findById(businessId).select("subscription.plan");
  return String(business?.subscription?.plan || "free").toLowerCase();
};

exports.getCurrentPlan = getCurrentPlan;
exports.canAccessBranches = async (businessId) => {
  const plan = await getCurrentPlan(businessId);
  return plan === "pro";
};

exports.getPlanLimit = async (businessId, key) => {
  const plan = await getCurrentPlan(businessId);
  const value = getPlanConfig(plan)?.limits?.[key];
  return value === undefined ? 0 : value;
};
