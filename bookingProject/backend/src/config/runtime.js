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
  requireInProduction("ALLOWED_ORIGINS", "ALLOWED_ORIGINS is required in production to avoid broken or overly-open CORS.");
  requireInProduction("EMAIL_MICROSERVICE_URL", "EMAIL_MICROSERVICE_URL is required in production for verification and receipt emails.");
  requireInProduction(
    "EMAIL_VERIFICATION_URL",
    "EMAIL_VERIFICATION_URL is required in production so email verification links point to the deployed frontend.",
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
