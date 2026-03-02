const User = require("../models/User.js");
const Session = require("../models/Session.js");
const jwt = require("jsonwebtoken");
const sendDeleteAccountEmail = require("../utils/sendDeleteAccountEmail.js");
const sendDataExportEmail = require("../utils/sendDataExportEmail.js");
const { deleteAccountSchema } = require("../schemas/authSchemas.js");

//solicitar eliminación de cuenta (envía correo de confirmación)
const requestDeleteAccount = async (req, res) => {
  //req.user viene del middleware authMiddleware
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    //enviar correo de confirmación de eliminación
    await sendDeleteAccountEmail(user.email, user._id);

    //status 200: ok
    res.status(200).json({
      message: "Confirmation email sent. Please check your inbox to confirm account deletion.",
    });
  } catch (err) {
    console.error("Error requesting account deletion:", err);
    //status 500: server error
    res.status(500).json({
      message: "Error sending confirmation email ❌",
      error: err.message,
    });
  }
};

//confirmar y eliminar cuenta (desde el enlace del correo)
const confirmDeleteAccount = async (req, res) => {
  //validación con zod
  const result = deleteAccountSchema.safeParse(req.query);
  if (!result.success) {
    const errors = result.error.issues.map((err) => ({
      field: err.path[0],
      message: err.message,
    }));
    //status 400: bad request
    return res.status(400).json({ errors });
  }

  //extracción de datos
  const { token } = req.query;

  try {
    //verificar el token y buscar el usuario
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    //verificar que el token sea para eliminación de cuenta
    if (decoded.action !== "deleteAccount") {
      return res.status(400).json({ message: "Invalid token for account deletion ❌" });
    }

    const user = await User.findById(decoded.id);
    //status 404: not found
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    //eliminar todas las sesiones del usuario
    await Session.deleteMany({ userId: user._id });

    //eliminar el usuario (esto eliminará todos sus datos debido a las referencias)
    await User.findByIdAndDelete(user._id);

    //limpiar la cookie si existe
    res.clearCookie("authToken", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      path: "/",
    });

    //status 200: ok
    res.status(200).json({
      message: "Account deleted successfully ✅",
    });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      //status 400: bad request
      return res.status(400).json({ message: "Invalid or expired token ❌" });
    }
    console.error("Error deleting account:", err);
    //status 500: server error
    res.status(500).json({ message: "Error deleting account ❌" });
  }
};

//exportar datos del usuario
const exportUserData = async (req, res) => {
  //req.user viene del middleware authMiddleware
  const user = req.user;

  try {
    //obtener todas las sesiones activas del usuario
    const sessions = await Session.find({ userId: user._id }).select(
      "-token -__v"
    );

    //preparar los datos del usuario para exportar
    //convertir fechas de Mongoose a strings ISO para serialización JSON
    const userData = {
      account: {
        id: user._id.toString(),
        userName: user.userName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified,
        verifiedAt: user.verifiedAt ? new Date(user.verifiedAt).toISOString() : null,
        passwordChangedAt: user.passwordChangedAt ? new Date(user.passwordChangedAt).toISOString() : null,
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
        updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : null,
      },
      preferences: user.preferences ? JSON.parse(JSON.stringify(user.preferences)) : {},
      notifications: user.notifications ? JSON.parse(JSON.stringify(user.notifications)) : {},
      security: {
        isTwoFactorEnabled: user.security?.isTwoFactorEnabled || false,
        isLoginNotification: user.security?.isLoginNotification || false,
        //no incluir códigos sensibles
      },
      address: user.address ? JSON.parse(JSON.stringify(user.address)) : {},
      contact: user.contact ? JSON.parse(JSON.stringify(user.contact)) : {},
      lolStats: user.lolStats ? JSON.parse(JSON.stringify(user.lolStats)) : {},
      lolProfile: user.lolProfile ? JSON.parse(JSON.stringify(user.lolProfile)) : {},
      activeSessions: sessions.map((session) => ({
        id: session._id.toString(),
        deviceInfo: session.deviceInfo ? JSON.parse(JSON.stringify(session.deviceInfo)) : {},
        isCurrentSession: session.isCurrentSession || false,
        lastActivity: session.lastActivity ? new Date(session.lastActivity).toISOString() : null,
        createdAt: session.createdAt ? new Date(session.createdAt).toISOString() : null,
      })),
      exportDate: new Date().toISOString(),
    };

    //enviar el correo con los datos adjuntos
    await sendDataExportEmail(user.email, user.userName, userData);

    //status 200: ok
    res.status(200).json({
      message: "Data export email sent successfully ✅",
    });
  } catch (err) {
    console.error("Error exporting user data:", err);
    console.error("Error stack:", err.stack);
    //status 500: server error
    res.status(500).json({
      message: err.message || "Error exporting user data ❌",
      error: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
};

module.exports = {
  requestDeleteAccount,
  confirmDeleteAccount,
  exportUserData,
};

