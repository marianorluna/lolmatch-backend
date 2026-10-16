const User = require("../models/User.js");
const Session = require("../models/Session.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const getDeviceInfo = require("../utils/getDeviceInfo.js");
const { registerSchema, loginSchema } = require("../schemas/authSchemas.js");
const sendVerificationEmail = require("../utils/sendVerificationEmail.js");
const sendWelcomeEmail = require("../utils/sendWelcomeEmail.js");
const generateTwoFactorCode = require("../utils/generateTwoFactorCode.js");
const sendTwoFactorCode = require("../utils/sendTwoFactorCode.js");
const generateToken = require("../utils/generateToken.js");
const userDTO = require("../dtos/userDTO.js");
const { getCurrentDateInTimezone } = require("../utils/timezoneUtils.js");

const register = async (req, res) => {
  //validación con zod
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((err) => ({
      field: err.path[0],
      message: err.message,
    }));
    //status 400: bad request
    return res.status(400).json({ errors });
  }

  //extracción de datos
  const { userName, email, password } = result.data;

  try {
    //status 409: conflict
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(409).json({ message: "Email already in use" });

    //crea usuario en la base de datos
    const user = await User.create({ userName, email, password });

    //hacer populate de matches (aunque esté vacío al crear)
    await user.populate({
      path: "matches.userId",
      select: "userName avatar lolProfile",
    });

    //genera el token
    const token = generateToken({ id: user._id }, "7d");

    //crea la cookie que se envía con cada petición del token
    //usar credentials: "include" en fetch o axios
    //verificar con middleware authMiddleware
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
    });

    //status 201: created user
    res.status(201).json({
      message: "User registered successfully ✅",
      user: userDTO(user),
      //token ==>ya enviado con la cookie
    });

    //envía email de verificaración de cuenta de forma asíncrona (no bloquea la respuesta)
    //se ejecuta después de enviar la respuesta al cliente
    sendVerificationEmail(email, user._id).catch((err) => {
      console.error("❌ Error to send verification email:", err.message);
    });
  } catch (err) {
    console.error("Error to register user in database:", err);
    //status 500: server error
    res.status(500).json({ message: "Error to register user in database ❌" });
  }
};

const login = async (req, res) => {
  //validación con zod
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((err) => ({
      field: err.path[0],
      message: err.message,
    }));
    //status 400: bad request
    return res.status(400).json({ errors });
  }

  //extracción de datos
  const { email, password } = result.data;
  try {
    //búsqueda de usuario en la base de datos
    const user = await User.findOne({ email }).populate({
      path: "matches.userId",
      select: "userName avatar lolProfile",
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      //status 401: unauthorized
      return res.status(401).json({ message: "Invalid credentials" });
    }

    //bloqueaar login si no está verificado
    if (!user.isVerified) {
      return res.status(403).json({ message: "Account not verified ❌" });
    }

    //si el usuario tiene 2FA habilitado, generar y enviar código
    if (user.security?.isTwoFactorEnabled) {
      const code = generateTwoFactorCode();
      const userTimezone = user.preferences?.timezone || "Europe/Madrid";
      const expiresAt = getCurrentDateInTimezone(userTimezone);
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); //expira en 10 minutos

      user.security.twoFactorCode = code;
      user.security.twoFactorCodeExpires = expiresAt;
      await user.save();

      //enviar código por email
      await sendTwoFactorCode(user.email, code).catch((err) => {
        console.error("❌ Error al enviar código 2FA:", err.message);
      });

      //status 200: ok, pero requiere código 2FA
      return res.status(200).json({
        message: "Two-factor authentication required",
        requiresTwoFactor: true,
        email: user.email,
      });
    }

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
    //usar credentials: "include" en fetch o axios
    //verificar con middleware authMiddleware
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
    });

    //status 200: ok
    res.status(200).json({
      user: userDTO(user),
      hasOtherSessions: hasOtherSessions,
      //token ==>ya enviado con la cookie
    });
  } catch (err) {
    //status 500: server error
    res.status(500).json({ message: "Error to login user in database ❌" });
  }
};

const logout = async (req, res) => {
  try {
    //intentar eliminar la sesión actual usando el token de la cookie
    const token = req.cookies.authToken;
    if (token) {
      await Session.deleteOne({ token }).catch((err) => {
        //no bloquear el logout si falla la eliminación de sesión
        console.error("Error deleting session on logout:", err);
      });
    }
  } catch (err) {
    console.error("Error in logout:", err);
    //no bloquear el logout si falla
  }

  //configuración base de cookies para limpieza
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
  };

  //limpiar cookie sin especificar dominio (funciona para el dominio actual)
  res.clearCookie("authToken", cookieOptions);

  res.status(200).json({ message: "Logged out successfully ✅" });
};

const checkSession = async (req, res) => {
  try {
    //req.user viene del middleware authMiddleware
    res.status(200).json({ user: userDTO(req.user) });
  } catch (err) {
    res.status(500).json({ message: "Error verifying session ❌" });
  }
};

const health = async (req, res) => {
  res.status(200).send("OK");
};

//verificar cuenta de usuario
const verifyAccount = async (req, res) => {
  const { token } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isVerified = true;
    const userTimezone = user.preferences?.timezone || "Europe/Madrid";
    user.verifiedAt = getCurrentDateInTimezone(userTimezone);
    await user.save();

    await sendWelcomeEmail(user.email, user.userName);

    res.status(200).json({ message: "Account verified successfully ✅" });
  } catch (err) {
    res.status(400).json({ message: "Invalid or expired token ❌" });
  }
};

module.exports = {
  register,
  login,
  logout,
  checkSession,
  health,
  verifyAccount,
};
