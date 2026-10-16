const { sendMail } = require("../config/mailer.js");

//envía un email de bienvenida al verificar la cuenta de un usuario
const sendWelcomeEmail = async (email, userName) => {
  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Welcome to LOL MATCH!</h2>
        <p>Hello ${userName},</p>
        <p>Your account has been successfully verified.</p>
        <p>We are excited to have you with us. Let the game begin!</p>
        <p>Thank you,<br>The LOL MATCH Team 🎮</p>
      </div>
    `;

  //envío del correo usando el transporter SMTP
  await sendMail({
    to: email,
    subject: "Welcome to LOL MATCH!",
    html,
  });

  console.log("📧 Email de bienvenida enviado por SMTP");
};

module.exports = sendWelcomeEmail;
