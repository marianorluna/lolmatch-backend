const User = require("../models/User.js");
const {
  updateNotificationSchema,
  updateNotificationsSchema,
  updatePreferencesSchema,
} = require("../schemas/authSchemas.js");
const userDTO = require("../dtos/userDTO.js");
const { isValidTimezone } = require("../utils/timezoneUtils.js");

//actualizar configuración de notificaciones
const updateLoginNotification = async (req, res) => {
  //validación con zod
  const result = updateNotificationSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((err) => ({
      field: err.path[0],
      message: err.message,
    }));
    //status 400: bad request
    return res.status(400).json({ errors });
  }

  //req.user viene del middleware authMiddleware
  const userId = req.user._id;

  //extracción de datos
  const { isLoginNotification } = result.data;

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
    user.security.isLoginNotification = isLoginNotification;
    await user.save();

    //re-populate después de guardar
    await user.populate({
      path: "matches.userId",
      select: "userName avatar lolProfile",
    });

    //status 200: ok
    res.status(200).json({
      message: "Login notification setting updated successfully ✅",
      user: userDTO(user),
    });
  } catch (err) {
    console.error("Error updating login notification:", err);
    //status 500: server error
    res.status(500).json({ message: "Error updating notification setting ❌" });
  }
};

//actualizar preferencias de notificaciones
const updateNotifications = async (req, res) => {
  //validación con zod
  const result = updateNotificationsSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((err) => ({
      field: err.path[0],
      message: err.message,
    }));
    //status 400: bad request
    return res.status(400).json({ errors });
  }

  //req.user viene del middleware authMiddleware
  const userId = req.user._id;

  //extracción de datos
  const {
    emailNotification,
    pushNotification,
    marketingNotification,
    weeklyNotification,
    securityNotification,
  } = result.data;

  try {
    const user = await User.findById(userId).populate({
      path: "matches.userId",
      select: "userName avatar lolProfile",
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    //inicializar notifications si no existe
    if (!user.notifications) {
      user.notifications = {};
    }

    //actualizar solo los campos que se enviaron
    if (emailNotification !== undefined) {
      user.notifications.emailNotification = emailNotification;
    }
    if (pushNotification !== undefined) {
      user.notifications.pushNotification = pushNotification;
    }
    if (marketingNotification !== undefined) {
      user.notifications.marketingNotification = marketingNotification;
    }
    if (weeklyNotification !== undefined) {
      user.notifications.weeklyNotification = weeklyNotification;
    }
    if (securityNotification !== undefined) {
      user.notifications.securityNotification = securityNotification;
    }

    await user.save();

    //re-populate después de guardar
    await user.populate({
      path: "matches.userId",
      select: "userName avatar lolProfile",
    });

    //status 200: ok
    res.status(200).json({
      message: "Notification preferences updated successfully ✅",
      user: userDTO(user),
    });
  } catch (err) {
    console.error("Error updating notifications:", err);
    //status 500: server error
    res.status(500).json({ message: "Error updating notification preferences ❌" });
  }
};

//actualizar preferencias del usuario
const updatePreferences = async (req, res) => {
  //validación con zod
  const result = updatePreferencesSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((err) => ({
      field: err.path[0],
      message: err.message,
    }));
    //status 400: bad request
    return res.status(400).json({ errors });
  }

  //req.user viene del middleware authMiddleware
  const userId = req.user._id;

  //extracción de datos
  const { isVisible, theme, isPremium, accountStatus, timezone } = result.data;

  try {
    const user = await User.findById(userId).populate({
      path: "matches.userId",
      select: "userName avatar lolProfile",
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    //inicializar preferences si no existe
    if (!user.preferences) {
      user.preferences = {};
    }

    //validar timezone si se proporciona
    if (timezone !== undefined) {
      if (!isValidTimezone(timezone)) {
        return res.status(400).json({ message: "Invalid timezone" });
      }
      user.preferences.timezone = timezone;
    }

    //actualizar solo los campos que se enviaron
    if (isVisible !== undefined) {
      user.preferences.isVisible = isVisible;
    }
    if (theme !== undefined) {
      user.preferences.theme = theme;
    }
    if (isPremium !== undefined) {
      user.preferences.isPremium = isPremium;
    }
    if (accountStatus !== undefined) {
      user.preferences.accountStatus = accountStatus;
    }

    await user.save();

    //re-populate después de guardar
    await user.populate({
      path: "matches.userId",
      select: "userName avatar lolProfile",
    });

    //status 200: ok
    res.status(200).json({
      message: "Preferences updated successfully ✅",
      user: userDTO(user),
    });
  } catch (err) {
    console.error("Error updating preferences:", err);
    //status 500: server error
    res.status(500).json({ message: "Error updating preferences ❌" });
  }
};

//obtener lista de timezones disponibles (limitada a una ciudad importante por offset)
const getTimezones = async (req, res) => {
  try {
    const { getAvailableTimezonesByOffset } = require("../utils/timezoneUtils.js");
    const timezones = getAvailableTimezonesByOffset();

    //status 200: ok
    res.status(200).json({ timezones });
  } catch (err) {
    console.error("Error getting timezones:", err);
    //status 500: server error
    res.status(500).json({ message: "Error getting timezones ❌" });
  }
};

module.exports = {
  updateLoginNotification,
  updateNotifications,
  updatePreferences,
  getTimezones,
};

