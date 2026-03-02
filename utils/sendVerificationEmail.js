const Brevo = require("@getbrevo/brevo");
const generateToken = require("./generateToken.js");

//envía un correo con un enlace que contiene un token para verificar la cuenta
const sendVerificationEmail = async (email, userId) => {
  const {
    EMAILOCTOPUS_FROM_NAME,
    EMAILOCTOPUS_FROM_EMAIL,
    BREVO_API_KEY,
    NODE_ENV,
    FRONTEND_URL_PROD,
    FRONTEND_URL_DEV,
    JWT_SECRET,
  } = process.env;

  const isProduction = NODE_ENV === "production";
  const baseUrl = isProduction ? FRONTEND_URL_PROD : FRONTEND_URL_DEV;

  //token de verificación válido por 24 horas
  const token = generateToken({ id: userId }, "24h");
  const verifyLink = `${baseUrl}/verify-account?token=${token}`;

  //configuración de la instancia de Brevo API
  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(
    Brevo.TransactionalEmailsApiApiKeys.apiKey,
    BREVO_API_KEY
  );

  //estructura del correo a enviar
  const sendSmtpEmail = {
    sender: { name: EMAILOCTOPUS_FROM_NAME, email: EMAILOCTOPUS_FROM_EMAIL },
    to: [{ email }],
    subject: "Verify Your Account",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Verify Your Account</h2>
        <p>Hello,</p>
        <p>Thank you for registering. Click the following link to verify your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Verify Account
          </a>
        </div>
        <p style="font-size: 12px; color: #666;">
          Or copy and paste this link into your browser:<br>
          <a href="${verifyLink}" style="color: #2563eb;">${verifyLink}</a>
        </p>
        <p style="color: #dc2626; font-weight: bold;">
          ⚠️ This link will expire in 24 hours.
        </p>
        <p>Welcome to LOL MATCH 🎮</p>
        <p>Thank you,<br>The LOL MATCH Team</p>
      </div>
    `,
  };

  //envío del correo usando la API de Brevo
  await apiInstance.sendTransacEmail(sendSmtpEmail);

  console.log("🔗 Enlace:", verifyLink);
  console.log("📧 Email de verificación enviado con Brevo API");
};

module.exports = sendVerificationEmail;
