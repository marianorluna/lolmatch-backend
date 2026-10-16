require("dotenv").config();
const { transporter, sendMail } = require("../config/mailer.js");

//usar con: node utils/smtpTest.js
//verifica la conexión SMTP con Zoho y envía un correo de prueba
const testSmtp = async () => {
  try {
    await transporter.verify();
    console.log("✅ Conexión SMTP con Zoho verificada");

    await sendMail({
      to: "marianorluna@gmail.com", //reemplazar con un correo real
      subject: "Prueba SMTP",
      text: "Este es un correo de prueba desde Zoho SMTP.",
      html: "<p>Este es un correo de prueba desde Zoho SMTP.</p>",
    });

    console.log("✅ Correo enviado correctamente");
  } catch (err) {
    console.error("❌ Error al enviar correo:", err.message);
  }
};

testSmtp();
