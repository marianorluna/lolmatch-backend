function preferencesDTO(prefs = {}) {
  return {
    theme: prefs.theme || "dark",
    isPremium: prefs.isPremium || false,
    isVisible: prefs.isVisible ?? true,
    accountStatus: prefs.accountStatus || "active",
    timezone: prefs.timezone || "Europe/Madrid",
  };
}

module.exports = preferencesDTO;
