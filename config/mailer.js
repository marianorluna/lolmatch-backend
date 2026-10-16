const nodemailer = require("nodemailer");

//único punto que conoce el proveedor SMTP (Zoho Mail)
//los utils de email solo consumen sendMail, sin conocer el transporte concreto
const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM_NAME,
  MAIL_FROM_EMAIL,
} = process.env;

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.error(
    "❌ [mailer] Faltan variables de entorno SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS)"
  );
}

//transporter de nodemailer para Zoho
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 465,
  secure: SMTP_SECURE === "true", // true para puerto 465 (SSL)
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

//remitente por defecto en formato "Nombre" <email>
const MAIL_FROM = `"${MAIL_FROM_NAME || "LOL MATCH"}" <${
  MAIL_FROM_EMAIL || SMTP_USER
}>`;

//helper que envía un correo usando el transporter de Zoho
//attachments es opcional (array de objetos de nodemailer)
const sendMail = ({ to, subject, html, text, attachments }) =>
  transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject,
    html,
    text,
    attachments,
  });

module.exports = { transporter, sendMail, MAIL_FROM };
