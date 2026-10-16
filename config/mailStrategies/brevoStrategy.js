const axios = require("axios");

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const BREVO_ACCOUNT_ENDPOINT = "https://api.brevo.com/v3/account";

//normaliza los adjuntos al formato de Brevo (contenido en base64)
const toBrevoAttachments = (attachments = []) =>
  attachments.map(({ filename, content, contentType }) => ({
    name: filename,
    content: Buffer.isBuffer(content) ? content.toString("base64") : content,
    contentType,
  }));

//estrategia de envío por la API HTTPS de Brevo (puerto 443)
//se usa en producción cuando el host bloquea los puertos SMTP (Render free)
const createBrevoStrategy = ({ apiKey, sender }) => {
  if (!apiKey) {
    console.error("❌ [mailer] Falta BREVO_API_KEY para la estrategia Brevo");
  }

  const headers = { "api-key": apiKey, "Content-Type": "application/json" };

  return {
    name: "brevo",
    sendMail: async ({ to, subject, html, text, attachments }) => {
      const payload = {
        sender,
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      };

      //Brevo rechaza un array de adjuntos vacío: solo se añade si hay contenido
      const brevoAttachments = toBrevoAttachments(attachments);
      if (brevoAttachments.length > 0) {
        payload.attachment = brevoAttachments;
      }

      const response = await axios.post(BREVO_ENDPOINT, payload, { headers });
      return response.data;
    },
    //verificación ligera: valida la API key contra el endpoint de cuenta
    verify: async () => {
      await axios.get(BREVO_ACCOUNT_ENDPOINT, {
        headers: { "api-key": apiKey },
      });
    },
  };
};

module.exports = { createBrevoStrategy };
