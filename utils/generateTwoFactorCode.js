//genera un código de 6 dígitos para autenticación de dos factores

function generateTwoFactorCode() {
  //genera un número aleatorio de 6 dígitos (100000 a 999999)
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = generateTwoFactorCode;

