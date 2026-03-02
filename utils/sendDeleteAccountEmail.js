const axios = require("axios");
const Brevo = require("@getbrevo/brevo");
const generateToken = require("./generateToken.js");

const sendDeleteAccountEmail = async (email, userId) => {
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
  const token = generateToken({ id: userId, action: "deleteAccount" }, "24h");
  const deleteLink = `${baseUrl}/delete-account?token=${token}`;

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

  //2.enviar correo de eliminación de cuenta con Brevo API
  try {
    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      Brevo.TransactionalEmailsApiApiKeys.apiKey,
      BREVO_API_KEY
    );

    const sendSmtpEmail = {
      sender: { name: EMAILOCTOPUS_FROM_NAME, email: EMAILOCTOPUS_FROM_EMAIL },
      to: [{ email }],
      subject: "Account Deletion Confirmation",
      htmlContent: `
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
      `,
    };

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log("📧 Email de eliminación de cuenta enviado vía Brevo API");
    console.log(
      isProduction ? "" : `🔗 Enlace de eliminación: ${deleteLink}`
    );
  } catch (err) {
    console.error("❌ Error al enviar correo con Brevo:", err.message);
    throw new Error("No se pudo enviar el correo de confirmación");
  }

  return { success: true };
};

module.exports = sendDeleteAccountEmail;

