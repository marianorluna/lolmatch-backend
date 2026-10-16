const { sendMail } = require("../config/mailer.js");

//envía código de autenticación de dos factores por email
const sendTwoFactorCode = async (email, code) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("Faltan variables de entorno necesarias");
  }

  try {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Verification Code</h2>
          <p>Hello,</p>
          <p>You have logged into your account. Use the following code to complete authentication:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
            <h1 style="color: #c8aa6e; font-size: 32px; letter-spacing: 5px; margin: 0;">${code}</h1>
          </div>
          <p style="color: #dc2626; font-weight: bold;">
            ⚠️ This code will expire in 10 minutes.
          </p>
          <p>If you did not request this code, ignore this message or contact support.</p>
          <p>Thank you,<br>The LOL MATCH Team</p>
        </div>
      `;

    await sendMail({
      to: email,
      subject: "Verification Code - Two-Factor Authentication",
      html,
    });

    console.log("📧 Código 2FA enviado por email");
  } catch (err) {
    console.error("❌ Error al enviar código 2FA:", err.message);
    throw new Error("No se pudo enviar el código de verificación");
  }

  return { success: true };
};

module.exports = sendTwoFactorCode;
