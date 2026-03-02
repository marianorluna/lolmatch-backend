//reexportar todas las funciones desde los controladores modulares
//esto mantiene la compatibilidad con las rutas existentes

const authController = require("./authController.js");
const passwordController = require("./passwordController.js");
const twoFactorController = require("./twoFactorController.js");
const sessionController = require("./sessionController.js");
const preferencesController = require("./preferencesController.js");
const accountController = require("./accountController.js");
const matchController = require("./matchController.js");
const squadNotificationController = require("./squadNotificationController.js");
const chatController = require("./chatController.js");
const profileController = require("./profileController.js");
const riotController = require("./riotController.js");
const squadController = require("./squadController.js");

module.exports = {
  //authController
  register: authController.register,
  login: authController.login,
  logout: authController.logout,
  checkSession: authController.checkSession,
  health: authController.health,
  verifyAccount: authController.verifyAccount,
  //passwordController
  forgotPassword: passwordController.forgotPassword,
  resetPassword: passwordController.resetPassword,
  changePassword: passwordController.changePassword,
  //twoFactorController
  verifyTwoFactor: twoFactorController.verifyTwoFactor,
  enableTwoFactor: twoFactorController.enableTwoFactor,
  disableTwoFactor: twoFactorController.disableTwoFactor,
  //sessionController
  getActiveSessions: sessionController.getActiveSessions,
  deleteSession: sessionController.deleteSession,
  deleteAllOtherSessions: sessionController.deleteAllOtherSessions,
  //preferencesController
  updateLoginNotification: preferencesController.updateLoginNotification,
  updateNotifications: preferencesController.updateNotifications,
  updatePreferences: preferencesController.updatePreferences,
  getTimezones: preferencesController.getTimezones,
  //accountController
  requestDeleteAccount: accountController.requestDeleteAccount,
  confirmDeleteAccount: accountController.confirmDeleteAccount,
  exportUserData: accountController.exportUserData,
  //matchController
  getUsersForMatch: matchController.getUsersForMatch,
  addMatch: matchController.addMatch,
  removeMatch: matchController.removeMatch,
  //squadNotificationController
  sendSquadInvitation: squadNotificationController.sendSquadInvitation,
  acceptSquadInvitation: squadNotificationController.acceptSquadInvitation,
  rejectSquadInvitation: squadNotificationController.rejectSquadInvitation,
  getSquadNotifications: squadNotificationController.getSquadNotifications,
  deleteSquadNotification: squadNotificationController.deleteSquadNotification,
  //chatController
  getRooms: chatController.getRooms,
  getHistory: chatController.getHistory,
  getOrCreateConversation: chatController.getOrCreateConversation,
  getConversations: chatController.getConversations,
  getPrivateHistory: chatController.getPrivateHistory,
  sendPrivateMessage: chatController.sendPrivateMessage,
  deleteConversation: chatController.deleteConversation,
  initializeDefaultRooms: chatController.initializeDefaultRooms,
  //profileController
  uploadAvatar: profileController.uploadAvatar,
  updateProfile: profileController.updateProfile,
  //riotController
  getSummoner: riotController.getSummoner,
  getLeaderboard: riotController.getLeaderboard,
  getSummonerStats: riotController.getSummonerStats,
  getStats: riotController.getStats,
  //squadController
  getSquads: squadController.getSquads,
  getSquadById: squadController.getSquadById,
  createSquad: squadController.createSquad,
  updateSquad: squadController.updateSquad,
  joinSquad: squadController.joinSquad,
  leaveSquad: squadController.leaveSquad,
  getUserSquad: squadController.getUserSquad,
  syncUserSquads: squadController.syncUserSquads,
  syncAllSquadMembers: squadController.syncAllSquadMembers,
};

