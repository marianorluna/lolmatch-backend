function notificationsDTO(notifications = {}) {
    return {
        emailNotification: notifications.emailNotification ?? true,
        pushNotification: notifications.pushNotification ?? true,
        marketingNotification: notifications.marketingNotification ?? true,
        weeklyNotification: notifications.weeklyNotification ?? true,
        securityNotification: notifications.securityNotification ?? false,
    };
}

module.exports = notificationsDTO;

