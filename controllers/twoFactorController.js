const User = require("../models/User.js");
const Session = require("../models/Session.js");
const generateTwoFactorCode = require("../utils/generateTwoFactorCode.js");
const sendTwoFactorCode = require("../utils/sendTwoFactorCode.js");
const generateToken = require("../utils/generateToken.js");
const getDeviceInfo = require("../utils/getDeviceInfo.js");
const { verifyTwoFactorSchema } = require("../schemas/authSchemas.js");
const userDTO = require("../dtos/userDTO.js");
const { getCurrentDateInTimezone } = require("../utils/timezoneUtils.js");

//verificar código 2FA y completar login
const verifyTwoFactor = async (req, res) => {
  //validación con zod
  const result = verifyTwoFactorSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((err) => ({
      field: err.path[0],
      message: err.message,
    }));
    //status 400: bad request
    return res.status(400).json({ errors });
  }

  //extracción de datos
  const { email, code } = result.data;

  try {
    //búsqueda de usuario en la base de datos
    const user = await User.findOne({ email }).populate({
      path: "matches.userId",
      select: "userName avatar lolProfile",
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    //verificar que el código coincida y no haya expirado
    if (
      !user.security?.twoFactorCode ||
      user.security.twoFactorCode !== code ||
      !user.security.twoFactorCodeExpires ||
      new Date() > user.security.twoFactorCodeExpires
    ) {
      return res.status(400).json({ message: "Invalid or expired code ❌" });
    }

    //limpiar el código usado
    user.security.twoFactorCode = null;
    user.security.twoFactorCodeExpires = null;
    await user.save();

    //genera el token
    const token = generateToken({ id: user._id }, "7d");

    //obtener información del dispositivo
    const deviceInfo = getDeviceInfo(req);

    //marcar todas las sesiones anteriores como no actuales
    await Session.updateMany(
      { userId: user._id },
      { isCurrentSession: false }
    );

    //crear nueva sesión
    const session = await Session.create({
      userId: user._id,
      token,
      deviceInfo,
      isCurrentSession: true,
      lastActivity: new Date(),
    });

    //si el usuario tiene notificaciones de login habilitadas, verificar si hay otras sesiones
    let hasOtherSessions = false;
    if (user.security?.isLoginNotification) {
      const otherSessions = await Session.countDocuments({
        userId: user._id,
        _id: { $ne: session._id },
        lastActivity: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, //últimos 7 días
      });
      hasOtherSessions = otherSessions > 0;
    }

    //crea la cookie que se envía con cada petición del token
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
    });

    //user ya está populado desde verifyTwoFactor
    //status 200: ok
    res.status(200).json({
      message: "Two-factor authentication verified successfully ✅",
      user: userDTO(user),
      hasOtherSessions: hasOtherSessions,
    });
  } catch (err) {
    console.error("Error verifying two-factor code:", err);
    //status 500: server error
    res.status(500).json({ message: "Error verifying two-factor code ❌" });
  }
};

//habilitar autenticación de dos factores
const enableTwoFactor = async (req, res) => {
  //req.user viene del middleware authMiddleware
  const userId = req.user._id;

  try {
    const user = await User.findById(userId).populate({
      path: "matches.userId",
      select: "userName avatar lolProfile",
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    //inicializar security si no existe
    if (!user.security) {
      user.security = {};
    }
    user.security.isTwoFactorEnabled = true;
    await user.save();

    //re-populate después de guardar
    await user.populate({
      path: "matches.userId",
      select: "userName avatar lolProfile",
    });

    //status 200: ok
    res.status(200).json({
      message: "Two-factor authentication enabled successfully ✅",
      user: userDTO(user),
    });
  } catch (err) {
    console.error("Error enabling two-factor:", err);
    //status 500: server error
    res.status(500).json({ message: "Error enabling two-factor ❌" });
  }
};

//deshabilitar autenticación de dos factores
const disableTwoFactor = async (req, res) => {
  //req.user viene del middleware authMiddleware
  const userId = req.user._id;

  try {
    const user = await User.findById(userId).populate({
      path: "matches.userId",
      select: "userName avatar lolProfile",
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    //inicializar security si no existe
    if (!user.security) {
      user.security = {};
    }
    user.security.isTwoFactorEnabled = false;
    user.security.twoFactorCode = null;
    user.security.twoFactorCodeExpires = null;
    await user.save();

    //re-populate después de guardar
    await user.populate({
      path: "matches.userId",
      select: "userName avatar lolProfile",
    });

    //status 200: ok
    res.status(200).json({
      message: "Two-factor authentication disabled successfully ✅",
      user: userDTO(user),
    });
  } catch (err) {
    console.error("Error disabling two-factor:", err);
    //status 500: server error
    res.status(500).json({ message: "Error disabling two-factor ❌" });
  }
};

module.exports = {
  verifyTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
};

