const AuditLog = require("../audit/audit.schema");

const sanitizeMeta = (meta = {}) => {
  const blocked = new Set(["password", "currentPassword", "newPassword", "token", "authorization", "secret"]);
  return Object.fromEntries(
    Object.entries(meta).filter(([key, value]) => !blocked.has(String(key)) && value !== undefined),
  );
};

const objectIdFields = new Set(["businessId", "staffId", "paymentId", "serviceId", "bookingId", "branchId"]);

exports.auditLog = (event, details = {}) => {
  const safeDetails = sanitizeMeta(details);
  const payload = {
    ts: new Date().toISOString(),
    event: String(event || "unknown"),
    ...safeDetails,
  };

  console.log(`[audit] ${JSON.stringify(payload)}`);

  const document = {
    event: payload.event,
    meta: safeDetails,
  };

  for (const [key, value] of Object.entries(safeDetails)) {
    if (value === undefined) continue;

    if (objectIdFields.has(key)) {
      document[key] = value || null;
      continue;
    }

    if (
      [
        "email",
        "role",
        "reason",
        "reference",
        "actorType",
        "webhookEvent",
        "purpose",
        "planId",
        "method",
        "amount",
        "updatedFields",
      ].includes(key)
    ) {
      document[key] = value;
    }
  }

  if (AuditLog?.db?.readyState !== 1) {
    return;
  }

  AuditLog.create(document).catch((error) => {
    console.error(`[audit:error] ${error.message}`);
  });
};
