const bcrypt = require("bcryptjs");

const isBcryptHash = (value) => /^\$2[aby]\$\d{2}\$/.test(String(value || ""));

const hashStaffPassword = async (password) => bcrypt.hash(String(password || ""), 10);

const verifyStaffPassword = async (storedPassword, rawPassword) => {
  const plainText = String(rawPassword || "");
  const saved = String(storedPassword || "");

  if (isBcryptHash(saved)) {
    const valid = await bcrypt.compare(plainText, saved);
    return { valid, upgradedHash: null };
  }

  const valid = saved === plainText;
  if (!valid) {
    return { valid: false, upgradedHash: null };
  }

  return {
    valid: true,
    upgradedHash: await hashStaffPassword(plainText),
  };
};

module.exports = {
  hashStaffPassword,
  isBcryptHash,
  verifyStaffPassword,
};
