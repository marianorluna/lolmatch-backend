/*
 * Middleware de Mongoose para ajustar las fechas según la timezone del usuario
 * antes de guardar en la base de datos 
 * MongoDB siempre guarda las fechas en UTC. Este middleware asegura que cuando
 * se establecen fechas usando getCurrentDateInTimezone(), se guarden correctamente.
 * Las fechas ya deben venir convertidas desde el código que las establece,
 * este middleware solo asegura que las fechas en arrays (como matches) se manejen correctamente.
 */
function timezoneMiddleware(schema) {
    //hook pre-save que asegura que las fechas en arrays se manejen correctamente
    schema.pre("save", function (next) {
        const user = this;

        //ajustar fechas en arrays (ej: matches.addedAt, mySquad.addedAt)
        //estas fechas ya deberían venir convertidas desde el código que las establece
        //por si acaso, las aseguramos aquí
        if (user.matches && Array.isArray(user.matches)) {
            user.matches.forEach((match) => {
                if (match.addedAt && match.addedAt instanceof Date) {
                    //la fecha ya debería estar en UTC, solo nos aseguramos de que sea válida
                    if (isNaN(match.addedAt.getTime())) {
                        //si la fecha es inválida, usar la fecha actual
                        match.addedAt = new Date();
                    }
                }
            });
        }
        //ajustar fechas en mySquad
        if (user.lolProfile?.mySquad && Array.isArray(user.lolProfile.mySquad)) {
            user.lolProfile.mySquad.forEach((member) => {
                if (member.addedAt && member.addedAt instanceof Date) {
                    if (isNaN(member.addedAt.getTime())) {
                        member.addedAt = new Date();
                    }
                }
            });
        }
        //ajustar fechas en squadNotifications
        if (user.squadNotifications && Array.isArray(user.squadNotifications)) {
            user.squadNotifications.forEach((notif) => {
                if (notif.createdAt && notif.createdAt instanceof Date) {
                    if (isNaN(notif.createdAt.getTime())) {
                        notif.createdAt = new Date();
                    }
                }
                if (notif.readAt && notif.readAt instanceof Date) {
                    if (isNaN(notif.readAt.getTime())) {
                        notif.readAt = new Date();
                    }
                }
            });
        }

        next();
    });
}

module.exports = timezoneMiddleware;

