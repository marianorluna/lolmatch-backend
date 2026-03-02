const express = require("express");
const authRouter = express.Router();
const User = require("../models/User.js");

const {
  register,
  login,
  forgotPassword,
  resetPassword,
  logout,
  checkSession,
  health,
  verifyAccount,
  changePassword,
  verifyTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  updateLoginNotification,
  updateNotifications,
  updatePreferences,
  requestDeleteAccount,
  confirmDeleteAccount,
  getActiveSessions,
  deleteSession,
  deleteAllOtherSessions,
  exportUserData,
  getUsersForMatch,
  addMatch,
  removeMatch,
  getTimezones,
  sendSquadInvitation,
  acceptSquadInvitation,
  rejectSquadInvitation,
  getSquadNotifications,
  deleteSquadNotification,
} = require("../controllers/indexController.js");
const authMiddleware = require("../middlewares/authMiddleware.js");

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/reset-password", resetPassword);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/logout", logout);
authRouter.get("/check", authMiddleware, checkSession);
authRouter.get("/health", health);
authRouter.post("/verify-account", verifyAccount);
authRouter.post("/change-password", authMiddleware, changePassword);
authRouter.post("/verify-two-factor", verifyTwoFactor);
authRouter.post("/enable-two-factor", authMiddleware, enableTwoFactor);
authRouter.post("/disable-two-factor", authMiddleware, disableTwoFactor);
authRouter.patch("/update-login-notification", authMiddleware, updateLoginNotification);
authRouter.patch("/update-notifications", authMiddleware, updateNotifications);
authRouter.patch("/update-preferences", authMiddleware, updatePreferences);
authRouter.post("/request-delete-account", authMiddleware, requestDeleteAccount);
authRouter.post("/confirm-delete-account", confirmDeleteAccount);
authRouter.get("/active-sessions", authMiddleware, getActiveSessions);
authRouter.delete("/active-sessions/:sessionId", authMiddleware, deleteSession);
authRouter.delete("/active-sessions", authMiddleware, deleteAllOtherSessions);
authRouter.post("/export-data", authMiddleware, exportUserData);
authRouter.get("/users-for-match", authMiddleware, getUsersForMatch);
authRouter.post("/add-match", authMiddleware, addMatch);
authRouter.delete("/remove-match", authMiddleware, removeMatch);
authRouter.get("/timezones", getTimezones);
authRouter.post("/send-squad-invitation", authMiddleware, sendSquadInvitation);
authRouter.post("/accept-squad-invitation", authMiddleware, acceptSquadInvitation);
authRouter.post("/reject-squad-invitation", authMiddleware, rejectSquadInvitation);
authRouter.get("/squad-notifications", authMiddleware, getSquadNotifications);
authRouter.delete("/squad-notifications", authMiddleware, deleteSquadNotification);



module.exports = authRouter;
