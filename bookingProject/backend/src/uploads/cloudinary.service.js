const crypto = require("crypto");

const getCloudinaryConfig = () => ({
  cloudName: String(process.env.CLOUDINARY_CLOUD_NAME || "").trim(),
  apiKey: String(process.env.CLOUDINARY_API_KEY || "").trim(),
  apiSecret: String(process.env.CLOUDINARY_API_SECRET || "").trim(),
  folder: String(process.env.CLOUDINARY_FOLDER || "managelyhq/services").trim(),
});

const hasCloudinaryConfig = () => {
  const config = getCloudinaryConfig();
  return Boolean(config.cloudName && config.apiKey && config.apiSecret);
};

const buildInlineDataUrl = (file) => `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

const signCloudinaryPayload = (params) => {
  const { apiSecret } = getCloudinaryConfig();
  const base = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return crypto.createHash("sha1").update(`${base}${apiSecret}`).digest("hex");
};

exports.hasCloudinaryConfig = hasCloudinaryConfig;
exports.buildInlineDataUrl = buildInlineDataUrl;

exports.uploadImage = async (file) => {
  if (!hasCloudinaryConfig()) {
    return { url: buildInlineDataUrl(file), publicId: "", storage: "inline" };
  }

  const { cloudName, apiKey, folder } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signCloudinaryPayload({ folder, timestamp });

  const formData = new FormData();
  formData.append("file", buildInlineDataUrl(file));
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { url: buildInlineDataUrl(file), publicId: "", storage: "inline" };
    }

    return {
      url: payload.secure_url || payload.url || "",
      publicId: payload.public_id || "",
      storage: "cloudinary",
    };
  } catch {
    return { url: buildInlineDataUrl(file), publicId: "", storage: "inline" };
  }
};

exports.deleteImage = async (publicId) => {
  if (!publicId || !hasCloudinaryConfig()) return false;

  const { cloudName, apiKey } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signCloudinaryPayload({ public_id: publicId, timestamp });

  const formData = new FormData();
  formData.append("public_id", publicId);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: "POST",
    body: formData,
  });

  return response.ok;
};

