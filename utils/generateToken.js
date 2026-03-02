const jwt = require("jsonwebtoken");

//genera un token JWT con un payload y duración personalizada
//{Object} payload - son los datos que se incluirán en el token (ej. { id: userId })
//{string} expiresIn - Tiempo de expiración (ej. "15m", "7d", "1h")
//returns {string} token JWT firmado

const generateToken = (payload, expiresIn = "15m") => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

module.exports = generateToken;
