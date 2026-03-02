require("dotenv").config();
const Brevo = require("@getbrevo/brevo");

//usar con: node smtpTest.js
//configuración de la instancia de Brevo API
const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

//envío de correo de prueba usando Brevo API
apiInstance
  .sendTransacEmail({
    sender: { name: "LOL MATCH", email: "info@lolmatch.online" },
    to: [{ email: "marianorluna@gmail.com" }], //reemplazar con un correo real
    subject: "Prueba SMTP",
    textContent: "Este es un correo de prueba desde Brevo API.",
  })
  .then(() => {
    console.log("✅ Correo enviado correctamente");
  })
  .catch((err) => {
    console.error("❌ Error al enviar correo:", err.message);
  });
