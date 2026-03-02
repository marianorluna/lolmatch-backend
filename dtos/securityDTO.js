//DTO para los campos de seguridad del usuario
//no incluye códigos sensibles (twoFactorCode, twoFactorCodeExpires)

function securityDTO(security) {
  if (!security) {
    return {
      isTwoFactorEnabled: false,
      isLoginNotification: false,
    };
  }

  return {
    isTwoFactorEnabled: security.isTwoFactorEnabled || false,
    isLoginNotification: security.isLoginNotification ?? false,
  };
}

module.exports = securityDTO;

