const { sendMail } = require("../config/mailer.js");

const sendPasswordChangedEmail = async (email, userName) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("❌ Faltan variables de entorno necesarias para enviar correo");
    return;
  }

  //enviar correo de notificación de cambio de contraseña por SMTP
  try {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Password Changed Successfully</h2>
          <p>Hello ${userName || "User"},</p>
          <p>This is a confirmation that your password has been successfully changed.</p>
          <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #1e40af;">
              <strong>Security Notice:</strong> If you did not make this change, please contact us immediately and consider resetting your password.
            </p>
          </div>
          <p style="font-size: 14px; color: #666;">
            For your security, we recommend:
          </p>
          <ul style="font-size: 14px; color: #666;">
            <li>Using a strong, unique password</li>
            <li>Not sharing your password with anyone</li>
            <li>Enabling two-factor authentication for added security</li>
          </ul>
          <p>If you have any questions or concerns, please don't hesitate to contact our support team.</p>
          <p>Thank you,<br>The LOL MATCH Team</p>
        </div>
      `;

    await sendMail({
      to: email,
      subject: "Password Changed Successfully",
      html,
    });

    console.log("📧 Email de cambio de contraseña enviado por SMTP");
  } catch (err) {
    console.error("❌ Error al enviar correo de cambio de contraseña por SMTP:", err.message);
    //no lanzamos el error para no interrumpir el flujo de cambio de contraseña
  }
};

module.exports = sendPasswordChangedEmail;
