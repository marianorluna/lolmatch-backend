const User = require("../models/User.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const sendRecoveryEmail = require("../utils/sendRecoveryEmail.js");
const sendPasswordChangedEmail = require("../utils/sendPasswordChangedEmail.js");
const {
  forgotSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require("../schemas/authSchemas.js");
const { getCurrentDateInTimezone } = require("../utils/timezoneUtils.js");

//iniciar proceso de recuperación
const forgotPassword = async (req, res) => {
  //validación con zod
  const result = forgotSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((err) => ({
      field: err.path[0],
      message: err.message,
    }));
    //status 400: bad request
    return res.status(400).json({ errors });
  }

  //extracción de datos
  const { email } = result.data;
  try {
    //búsqueda de usuario en la base de datos
    const user = await User.findOne({ email });
    //status 404: not found
    if (!user) return res.status(404).json({ message: "User not found" });

    //enviar correo de recuperación
    await sendRecoveryEmail(user.email, user._id);
    //status 200: ok
    res.status(200).json({ message: "Recovery email sent" });
  } catch (err) {
    //status 500: server error
    console.error("Error in forgotPassword:", err);
    res
      .status(500)
      .json({ message: "Error to forgot password ❌", error: err.message });
  }
};

//finalizar proceso de recuperación
const resetPassword = async (req, res) => {
  //validación con zod
  const result = resetPasswordSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((err) => ({
      field: err.path[0],
      message: err.message,
    }));
    //status 400: bad request
    return res.status(400).json({ errors });
  }

  //extracción de datos
  const { token, newPassword } = result.data;

  try {
    //verificar el token y buscar el usuario
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    //status 404: not found
    if (!user) return res.status(404).json({ message: "User not found" });

    //actualizar el password
    user.password = newPassword;
    await user.save();

    //status 200: ok
    res.status(200).json({ message: "Password updated successfully ✅" });
  } catch (err) {
    //status 400: bad request
    res.status(400).json({ message: "Invalid or expired token ❌" });
  }
};

const changePassword = async (req, res) => {
  //validación con zod
  const result = changePasswordSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((err) => ({
      field: err.path[0],
      message: err.message,
    }));
    //status 400: bad request
    return res.status(400).json({ errors });
  }

  //req.user viene del middleware authMiddleware (JWT ya validado)
  const userId = req.user._id;

  //extracción de datos
  const { currentPassword, newPassword } = result.data;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    //comprobar contraseña actual
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    //actualizar con la nueva contraseña (el pre-save hook hasheará automáticamente)
    user.password = newPassword;
    const userTimezone = user.preferences?.timezone || "Europe/Madrid";
    user.passwordChangedAt = getCurrentDateInTimezone(userTimezone);
    await user.save();

    //enviar correo de notificación de cambio de contraseña
    sendPasswordChangedEmail(user.email, user.userName).catch((err) => {
      console.error("❌ Error al enviar correo de cambio de contraseña:", err.message);
      //no interrumpimos el flujo si falla el envío del correo
    });

    //status 200: ok
    res.status(200).json({ message: "Password changed successfully ✅" });
  } catch (err) {
    console.error("Error changing password:", err);
    //status 500: server error
    res.status(500).json({ message: "Error to change password ❌" });
  }
};

module.exports = {
  forgotPassword,
  resetPassword,
  changePassword,
};

