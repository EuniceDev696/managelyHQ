const resolveApiBase = () => {
  const configuredBase = String(import.meta.env.VITE_API_BASE_URL || "").trim()
  if (configuredBase) return configuredBase.replace(/\/+$/, "")

  if (import.meta.env.DEV) {
    return "http://localhost:5000"
  }

  if (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return "http://localhost:5000"
  }

  return ""
}

const API_BASE = resolveApiBase()

const requireApiBase = () => {
  if (!API_BASE) {
    throw new Error("API is not configured. Set VITE_API_BASE_URL to your deployed backend URL.")
  }
}

const encodePathSegment = (value) => encodeURIComponent(String(value || "").trim())

const toClientEntity = (item) => {
  if (!item || typeof item !== "object") return item

  const output = { ...item }

  if (output._id && !output.id) {
    output.id = String(output._id)
  }

  ;["id", "businessId", "bookingId", "customerId", "serviceId", "staffId", "branchId", "managerStaffId"].forEach((field) => {
    if (output[field] === undefined || output[field] === null) return
    if (typeof output[field] === "object") {
      output[field] = String(output[field]._id || output[field].id || "")
    } else {
      output[field] = String(output[field])
    }
  })

  if (Array.isArray(output.services)) {
    output.services = output.services.map((value) =>
      typeof value === "object" ? String(value?._id || value?.id || "") : String(value),
    )
  }

  return output
}

const toClientList = (items) => (Array.isArray(items) ? items.map((item) => toClientEntity(item)) : [])

const request = async (path, options = {}) => {
  requireApiBase()

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, options)
  } catch {
    throw new Error("Could not reach the server. Check that the backend is running.")
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const error = new Error(payload.message || "Request failed.")
    Object.assign(error, payload)
    throw error
  }

  const text = await response.text()
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

const buildQuery = (params = {}) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    search.set(key, String(value))
  })
  const query = search.toString()
  return query ? `?${query}` : ""
}

export const api = {
  async getPublicBookingPage(slug, options = {}) {
    const remote = await request(`/api/public/business/${encodePathSegment(slug)}${buildQuery({ branchId: options.branchId })}`)
    return {
      business: toClientEntity(remote.business),
      services: toClientList(remote.services),
      staff: toClientList(remote.staff),
      branches: toClientList(remote.branches),
    }
  },

  async getPublicBusinessPageById(businessId, options = {}) {
    const remote = await request(`/api/public/business/id/${encodePathSegment(businessId)}${buildQuery({ branchId: options.branchId })}`)
    return {
      business: toClientEntity(remote.business),
      services: toClientList(remote.services),
      staff: toClientList(remote.staff),
      branches: toClientList(remote.branches),
    }
  },

  async register(payload) {
    return request("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  },

  async login(payload) {
    return request("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  },

  async verifyEmail(payload) {
    const body =
      typeof payload === "string"
        ? { token: payload }
        : {
            token: payload?.token || "",
            email: payload?.email || "",
            otp: payload?.otp || "",
          }
    return request("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  },

  async resendVerificationEmail(email) {
    return request("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
  },

  async getBusinessMe(token) {
    const remote = await request("/api/business/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
    return toClientEntity(remote)
  },

  async getNotificationActivity(token, options = {}) {
    const remote = await request(`/api/business/me/notifications/activity${buildQuery({ branchId: options.branchId, limit: options.limit })}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return {
      items: toClientList(remote.items),
      summary: remote.summary || { sent: 0, failed: 0 },
    }
  },

  async updateBusiness(token, updates) {
    const remote = await request("/api/business/me", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    return toClientEntity(remote)
  },

  async completeOnboarding(token, updates) {
    const remote = await request("/api/onboarding/complete", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    return toClientEntity(remote)
  },

  async changeStaffPassword(token, newPassword) {
    return request("/api/auth/staff/password", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: "ignored", newPassword }),
    })
  },

  async updateSubscription(token, payload) {
    const remote = await request("/api/subscription", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return toClientEntity(remote)
  },

  async initializeSubscriptionPayment(token, payload) {
    const remote = await request("/api/payments/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        purpose: "subscription_upgrade",
        metadata: { ...(payload.metadata || {}), purpose: "subscription_upgrade", planId: payload.planId },
      }),
    })
    return toClientEntity(remote)
  },

  async verifySubscriptionPayment(token, reference) {
    const remote = await request("/api/payments/verify", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    })
    return toClientEntity(remote)
  },

  async changePassword(token, currentPassword, nextPassword) {
    return request("/api/business/me/password", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword: nextPassword }),
    })
  },

  async deleteAccount(token) {
    return request("/api/business/me", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async getServices(token, options = {}) {
    const remote = await request(`/api/services${buildQuery({ branchId: options.branchId })}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return toClientList(remote)
  },

  async addService(token, payload) {
    const remote = await request("/api/services", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return toClientEntity(remote)
  },

  async updateService(token, id, updates) {
    const remote = await request(`/api/services/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    return toClientEntity(remote)
  },

  async deleteService(token, id) {
    return request(`/api/services/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async uploadServiceImage(token, file, filename = "service-image.jpg") {
    const formData = new FormData()
    formData.append("file", file, filename)
    return request("/api/uploads/service-image", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
  },

  async getBookings(token, options = {}) {
    const remote = await request(`/api/bookings${buildQuery({ branchId: options.branchId })}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return toClientList(remote)
  },

  async addOwnerBooking(token, payload) {
    const remote = await request("/api/bookings", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return toClientEntity(remote)
  },

  async updateBookingStatus(token, bookingId, status, paymentMethod = "") {
    const remote = await request(`/api/bookings/${bookingId}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status, paymentMethod }),
    })
    return toClientEntity(remote)
  },

  async updateBooking(token, bookingId, updates) {
    const remote = await request(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    return toClientEntity(remote)
  },

  async deleteBooking(token, bookingId) {
    return request(`/api/bookings/${bookingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async sendBookingReminders(token, date, options = {}) {
    return request("/api/bookings/reminders/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ date, branchId: options.branchId }),
    })
  },

  async resendBookingNotification(token, bookingId, purpose) {
    return request(`/api/bookings/${bookingId}/notifications/resend`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ purpose }),
    })
  },

  async getStaff(token, options = {}) {
    const remote = await request(`/api/staff${buildQuery({ branchId: options.branchId })}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return toClientList(remote)
  },

  async addStaff(token, payload) {
    const remote = await request("/api/staff", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return toClientEntity(remote)
  },

  async updateStaff(token, staffId, updates) {
    const remote = await request(`/api/staff/${staffId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    return toClientEntity(remote)
  },

  async deleteStaff(token, staffId) {
    return request(`/api/staff/${staffId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async getCustomers(token, options = {}) {
    const remote = await request(`/api/customers${buildQuery({ branchId: options.branchId })}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return toClientList(remote)
  },

  async getCustomerDetail(token, customerId, options = {}) {
    const remote = await request(`/api/customers/${customerId}${buildQuery({ branchId: options.branchId })}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return {
      customer: toClientEntity(remote.customer),
      history: {
        bookings: toClientList(remote.history?.bookings),
        counts: remote.history?.counts || {},
        favoriteServices: remote.history?.favoriteServices || [],
      },
    }
  },

  async updateCustomer(token, customerId, updates) {
    const remote = await request(`/api/customers/${customerId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    return toClientEntity(remote)
  },

  async getPayments(token, options = {}) {
    const remote = await request(`/api/payments${buildQuery({ branchId: options.branchId })}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return toClientList(remote)
  },

  async getExpenses(token, options = {}) {
    const remote = await request(`/api/expenses${buildQuery({ branchId: options.branchId })}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return toClientList(remote)
  },

  async getBranches(token) {
    const remote = await request("/api/branches", {
      headers: { Authorization: `Bearer ${token}` },
    })
    return toClientList(remote)
  },

  async getBranchActivity(token, options = {}) {
    const remote = await request(`/api/branches/activity${buildQuery({ branchId: options.branchId, limit: options.limit })}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return toClientList(remote)
  },

  async addBranch(token, payload) {
    const remote = await request("/api/branches", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return toClientEntity(remote)
  },

  async updateBranch(token, branchId, updates) {
    const remote = await request(`/api/branches/${branchId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    return toClientEntity(remote)
  },

  async reassignBranch(token, branchId, payload) {
    const remote = await request(`/api/branches/${branchId}/reassign`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return toClientEntity(remote)
  },

  async deleteBranch(token, branchId) {
    return request(`/api/branches/${branchId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async addExpense(token, payload) {
    const remote = await request("/api/expenses", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return toClientEntity(remote)
  },

  async deleteExpense(token, expenseId) {
    return request(`/api/expenses/${expenseId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async recordManualPayment(token, payload) {
    const remote = await request("/api/payments/manual", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return toClientEntity(remote)
  },

  async initializeOnlinePayment(token, payload) {
    const remote = await request("/api/payments/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return toClientEntity(remote)
  },

  async verifyPayment(token, reference) {
    const remote = await request("/api/payments/verify", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    })
    return toClientEntity(remote)
  },

  async updatePaymentStatus(token, paymentId, status, notes = "") {
    const remote = await request(`/api/payments/${paymentId}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes }),
    })
    return toClientEntity(remote)
  },

  async getPublicBusiness(businessId) {
    const page = await this.getPublicBusinessPageById(businessId)
    return page.business
  },

  async getPublicBusinessBySlug(slug) {
    const page = await this.getPublicBookingPage(slug)
    return page.business
  },

  async getPublicServices(businessId) {
    const page = await this.getPublicBusinessPageById(businessId)
    return page.services
  },

  async getPublicStaff(businessId) {
    const page = await this.getPublicBusinessPageById(businessId)
    return page.staff
  },

  async getPublicBookings(_businessId, date, options = {}) {
    const slug = options.slug || ""
    const remote = await request(`/api/public/business/${encodePathSegment(slug)}/bookings${buildQuery({ date, branchId: options.branchId })}`)
    return toClientList(remote)
  },

  async addPublicBooking(_businessId, payload, options = {}) {
    const slug = options.slug || ""
    const remote = await request(`/api/public/business/${encodePathSegment(slug)}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return toClientEntity(remote)
  },
}
