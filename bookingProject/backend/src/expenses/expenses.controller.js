const Expense = require("./expenses.schema");
const { resolveBranchId, getScopedBranchFilter } = require("../branches/branch-access.service");

exports.listExpenses = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const branchFilter = await getScopedBranchFilter(req, businessId, req.query.branchId);
    if (!branchFilter.ok) {
      return res.status(400).json({ message: branchFilter.message });
    }
    const expenses = await Expense.find({ businessId, ...branchFilter.filter }).sort({ spentAt: -1, createdAt: -1 });
    return res.status(200).json(expenses);
  } catch (error) {
    return next(error);
  }
};

exports.createExpense = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const title = String(req.body.title || "").trim();
    const amount = Number(req.body.amount || 0);
    if (!title) {
      return res.status(400).json({ message: "Expense title is required." });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Expense amount must be greater than zero." });
    }
    const requestedBranchId = ["manager", "staff"].includes(String(req.auth?.role || "").toLowerCase())
      ? req.auth?.branchId || null
      : req.body.branchId;
    const resolvedBranch = await resolveBranchId(businessId, requestedBranchId);
    if (!resolvedBranch.ok) {
      return res.status(400).json({ message: resolvedBranch.message });
    }

    const expense = await Expense.create({
      businessId,
      branchId: resolvedBranch.branchId ?? null,
      title,
      amount,
      category: String(req.body.category || "general").trim() || "general",
      spentAt: req.body.spentAt || new Date(),
      notes: String(req.body.notes || ""),
      recordedBy: String(req.auth?.email || ""),
    });

    return res.status(201).json(expense);
  } catch (error) {
    return next(error);
  }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const businessId = req.auth?.sub;
    if (!businessId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const expenseId = String(req.params.expenseId || "");
    const expense = await Expense.findOne({ _id: expenseId, businessId });
    if (!expense) {
      return res.status(404).json({ message: "Expense not found." });
    }

    await Expense.deleteOne({ _id: expense._id, businessId });
    return res.status(200).json({ ok: true });
  } catch (error) {
    return next(error);
  }
};
