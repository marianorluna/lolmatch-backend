const axios = require("axios");
const Brevo = require("@getbrevo/brevo");
const generateToken = require("./generateToken.js");

const sendRecoveryEmail = async (email, userId) => {
  const {
    EMAILOCTOPUS_API_KEY,
    EMAILOCTOPUS_LIST_ID,
    EMAILOCTOPUS_FROM_NAME,
    EMAILOCTOPUS_FROM_EMAIL,
    BREVO_API_KEY,
    NODE_ENV,
    FRONTEND_URL_PROD,
    FRONTEND_URL_DEV,
  } = process.env;

  if (
    !EMAILOCTOPUS_API_KEY ||
    !EMAILOCTOPUS_LIST_ID ||
    !EMAILOCTOPUS_FROM_EMAIL ||
    !BREVO_API_KEY
  ) {
    throw new Error("Faltan variables de entorno necesarias");
  }

  const isProduction = NODE_ENV === "production";
  const baseUrl = isProduction ? FRONTEND_URL_PROD : FRONTEND_URL_DEV;
  const token = generateToken({ id: userId }, "15m");
  const resetLink = `${baseUrl}/reset-password?token=${token}`;

  //1.agregar contacto a EmailOctopus
  try {
    await axios.put(
      `https://api.emailoctopus.com/lists/${EMAILOCTOPUS_LIST_ID}/contacts`,
      {
        email_address: email,
        status: "subscribed",
      },
      {
        headers: {
          Authorization: `Bearer ${EMAILOCTOPUS_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ Contacto agregado a EmailOctopus");
  } catch (err) {
    console.error("❌ Error al agregar contacto a EmailOctopus:", err.message);
    //no detenemos el flujo si esto falla
  }

  //2.enviar correo de recuperación con Brevo API
  try {
    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      Brevo.TransactionalEmailsApiApiKeys.apiKey,
      BREVO_API_KEY
    );

    const sendSmtpEmail = {
      sender: { name: EMAILOCTOPUS_FROM_NAME, email: EMAILOCTOPUS_FROM_EMAIL },
      to: [{ email }],
      subject: "Reset Your Password",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Reset Your Password</h2>
          <p>Hello,</p>
          <p>Click the following link to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 12px; color: #666;">
            Or copy and paste this link into your browser:<br>
            <a href="${resetLink}" style="color: #2563eb;">${resetLink}</a>
          </p>
          <p style="color: #dc2626; font-weight: bold;">
            ⚠️ This link will expire in 15 minutes.
          </p>
          <p>If you did not request this change, you can safely ignore this message.</p>
          <p>Thank you,<br>The LOL MATCH Team</p>
        </div>
      `,
    };

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log("📧 Email enviado vía Brevo API");
    console.log(
      isProduction ? "" : `🔗 Enlace de restablecimiento: ${resetLink}`
    );
  } catch (err) {
    console.error("❌ Error al enviar correo con Brevo:", err.message);
    throw new Error("No se pudo enviar el correo de recuperación");
  }

  return { success: true };
};

module.exports = sendRecoveryEmail;
