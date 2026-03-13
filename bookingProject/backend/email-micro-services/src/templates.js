exports.renderTemplate = ({ template = "custom", payload = {} }) => {
  const companyName = payload.companyName || "ManagelyHQ";

  if (template === "welcome_owner") {
    return {
      subject: `Welcome to ${companyName}`,
      html: `<h2>Welcome to ${companyName}</h2><p>Your account is ready.</p>`,
      text: `Welcome to ${companyName}. Your account is ready.`,
    };
  }

  if (template === "staff_invite") {
    return {
      subject: `You were added to ${companyName}`,
      html: `<h2>You were added to ${companyName}</h2><p>Your temporary password is <strong>${payload.temporaryPassword || ""}</strong>.</p>`,
      text: `You were added to ${companyName}. Your temporary password is ${payload.temporaryPassword || ""}.`,
    };
  }

  if (template === "booking_confirmation") {
    return {
      subject: `Booking confirmed with ${companyName}`,
      html: `<h2>Booking confirmed</h2><p>${payload.customerName || "Customer"}, your booking for ${payload.serviceName || "a service"} is confirmed for ${payload.date || ""} ${payload.time || ""}.${payload.branchName ? `</p><p>Branch: <strong>${payload.branchName}</strong>.` : "</p>"}${payload.branchAddress ? `<p>Address: ${payload.branchAddress}</p>` : ""}`,
      text: `${payload.customerName || "Customer"}, your booking for ${payload.serviceName || "a service"} is confirmed for ${payload.date || ""} ${payload.time || ""}.${payload.branchName ? ` Branch: ${payload.branchName}.` : ""}${payload.branchAddress ? ` Address: ${payload.branchAddress}.` : ""}`,
    };
  }

  return {
    subject: payload.subject || "Notification",
    html: payload.html || "<p>No content provided.</p>",
    text: payload.text || "No content provided.",
  };
};
