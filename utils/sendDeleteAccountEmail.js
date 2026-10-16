const { sendMail } = require("../config/mailer.js");
const generateToken = require("./generateToken.js");

const sendDeleteAccountEmail = async (email, userId) => {
  const { NODE_ENV, FRONTEND_URL_PROD, FRONTEND_URL_DEV } = process.env;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("Faltan variables de entorno necesarias");
  }

  const isProduction = NODE_ENV === "production";
  const baseUrl = isProduction ? FRONTEND_URL_PROD : FRONTEND_URL_DEV;
  const token = generateToken({ id: userId, action: "deleteAccount" }, "24h");
  const deleteLink = `${baseUrl}/delete-account?token=${token}`;

  const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626;">Account Deletion Confirmation</h2>
          <p>Hello,</p>
          <p>You have requested to delete your LOL MATCH account. This action is <strong>irreversible</strong> and will permanently delete:</p>
          <ul>
            <li>Your user account</li>
            <li>All your personal data</li>
            <li>All your statistics and settings</li>
            <li>All your active sessions</li>
          </ul>
          <p>If you really want to delete your account, click the following button:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${deleteLink}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Confirm Account Deletion
            </a>
          </div>
          <p style="font-size: 12px; color: #666;">
            Or copy and paste this link into your browser:<br>
            <a href="${deleteLink}" style="color: #2563eb;">${deleteLink}</a>
          </p>
          <p style="color: #dc2626; font-weight: bold;">
            ⚠️ This link will expire in 24 hours.
          </p>
          <p>If you did not request this deletion, you can safely ignore this message. Your account will remain active.</p>
          <p>Thank you,<br>The LOL MATCH Team</p>
        </div>
      `;

  //envío del correo de eliminación de cuenta por SMTP
  try {
    await sendMail({
      to: email,
      subject: "Account Deletion Confirmation",
      html,
    });

    console.log("📧 Email de eliminación de cuenta enviado por SMTP");
    console.log(
      isProduction ? "" : `🔗 Enlace de eliminación: ${deleteLink}`
    );
  } catch (err) {
    console.error("❌ Error al enviar correo por SMTP:", err.message);
    throw new Error("No se pudo enviar el correo de confirmación");
  }

  return { success: true };
};

module.exports = sendDeleteAccountEmail;
