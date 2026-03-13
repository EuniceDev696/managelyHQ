const mongoose = require("mongoose");
const Branch = require("./branches.schema");

exports.resolveBranchId = async (businessId, branchId) => {
  if (branchId === undefined) return { ok: true, branchId: undefined };
  if (branchId === null || branchId === "") return { ok: true, branchId: null };

  if (!mongoose.Types.ObjectId.isValid(branchId)) {
    return { ok: false, message: "Invalid branchId." };
  }

  const branch = await Branch.findOne({ _id: branchId, businessId }).select("_id");
  if (!branch) {
    return { ok: false, message: "Branch not found." };
  }

  return { ok: true, branchId: branch._id };
};

exports.getBranchFilter = async (businessId, branchId) => {
  const resolved = await exports.resolveBranchId(businessId, branchId);
  if (!resolved.ok) return resolved;
  if (resolved.branchId === undefined || resolved.branchId === null) {
    return { ok: true, filter: {} };
  }
  return { ok: true, filter: { branchId: resolved.branchId } };
};

exports.getScopedBranchFilter = async (req, businessId, requestedBranchId) => {
  const role = String(req.auth?.role || "").toLowerCase();
  const authBranchId = req.auth?.branchId || null;

  if (role === "staff" && authBranchId) {
    return exports.getBranchFilter(businessId, authBranchId);
  }

  return exports.getBranchFilter(businessId, requestedBranchId);
};
