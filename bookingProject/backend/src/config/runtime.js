const isProduction = String(process.env.NODE_ENV || "").toLowerCase() === "production";

const readEnv = (key) => String(process.env[key] || "").trim();

const fail = (message) => {
  throw new Error(message);
};

const warn = (message) => {
  console.warn(`[api:config] ${message}`);
};

const requireInProduction = (key, message = `${key} is required in production.`) => {
  if (isProduction && !readEnv(key)) {
    fail(message);
  }
};

const warnIfMissing = (key, message) => {
  if (!readEnv(key)) {
    warn(message || `${key} is not configured.`);
  }
};

const validateApiRuntimeConfig = () => {
  requireInProduction("DBSTRING");
  requireInProduction("JWT_SECRET", "JWT_SECRET is required in production. Do not use the development fallback.");
  warnIfMissing(
    "ALLOWED_ORIGINS",
    "ALLOWED_ORIGINS is not configured. CORS will remain open until you set your frontend domain.",
  );
  warnIfMissing(
    "EMAIL_MICROSERVICE_URL",
    "EMAIL_MICROSERVICE_URL is not configured. Verification and receipt emails will use the local default and likely fail until you set the deployed email service URL.",
  );
  warnIfMissing(
    "EMAIL_VERIFICATION_URL",
    "EMAIL_VERIFICATION_URL is not configured. Verification links will fall back to the local frontend URL until you set the deployed frontend verification route.",
  );

  if (readEnv("PAYSTACK_SECRET_KEY")) {
    requireInProduction(
      "PAYSTACK_CALLBACK_URL",
      "PAYSTACK_CALLBACK_URL is required in production when Paystack is enabled.",
    );
  } else {
    warn("PAYSTACK_SECRET_KEY is missing. Online subscription payments will not work.");
  }

  if (!readEnv("CLOUDINARY_CLOUD_NAME") || !readEnv("CLOUDINARY_API_KEY") || !readEnv("CLOUDINARY_API_SECRET")) {
    warn("Cloudinary credentials are incomplete. Service image uploads will not work.");
  }
};

module.exports = { validateApiRuntimeConfig };
