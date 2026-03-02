const jwt = require("jsonwebtoken");
const User = require("../models/User.js");
const Session = require("../models/Session.js");

//función para verificar el token
//usar en rutas protegidas
async function authMiddleware(req, res, next) {
  const token = req.cookies.authToken;
  if (!token) {
    //status 401: unauthorized (no coincide el token con el de la cookie)
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    //verificar el token con el secret de .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    //find complete user (without .select that hides fields)
    //populate matches to get match user data
    //populate mySquad to get squad member data
    const user = await User.findById(decoded.id)
      .populate({
        path: "matches.userId",
        select: "userName avatar lolProfile",
      })
      .populate({
        path: "lolProfile.mySquad.userId",
        select: "userName avatar lolProfile.roleLol lolProfile.ranks lolProfile.tier",
      });
    if (!user) return res.status(404).json({ error: "User not found" });

    //limpiar campos enum vacíos en el usuario actual si existen
    //esto previene errores de validación en futuros saves
    if (user.lolProfile) {
      let needsSave = false;
      if (user.lolProfile.tier === "") {
        user.lolProfile.tier = null;
        needsSave = true;
      }
      if (user.lolProfile.ranks === "") {
        user.lolProfile.ranks = null;
        needsSave = true;
      }
      //guardar solo si se modificó (para limpiar datos existentes)
      //no bloquear la petición si falla el guardado
      if (needsSave) {
        user.save().catch((err) => {
          console.error("Error cleaning enum fields in authMiddleware:", err.message);
        });
      }
    }

    //agregar el usuario al request
    req.user = user;

    //actualizar lastActivity de la sesión actual (si existe)
    if (token) {
      Session.updateOne(
        { token },
        { lastActivity: new Date() }
      ).catch((err) => {
        //no bloquear la petición si falla la actualización
        console.error("Error updating session activity:", err);
      });
    }

    next();
  } catch (error) {
    //status 401: unauthorized
    //log del error para debugging (solo en desarrollo)
    if (process.env.NODE_ENV === "development") {
      console.error("Auth middleware error:", error.message);
    }
    res.status(401).json({ error: "Invalid token" });
  }
}

//middleware opcional de autenticación (no falla si no hay token)
async function optionalAuthMiddleware(req, res, next) {
  const token = req.cookies.authToken;
  if (!token) {
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id)
      .populate({
        path: "matches.userId",
        select: "userName avatar lolProfile",
      })
      .populate({
        path: "lolProfile.mySquad.userId",
        select: "userName avatar lolProfile.roleLol lolProfile.ranks lolProfile.tier",
      });
    if (user) {
      req.user = user;
      if (token) {
        Session.updateOne(
          { token },
          { lastActivity: new Date() }
        ).catch((err) => {
          console.error("Error updating session activity:", err);
        });
      }
    }
    next();
  } catch (error) {
    //si el token es inválido, continuar sin autenticación
    next();
  }
}

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuthMiddleware;

//faltaría proteger luego, por roles de usuario
