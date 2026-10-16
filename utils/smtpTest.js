require("dotenv").config();
const { verify, sendMail, strategy } = require("../config/mailer.js");

//usar con: node utils/smtpTest.js
//verifica la estrategia de correo activa (SMTP o Brevo) y envía un correo de prueba
const testMail = async () => {
  try {
    console.log(`📮 Transporte activo: ${strategy.name}`);

    await verify();
    console.log("✅ Conexión/credenciales verificadas");

    await sendMail({
      to: "marianorluna@gmail.com", //reemplazar con un correo real
      subject: "Prueba SMTP",
      text: "Este es un correo de prueba desde LOL MATCH.",
      html: "<p>Este es un correo de prueba desde LOL MATCH.</p>",
    });

    console.log("✅ Correo enviado correctamente");
  } catch (err) {
    console.error("❌ Error al enviar correo:", err.response?.data || err.message);
  }
};

testMail();
