import { AnimatePresence, motion, useInView } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useAppStore } from "../../store/useAppStore";
import { api } from "../../utils/api";
import { formatCurrency } from "../../utils/formatters";
import { canAccessBranchesPlan } from "../../utils/plans";

function AnimatedValue({ value }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 900;
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = progress * (2 - progress);
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, value]);

  return <span ref={ref}>{formatCurrency(display)}</span>;
}

const isSubscriptionPayment = (payment) => payment?.metadata?.purpose === "subscription_upgrade";
const expenseCategories = [
  { value: "rent", label: "Rent" },
  { value: "salary", label: "Salary" },
  { value: "supplies", label: "Supplies" },
  { value: "marketing", label: "Marketing" },
  { value: "transport", label: "Transport" },
  { value: "utilities", label: "Utilities" },
  { value: "subscription", label: "Subscription" },
  { value: "other", label: "Other" },
];
const formatCategoryLabel = (value) =>
  String(value || "general")
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
const formatDateLabel = (value) => String(value || "").slice(0, 10) || "-";
const toLocalDateKey = (value = new Date()) => {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function PaymentsPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const branches = useAppStore((state) => state.branches);
  const selectedBranchId = useAppStore((state) => state.selectedBranchId);
  const appointments = useAppStore((state) => state.appointments);
  const sharedPayments = useAppStore((state) => state.payments);
  const sharedExpenses = useAppStore((state) => state.expenses);
  const setSharedPayments = useAppStore((state) => state.setPayments);
  const setSharedExpenses = useAppStore((state) => state.setExpenses);
  const business = useAppStore((state) => state.business);
  const role = String(user?.role || "owner").toLowerCase();
  const branchAccessEnabled = business?.hasBranches === true && canAccessBranchesPlan(business?.subscription?.plan);
  const branchScopeId = role === "owner" || role === "admin" || role === "manager" ? selectedBranchId : user?.branchId || "";
  const canChooseBranch = branchAccessEnabled && (role === "owner" || role === "admin" || role === "manager");
  const canManageFinance = role === "owner" || role === "admin" || role === "manager" || role === "staff";
  const payments = sharedPayments || [];
  const expenses = sharedExpenses || [];
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeBreakdown, setActiveBreakdown] = useState(null);
  const [form, setForm] = useState({
    customerType: "walk_in",
    customerName: "",
    bookingId: "",
    amount: "",
    branchId: branchScopeId,
    method: "cash",
    currency: "NGN",
    notes: "",
  });
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    branchId: branchScopeId,
    category: "rent",
    otherCategory: "",
    spentAt: "",
    notes: "",
  });
  const appointmentOptions = appointments.filter((item) => !["cancelled", "no_show"].includes(String(item.status || "").toLowerCase()));
  const effectivePaymentBranchId = canChooseBranch ? form.branchId || branchScopeId : branchScopeId;
  const effectiveExpenseBranchId = canChooseBranch ? expenseForm.branchId || branchScopeId : branchScopeId;

  const syncPayments = useCallback(async () => {
    if (!token) return;
    setError("");
    try {
      const rows = await api.getPayments(token, { branchId: branchScopeId });
      setSharedPayments(rows);
    } catch (err) {
      setError(err.message || "Could not load payments.");
    }
  }, [branchScopeId, setSharedPayments, token]);

  const syncExpenses = useCallback(async () => {
    if (!token) return;
    try {
      const rows = await api.getExpenses(token, { branchId: branchScopeId });
      setSharedExpenses(rows);
    } catch (err) {
      setError(err.message || "Could not load expenses.");
    }
  }, [branchScopeId, setSharedExpenses, token]);

  useEffect(() => {
    let cancelled = false;

    const loadFinanceData = async () => {
      if (!token) return;
      setError("");

      try {
        const [paymentRows, expenseRows] = await Promise.all([
          api.getPayments(token, { branchId: branchScopeId }),
          api.getExpenses(token, { branchId: branchScopeId }),
        ]);

        if (cancelled) return;

        setSharedPayments(paymentRows);
        setSharedExpenses(expenseRows);
      } catch (err) {
        if (cancelled) return;
        setError(err.message || "Could not load finance data.");
      }
    };

    loadFinanceData();

    return () => {
      cancelled = true;
    };
  }, [branchScopeId, setSharedExpenses, setSharedPayments, token]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!error) return undefined;
    const timer = window.setTimeout(() => setError(""), 5000);
    return () => window.clearTimeout(timer);
  }, [error]);

  const createManualPayment = async () => {
    if (!token) return;
    const selectedAppointment = form.bookingId
      ? appointmentOptions.find((item) => item.id === form.bookingId) || null
      : null;
    const amount = Number(form.amount || 0);
    const customerName =
      form.customerType === "appointment"
        ? String(selectedAppointment?.customer || "").trim()
        : form.customerName.trim();

    if (form.customerType === "appointment" && !selectedAppointment) {
      setError("Select the appointment this payment is for.");
      return;
    }
    if (!customerName || !Number.isFinite(amount) || amount <= 0) {
      setError("Customer name and a valid amount are required.");
      return;
    }

    try {
      setError("");
      setNotice("");
      await api.recordManualPayment(token, {
        customerName,
        amount,
        branchId: effectivePaymentBranchId || null,
        bookingId: form.customerType === "appointment" ? selectedAppointment?.id || null : null,
        customerId: form.customerType === "appointment" ? selectedAppointment?.customerId || null : null,
        method: form.method,
        currency: form.currency,
        notes: form.notes,
      });
      setForm({
        customerType: "walk_in",
        customerName: "",
        bookingId: "",
        amount: "",
        branchId: branchScopeId,
        method: "cash",
        currency: "NGN",
        notes: "",
      });
      await syncPayments();
      setNotice("Manual payment recorded.");
    } catch (err) {
      setError(err.message || "Could not record manual payment.");
    }
  };

  const createExpense = async () => {
    if (!token) return;
    const amount = Number(expenseForm.amount || 0);
    if (!expenseForm.title.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Expense title and a valid amount are required.");
      return;
    }
    if (expenseForm.category === "other" && !expenseForm.otherCategory.trim()) {
      setError("Please describe the expense category.");
      return;
    }

    try {
      setError("");
      setNotice("");
      await api.addExpense(token, {
        title: expenseForm.title.trim(),
        amount,
        branchId: effectiveExpenseBranchId || null,
        category: expenseForm.category === "other" ? expenseForm.otherCategory.trim() : expenseForm.category,
        spentAt: expenseForm.spentAt || undefined,
        notes: expenseForm.notes,
      });
      setExpenseForm({ title: "", amount: "", branchId: branchScopeId, category: "rent", otherCategory: "", spentAt: "", notes: "" });
      await syncExpenses();
      setNotice("Expense recorded.");
    } catch (err) {
      setError(err.message || "Could not record expense.");
    }
  };

  const today = toLocalDateKey();
  const successfulRevenuePayments = payments.filter(
    (item) => item.status === "success" && !isSubscriptionPayment(item),
  );
  const successfulSubscriptionPayments = payments.filter(
    (item) => item.status === "success" && isSubscriptionPayment(item),
  );
  const appointmentPriceById = Object.fromEntries(
    appointments.map((item) => [String(item.id), Math.max(0, Number(item.price || 0))]),
  );
  const countedRevenuePayments = [];
  const countedAmountByBookingId = {};
  successfulRevenuePayments
    .slice()
    .sort((a, b) => new Date(a.paidAt || a.createdAt || 0).getTime() - new Date(b.paidAt || b.createdAt || 0).getTime())
    .forEach((item) => {
      const bookingId = String(item.bookingId || "");
      if (!bookingId || appointmentPriceById[bookingId] === undefined) {
        countedRevenuePayments.push(item);
        return;
      }

      const bookingPrice = appointmentPriceById[bookingId];
      const countedSoFar = Number(countedAmountByBookingId[bookingId] || 0);
      const remaining = Math.max(0, bookingPrice - countedSoFar);
      if (remaining <= 0) {
        return;
      }

      const allowedAmount = Math.min(remaining, Number(item.amount || 0));
      countedAmountByBookingId[bookingId] = countedSoFar + allowedAmount;
      countedRevenuePayments.push(
        allowedAmount === Number(item.amount || 0)
          ? item
          : { ...item, amount: allowedAmount },
      );
    });
  const countedPaymentsToday = countedRevenuePayments.filter(
    (item) => toLocalDateKey(item.paidAt || item.createdAt) === today,
  );
  const revenueToday = countedPaymentsToday.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const appointmentPendingByBookingId = appointments.reduce((acc, item) => {
    if (["cancelled", "no_show", "completed"].includes(String(item.status || "").toLowerCase())) {
      return acc;
    }
    acc[String(item.id)] = Math.max(
      0,
      Number(item.paymentSummary?.balanceDue ?? item.price ?? 0),
    );
    return acc;
  }, {});
  const pending = Object.values(appointmentPendingByBookingId).reduce(
    (sum, value) => sum + Number(value || 0),
    0,
  );
  const total = countedRevenuePayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expensesToday = expenses
    .filter((item) => toLocalDateKey(item.spentAt || item.createdAt) === today)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const subscriptionExpensesToday = successfulSubscriptionPayments
    .filter((item) => toLocalDateKey(item.paidAt || item.createdAt) === today)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const businessExpenses =
    expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0) +
    successfulSubscriptionPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const netRevenue = total - businessExpenses;
  const expenseItemsToday = expenses.filter((item) => toLocalDateKey(item.spentAt || item.createdAt) === today);
  const subscriptionItemsToday = successfulSubscriptionPayments.filter(
    (item) => toLocalDateKey(item.paidAt || item.createdAt) === today,
  );
  const pendingBookings = appointments
    .filter((item) => appointmentPendingByBookingId[String(item.id)] > 0)
    .map((item) => ({
      id: item.id,
      name: item.customer || "Customer",
      detail: `${item.service || "Service"} | ${item.date || ""} ${item.time || ""}`.trim(),
      amount: appointmentPendingByBookingId[String(item.id)] || 0,
    }));
  const summaryCards = [
    {
      key: "revenue_today",
      label: "Revenue today",
      value: revenueToday,
      title: "Revenue today breakdown",
      empty: "No successful revenue payments recorded today.",
      items: countedPaymentsToday.map((item) => ({
        id: item.id,
        name: item.customerName || "Customer",
        detail: `${String(item.method || item.channel || "-").replace("_", " ")} | ${formatDateLabel(item.paidAt || item.createdAt)}`,
        amount: Number(item.amount || 0),
      })),
    },
    {
      key: "expenses_today",
      label: "Expenses today",
      value: expensesToday + subscriptionExpensesToday,
      title: "Expenses today breakdown",
      empty: "No expenses recorded today.",
      items: [
        ...expenseItemsToday.map((item) => ({
          id: `expense-${item.id}`,
          name: item.title || "Expense",
          detail: `${formatCategoryLabel(item.category)} | ${formatDateLabel(item.spentAt || item.createdAt)}`,
          amount: -Number(item.amount || 0),
        })),
        ...subscriptionItemsToday.map((item) => ({
          id: `subscription-${item.id}`,
          name: "Subscription payment",
          detail: `${String(item.metadata?.planId || "plan").toUpperCase()} | ${formatDateLabel(item.paidAt || item.createdAt)}`,
          amount: -Number(item.amount || 0),
        })),
      ],
    },
    {
      key: "pending_amount",
      label: "Pending amount",
      value: pending,
      title: "Pending amount breakdown",
      empty: "No pending appointment balances.",
      items: pendingBookings,
    },
    {
      key: "total_revenue",
      label: "Total revenue",
      value: total,
      title: "Total revenue breakdown",
      empty: "No successful revenue payments recorded yet.",
      items: countedRevenuePayments.map((item) => ({
        id: item.id,
        name: item.customerName || "Customer",
        detail: `${String(item.method || item.channel || "-").replace("_", " ")} | ${formatDateLabel(item.paidAt || item.createdAt)}`,
        amount: Number(item.amount || 0),
      })),
    },
    {
      key: "net_revenue",
      label: "Net revenue",
      value: netRevenue,
      title: "Net revenue breakdown",
      empty: "No revenue or expense data yet.",
      items: [
        { id: "net-total-revenue", name: "Total revenue", detail: "Successful payments", amount: total },
        { id: "net-total-expenses", name: "Business expenses", detail: "Expenses and subscription charges", amount: -businessExpenses },
        { id: "net-balance", name: "Net revenue", detail: "Revenue minus expenses", amount: netRevenue },
      ],
    },
  ];

  if (!canManageFinance) {
    return (
      <div className="space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Payments</p>
          <h1 className="text-3xl font-semibold">Revenue & transactions</h1>
        </div>
        <div className="glass-card rounded-3xl p-6 text-sm text-ink-700/70 dark:text-pearl-100/70">
          Only signed-in team members can access payments and expense controls.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Payments</p>
        <h1 className="text-3xl font-semibold">Revenue & transactions</h1>
        {notice ? <p className="mt-2 text-sm text-emerald-600">{notice}</p> : null}
        {error ? <p className="mt-2 text-sm text-rose-500">{error}</p> : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <motion.button
            key={card.key}
            type="button"
            className="glass-card rounded-3xl p-6 text-left transition hover:-translate-y-1 hover:border-emerald-500/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setActiveBreakdown(card)}
          >
            <div className="text-xs uppercase tracking-[0.3em] text-ink-700/60 dark:text-pearl-100/60">{card.label}</div>
            <div className="mt-4 text-2xl font-semibold"><AnimatedValue value={card.value} /></div>
            <div className="mt-3 text-[11px] uppercase tracking-[0.2em] text-emerald-600">View breakdown</div>
          </motion.button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="glass-card rounded-3xl p-6">
          <div className="text-sm font-semibold">Record manual payment</div>
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  form.customerType === "walk_in"
                    ? "border-emerald-500 bg-emerald-500/10 text-ink-900 dark:text-pearl-100"
                    : "border-white/40 bg-white/80 dark:border-white/10 dark:bg-white/5"
                }`}
                onClick={() => setForm((prev) => ({ ...prev, customerType: "walk_in", bookingId: "" }))}
              >
                Walk-in customer
              </button>
              <button
                type="button"
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  form.customerType === "appointment"
                    ? "border-emerald-500 bg-emerald-500/10 text-ink-900 dark:text-pearl-100"
                    : "border-white/40 bg-white/80 dark:border-white/10 dark:bg-white/5"
                }`}
                onClick={() => setForm((prev) => ({ ...prev, customerType: "appointment" }))}
              >
                Customer with appointment
              </button>
            </div>
            {form.customerType === "walk_in" ? (
              <input
                className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
                placeholder="Customer name"
                value={form.customerName}
                onChange={(event) => setForm({ ...form, customerName: event.target.value })}
              />
            ) : (
              <select
                className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
                value={form.bookingId}
                onChange={(event) => {
                  const bookingId = event.target.value;
                  const booking = appointmentOptions.find((item) => item.id === bookingId) || null;
                  setForm((prev) => ({
                    ...prev,
                    bookingId,
                    customerName: booking?.customer || "",
                    amount: booking?.price ? String(booking.price) : prev.amount,
                  }));
                }}
              >
                <option value="">Select appointment</option>
                {appointmentOptions.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.customer || "Customer"} | {booking.service || "Service"} | {booking.date} {booking.time}
                  </option>
                ))}
              </select>
            )}
            <input
              className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              {branchAccessEnabled ? (
                <select
                  className="rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
                  value={effectivePaymentBranchId}
                  onChange={(event) => setForm({ ...form, branchId: event.target.value })}
                  disabled={!canChooseBranch}
                >
                  {canChooseBranch ? <option value="">All branches</option> : null}
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              ) : null}
              <select
                className="rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
                value={form.method}
                onChange={(event) => setForm({ ...form, method: event.target.value })}
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="pos_card">POS card</option>
              </select>
              <select
                className="rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
                value={form.currency}
                onChange={(event) => setForm({ ...form, currency: event.target.value })}
              >
                <option value="NGN">NGN</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <textarea
              className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
            <button className="lux-button-primary w-full" onClick={createManualPayment}>
              Record payment
            </button>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <div className="text-sm font-semibold">Record expense</div>
          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
              placeholder="Expense title"
              value={expenseForm.title}
              onChange={(event) => setExpenseForm({ ...expenseForm, title: event.target.value })}
            />
            <input
              className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount"
              value={expenseForm.amount}
              onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              {branchAccessEnabled ? (
                <select
                  className="rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm font-medium text-ink-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100"
                  value={effectiveExpenseBranchId}
                  onChange={(event) => setExpenseForm({ ...expenseForm, branchId: event.target.value })}
                  disabled={!canChooseBranch}
                >
                  {canChooseBranch ? <option value="">All branches</option> : null}
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              ) : null}
              <select
                className="rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm font-medium text-ink-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100"
                value={expenseForm.category}
                onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })}
                aria-label="Expense category"
              >
                {expenseCategories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              <input
                className="rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm font-medium text-ink-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100"
                type="date"
                value={expenseForm.spentAt}
                onChange={(event) => setExpenseForm({ ...expenseForm, spentAt: event.target.value })}
                aria-label="Expense date"
              />
            </div>
            {expenseForm.category === "other" ? (
              <input
                className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm font-medium text-ink-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-white/5 dark:text-pearl-100"
                placeholder="What is this expense for?"
                value={expenseForm.otherCategory}
                onChange={(event) => setExpenseForm({ ...expenseForm, otherCategory: event.target.value })}
              />
            ) : null}
            <textarea
              className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
              placeholder="Notes (optional)"
              value={expenseForm.notes}
              onChange={(event) => setExpenseForm({ ...expenseForm, notes: event.target.value })}
            />
            <div className="rounded-2xl border border-white/40 px-4 py-3 text-sm">
              Business expenses: {formatCurrency(businessExpenses)}
            </div>
            <button className="lux-button-primary w-full" onClick={createExpense}>
              Record expense
            </button>
          </div>
        </div>
      </div>
      <div className="text-xs text-ink-700/60 dark:text-pearl-100/60">
        Signed in as {user?.email || "owner"}.
      </div>
      <AnimatePresence>
        {activeBreakdown ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[32px] border border-white/40 bg-white/95 p-6 shadow-luxe dark:border-white/10 dark:bg-ink-950"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-emerald-500">{activeBreakdown.label}</div>
                  <h2 className="mt-2 text-2xl font-semibold">{activeBreakdown.title}</h2>
                  <div className="mt-2 text-sm text-ink-700/70 dark:text-pearl-100/70">
                    Total: {formatCurrency(activeBreakdown.value)}
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] dark:border-white/10 dark:bg-white/5"
                  onClick={() => setActiveBreakdown(null)}
                >
                  <X size={14} />
                  Close
                </button>
              </div>
              <div className="mt-6 space-y-3">
                {activeBreakdown.items.length === 0 ? (
                  <div className="rounded-2xl border border-white/40 px-4 py-4 text-sm text-ink-700/70 dark:border-white/10 dark:text-pearl-100/70">
                    {activeBreakdown.empty}
                  </div>
                ) : (
                  activeBreakdown.items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/40 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">{item.name}</div>
                        <div className={item.amount < 0 ? "text-rose-500" : "text-emerald-600"}>
                          {item.amount < 0 ? "-" : ""}{formatCurrency(Math.abs(Number(item.amount || 0)))}
                        </div>
                      </div>
                      <div className="mt-2 text-xs uppercase tracking-[0.16em] text-ink-700/60 dark:text-pearl-100/60">
                        {item.detail}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
