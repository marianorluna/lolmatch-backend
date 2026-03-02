const Brevo = require("@getbrevo/brevo");

//envía un email de verificación al registrarse un nuevo usuario
const sendWelcomeEmail = async (email, userName) => {
  const {
    EMAILOCTOPUS_FROM_NAME,
    EMAILOCTOPUS_FROM_EMAIL,
    BREVO_API_KEY,
    NODE_ENV,
  } = process.env;

  const isProduction = NODE_ENV === "production";

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
    subject: "Welcome to LOL MATCH!",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Welcome to LOL MATCH!</h2>
        <p>Hello ${userName},</p>
        <p>Your account has been successfully verified.</p>
        <p>We are excited to have you with us. Let the game begin!</p>
        <p>Thank you,<br>The LOL MATCH Team 🎮</p>
      </div>
    `,
  };

  //envío del correo usando la API de Brevo
  await apiInstance.sendTransacEmail(sendSmtpEmail);

  console.log("📧 Email de bienvenida enviado con Brevo API");
};

module.exports = sendWelcomeEmail;
