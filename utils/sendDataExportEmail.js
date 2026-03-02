const Brevo = require("@getbrevo/brevo");

//envía un correo con un archivo JSON adjunto que contiene todos los datos del usuario
const sendDataExportEmail = async (email, userName, userData) => {
    const {
        EMAILOCTOPUS_FROM_NAME,
        EMAILOCTOPUS_FROM_EMAIL,
        BREVO_API_KEY,
    } = process.env;

    if (!EMAILOCTOPUS_FROM_EMAIL || !BREVO_API_KEY) {
        throw new Error("Missing required environment variables");
    }

    try {
        // Convertir los datos del usuario a JSON
        const jsonData = JSON.stringify(userData, null, 2);
        const jsonBuffer = Buffer.from(jsonData, "utf-8");
        const jsonBase64 = jsonBuffer.toString("base64");

        // Nombre del archivo con fecha
        // Brevo no acepta archivos .json, usamos .txt en su lugar
        const date = new Date().toISOString().split("T")[0];
        const fileName = `lol-match-data-export-${date}.txt`;

        const apiInstance = new Brevo.TransactionalEmailsApi();
        apiInstance.setApiKey(
            Brevo.TransactionalEmailsApiApiKeys.apiKey,
            BREVO_API_KEY
        );

        const sendSmtpEmail = {
            sender: { name: EMAILOCTOPUS_FROM_NAME, email: EMAILOCTOPUS_FROM_EMAIL },
            to: [{ email }],
            subject: "Your Data Export - LOL MATCH",
            htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Your Data Export</h2>
          <p>Hello ${userName},</p>
          <p>As requested, we have prepared a complete export of your personal data. Your data export is attached to this email as a text file containing JSON data.</p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">📎 Attached file: ${fileName}</p>
          </div>
          <p>The file contains all your account information, including:</p>
          <ul style="line-height: 1.8;">
            <li>Account details (username, email, role)</li>
            <li>Profile information (avatar, preferences, visibility settings)</li>
            <li>Security settings (2FA status, login notifications)</li>
            <li>Notification preferences</li>
            <li>Contact information</li>
            <li>Address information</li>
            <li>League of Legends profile and statistics</li>
            <li>Account creation and update dates</li>
          </ul>
          <p style="color: #dc2626; font-weight: bold;">
            ⚠️ Please keep this file secure and do not share it with anyone.
          </p>
          <p>If you did not request this data export, please contact our support team immediately.</p>
          <p>Thank you,<br>The LOL MATCH Team</p>
        </div>
      `,
            attachment: [
                {
                    name: fileName,
                    content: jsonBase64,
                    contentType: "text/plain",
                },
            ],
        };

        await apiInstance.sendTransacEmail(sendSmtpEmail);

        console.log("📧 Data export email sent via Brevo API");
    } catch (err) {
        console.error("❌ Error sending data export email with Brevo:", err);
        console.error("❌ Error details:", err.response?.data || err.message);
        throw new Error(`Could not send data export email: ${err.message}`);
    }

    return { success: true };
};

module.exports = sendDataExportEmail;

