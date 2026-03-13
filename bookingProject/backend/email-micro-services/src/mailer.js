const nodemailer = require("nodemailer");

let transporter = null;

const resolveMailerUser = () => process.env.EMAIL_USER || process.env.EMAIL || "";
const resolveFromAddress = () => {
  const configuredFrom = String(process.env.EMAIL_FROM || "").trim();
  const user = resolveMailerUser();

  if (!configuredFrom || /example\.com/i.test(configuredFrom)) {
    return user ? `ManagelyHQ <${user}>` : configuredFrom;
  }

  return configuredFrom;
};

const getTransporter = () => {
  if (transporter) return transporter;

  const service = process.env.EMAIL_SERVICE || "gmail";
  const user = resolveMailerUser();
  const pass = process.env.EMAIL_PASS || process.env.EMAILSECRET || "";

  if (!user || !pass) {
    throw new Error("EMAIL_USER/EMAIL_PASS or EMAIL/EMAILSECRET are required.");
  }

  transporter = nodemailer.createTransport({
    service,
    auth: { user, pass },
  });

  return transporter;
};

exports.sendMail = async ({ to, subject, html, text }) => {
  const from = resolveFromAddress();
  const mailer = getTransporter();

  return mailer.sendMail({
    from,
    to,
    subject,
    html,
    text: text || "",
  });
};
