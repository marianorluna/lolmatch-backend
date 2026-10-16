const { createSmtpStrategy } = require("./mailStrategies/smtpStrategy.js");
const { createBrevoStrategy } = require("./mailStrategies/brevoStrategy.js");

//fachada de correo: los utils solo consumen sendMail/verify sin conocer el proveedor
//selecciona la estrategia (Strategy/Composition) según MAIL_TRANSPORT o el entorno

const { MAIL_FROM_NAME, MAIL_FROM_EMAIL, SMTP_USER } = process.env;

const senderEmail = MAIL_FROM_EMAIL || SMTP_USER;
const senderName = MAIL_FROM_NAME || "LOL MATCH";
const MAIL_FROM = `"${senderName}" <${senderEmail}>`;

//resuelve qué transporte usar:
//- MAIL_TRANSPORT explícito (smtp|brevo) tiene prioridad
//- por defecto: brevo en producción (Render bloquea SMTP), smtp en el resto
const resolveTransport = () =>
  (process.env.MAIL_TRANSPORT || "").trim().toLowerCase() ||
  (process.env.NODE_ENV === "production" ? "brevo" : "smtp");

const createStrategy = () => {
  const transport = resolveTransport();

  if (transport === "brevo") {
    return createBrevoStrategy({
      apiKey: process.env.BREVO_API_KEY,
      sender: { name: senderName, email: senderEmail },
    });
  }

  return createSmtpStrategy({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: MAIL_FROM,
  });
};

const strategy = createStrategy();

//helper común: envía un correo delegando en la estrategia activa
const sendMail = (message) => strategy.sendMail(message);

//verifica la conexión/credenciales de la estrategia activa
const verify = () => strategy.verify();

module.exports = {
  sendMail,
  verify,
  strategy,
  MAIL_FROM,
  //expuesto solo cuando la estrategia activa es SMTP
  transporter: strategy.transporter,
};
