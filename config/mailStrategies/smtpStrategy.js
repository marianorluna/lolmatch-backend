const nodemailer = require("nodemailer");

//estrategia de envío por SMTP (nodemailer)
//útil en desarrollo/local, donde no hay bloqueo de puertos SMTP
//NOTA: en Render free los puertos 25/465/587 están bloqueados (ver brevoStrategy)
const createSmtpStrategy = ({ host, port, secure, user, pass, from }) => {
  const transporter = nodemailer.createTransport({
    host,
    port: Number(port) || 465,
    secure: secure === "true", // true para puerto 465 (SSL)
    auth: { user, pass },
  });

  return {
    name: "smtp",
    //attachments: nodemailer acepta content como Buffer directamente
    sendMail: ({ to, subject, html, text, attachments }) =>
      transporter.sendMail({ from, to, subject, html, text, attachments }),
    verify: () => transporter.verify(),
    transporter,
  };
};

module.exports = { createSmtpStrategy };
