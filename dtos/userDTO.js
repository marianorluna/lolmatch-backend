const preferencesDTO = require("./preferencesDTO");
const notificationsDTO = require("./notificationsDTO");
const addressDTO = require("./addressDTO");
const contactDTO = require("./contactDTO");
const lolStatsDTO = require("./lolStatsDTO");
const lolProfileDTO = require("./lolProfileDTO");
const securityDTO = require("./securityDTO");
const matchesDTO = require("./matchesDTO");

function userDTO(user) {
  return {
    id: user._id,
    userName: user.userName,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    isVerified: user.isVerified,
    verifiedAt: user.verifiedAt || null,
    passwordChangedAt: user.passwordChangedAt || null,
    security: securityDTO(user.security),
    preferences: preferencesDTO(user.preferences),
    notifications: notificationsDTO(user.notifications),
    address: addressDTO(user.address),
    contact: contactDTO(user.contact),
    lolStats: lolStatsDTO(user.lolStats),
    lolProfile: lolProfileDTO(user.lolProfile),
    profile: user.profile,
    matches: matchesDTO(user.matches),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

module.exports = userDTO;
