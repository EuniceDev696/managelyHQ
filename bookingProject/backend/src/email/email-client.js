const EMAIL_MS_URL = String(process.env.EMAIL_MICROSERVICE_URL || "http://localhost:5100").replace(/\/+$/, "");
const isTestEnv = String(process.env.NODE_ENV || "").toLowerCase() === "test";

const postEmail = async (payload) => {
  if (isTestEnv) {
    return { ok: true, skipped: true, reason: "test_environment", payload };
  }

  try {
    const response = await fetch(`${EMAIL_MS_URL}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      const error = result.message || "Email microservice request failed.";
      console.error(`[email-client] ${error}`);
      return { ok: false, error, payload };
    }

    return { ok: true, payload };
  } catch (error) {
    console.error(`[email-client] ${error.message}`);
    return { ok: false, error: error.message, payload };
  }
};

exports.sendOwnerWelcomeEmail = async ({ to, companyName }) =>
  postEmail({
    to,
    template: "welcome_owner",
    payload: { companyName },
  });

exports.sendVerificationEmail = async ({ to, companyName, verificationLink, verificationOtp = "", staffName = "", temporaryPassword = "" }) =>
  postEmail({
    to,
    template: "custom",
    payload: {
      subject: `Verify your email for ${companyName}`,
      html: `<h2>Verify your email</h2><p>${staffName || "Hello"}, please verify your email for ${companyName}.</p>${temporaryPassword ? `<p>Your temporary password is <strong>${temporaryPassword}</strong>.</p>` : ""}${verificationOtp ? `<p>Your verification code is <strong>${verificationOtp}</strong>.</p>` : ""}<p><a href="${verificationLink}">Click here to verify your email</a></p><p>This link and code expire in 30 minutes.</p>`,
      text: `${staffName || "Hello"}, verify your email for ${companyName}.${verificationOtp ? ` Verification code: ${verificationOtp}.` : ""} ${verificationLink}${temporaryPassword ? ` Temporary password: ${temporaryPassword}` : ""}`,
    },
  });

exports.sendStaffInviteEmail = async ({ to, companyName, temporaryPassword, staffName }) =>
  postEmail({
    to,
    template: "staff_invite",
    payload: { companyName, temporaryPassword, staffName },
  });

exports.sendBookingConfirmationEmail = async ({
  to,
  companyName,
  customerName,
  serviceName,
  date,
  time,
  branchName = "",
  branchAddress = "",
}) =>
  postEmail({
    to,
    template: "booking_confirmation",
    payload: { companyName, customerName, serviceName, date, time, branchName, branchAddress },
  });

exports.sendOwnerNewBookingAlertEmail = async ({
  to,
  companyName,
  customerName,
  serviceName,
  date,
  time,
  branchName = "",
}) =>
  postEmail({
    to,
    template: "custom",
    payload: {
      subject: `New booking for ${companyName}`,
      html: `<h2>New booking received</h2><p>${customerName || "A customer"} booked ${serviceName || "a service"} for ${date || ""} ${time || ""}.${branchName ? `</p><p>Branch: <strong>${branchName}</strong>.` : "</p>"}`,
      text: `${customerName || "A customer"} booked ${serviceName || "a service"} for ${date || ""} ${time || ""}.${branchName ? ` Branch: ${branchName}.` : ""}`,
    },
  });

exports.sendStaffAssignedEmail = async ({
  to,
  companyName,
  staffName,
  customerName,
  serviceName,
  date,
  time,
  branchName = "",
}) =>
  postEmail({
    to,
    template: "custom",
    payload: {
      subject: `New appointment assigned at ${companyName}`,
      html: `<h2>Appointment assigned</h2><p>${staffName || "Hello"}, you have been assigned to ${customerName || "a customer"} for ${serviceName || "a service"} on ${date || ""} at ${time || ""}.${branchName ? `</p><p>Branch: <strong>${branchName}</strong>.` : "</p>"}`,
      text: `${staffName || "Hello"}, you have been assigned to ${customerName || "a customer"} for ${serviceName || "a service"} on ${date || ""} at ${time || ""}.${branchName ? ` Branch: ${branchName}.` : ""}`,
    },
  });

exports.sendBookingReminderEmail = async ({
  to,
  companyName,
  customerName,
  serviceName,
  date,
  time,
  branchName = "",
  branchAddress = "",
}) =>
  postEmail({
    to,
    template: "custom",
    payload: {
      subject: `Reminder: your booking with ${companyName}`,
      html: `<h2>Booking reminder</h2><p>${customerName || "Hello"}, this is a reminder for your ${serviceName || "service"} booking on ${date || ""} at ${time || ""}.${branchName ? `</p><p>Branch: <strong>${branchName}</strong>.` : "</p>"}${branchAddress ? `<p>Address: ${branchAddress}</p>` : ""}`,
      text: `${customerName || "Hello"}, this is a reminder for your ${serviceName || "service"} booking on ${date || ""} at ${time || ""}.${branchName ? ` Branch: ${branchName}.` : ""}${branchAddress ? ` Address: ${branchAddress}.` : ""}`,
    },
  });

exports.sendBookingCancelledEmail = async ({ to, companyName, customerName, serviceName, date, time, branchName = "" }) =>
  postEmail({
    to,
    template: "custom",
    payload: {
      subject: `Booking cancelled with ${companyName}`,
      html: `<h2>Booking cancelled</h2><p>${customerName || "Hello"}, your booking for ${serviceName || "a service"} on ${date || ""} at ${time || ""} has been cancelled.${branchName ? `</p><p>Branch: <strong>${branchName}</strong>.` : "</p>"}`,
      text: `${customerName || "Hello"}, your booking for ${serviceName || "a service"} on ${date || ""} at ${time || ""} has been cancelled.${branchName ? ` Branch: ${branchName}.` : ""}`,
    },
  });

exports.sendBookingRescheduledEmail = async ({
  to,
  companyName,
  customerName,
  serviceName,
  previousDate,
  previousTime,
  nextDate,
  nextTime,
  branchName = "",
}) =>
  postEmail({
    to,
    template: "custom",
    payload: {
      subject: `Booking updated with ${companyName}`,
      html: `<h2>Booking updated</h2><p>${customerName || "Hello"}, your ${serviceName || "service"} booking has moved from ${previousDate || ""} ${previousTime || ""} to ${nextDate || ""} ${nextTime || ""}.${branchName ? `</p><p>Branch: <strong>${branchName}</strong>.` : "</p>"}`,
      text: `${customerName || "Hello"}, your ${serviceName || "service"} booking moved from ${previousDate || ""} ${previousTime || ""} to ${nextDate || ""} ${nextTime || ""}.${branchName ? ` Branch: ${branchName}.` : ""}`,
    },
  });

exports.sendPaymentReceiptEmail = async ({
  to,
  companyName,
  customerName,
  amount,
  method,
  reference,
  serviceName,
}) =>
  postEmail({
    to,
    template: "custom",
    payload: {
      subject: `Payment receipt from ${companyName}`,
      html: `<h2>Payment received</h2><p>${customerName || "Hello"}, we received your payment of ₦${Number(amount || 0).toLocaleString()} for ${serviceName || "your booking"}.</p><p>Method: ${method || ""}</p><p>Reference: ${reference || ""}</p>`,
      text: `${customerName || "Hello"}, we received your payment of NGN ${amount} for ${serviceName || "your booking"}. Method: ${method || ""}. Reference: ${reference || ""}.`,
    },
  });

exports.sendSubscriptionExpiryWarningEmail = async ({
  to,
  companyName,
  planName,
  renewalDate,
  daysBefore,
}) =>
  postEmail({
    to,
    template: "custom",
    payload: {
      subject: `${companyName} subscription expires soon`,
      html: `<h2>Subscription expires soon</h2><p>Your ${planName} plan expires in ${daysBefore} day(s).</p><p>Renewal date: ${renewalDate || ""}</p>`,
      text: `Your ${planName} plan expires in ${daysBefore} day(s). Renewal date: ${renewalDate || ""}.`,
    },
  });

exports.sendSubscriptionConfirmationEmail = async ({
  to,
  companyName,
  planName,
  amount,
  renewalDate,
}) =>
  postEmail({
    to,
    template: "custom",
    payload: {
      subject: `${companyName} subscription confirmed`,
      html: `<h2>Subscription confirmed</h2><p>Your ${planName} plan payment of ₦${Number(amount || 0).toLocaleString()} was received.</p><p>Next renewal date: ${renewalDate || "Not set"}.</p>`,
      text: `Your ${planName} plan payment of NGN ${amount} was received. Next renewal date: ${renewalDate || "Not set"}.`,
    },
  });
