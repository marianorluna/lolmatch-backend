const moment = require("moment-timezone");

/*
 * Obtiene la fecha actual en la timezone especificada
 * @param {string} timezone - Timezone del usuario (ej: "Europe/Madrid")
 * @returns {Date} - Fecha en UTC que representa la hora actual en la timezone especificada
 */
function getCurrentDateInTimezone(timezone = "Europe/Madrid") {
    //obtener la fecha/hora actual en la timezone del usuario
    const nowInTimezone = moment.tz(timezone);

    //convertir a UTC para guardar en MongoDB (MongoDB siempre guarda en UTC)
    //esto asegura que cuando se lea la fecha, se pueda convertir de vuelta a la timezone del usuario
    return nowInTimezone.utc().toDate();
}

/*
 * Convierte una fecha UTC a la timezone especificada
 * @param {Date} utcDate - Fecha en UTC
 * @param {string} timezone - Timezone destino (ej: "Europe/Madrid")
 * @returns {Date} - Fecha convertida a la timezone especificada
 */
function convertUTCToTimezone(utcDate, timezone = "Europe/Madrid") {
    if (!utcDate) return null;
    return moment.tz(utcDate, "UTC").tz(timezone).toDate();
}

/*
 * Convierte una fecha de una timezone a UTC
 * @param {Date} date - Fecha en la timezone especificada
 * @param {string} timezone - Timezone origen (ej: "Europe/Madrid")
 * @returns {Date} - Fecha convertida a UTC
 */
function convertTimezoneToUTC(date, timezone = "Europe/Madrid") {
    if (!date) return null;
    return moment.tz(date, timezone).utc().toDate();
}

/*
 * Valida si una timezone es válida
 * @param {string} timezone - Timezone a validar
 * @returns {boolean} - true si la timezone es válida
 */
function isValidTimezone(timezone) {
    return moment.tz.zone(timezone) !== null;
}

/*
 * Obtiene la lista de todas las timezones disponibles
 * @returns {Array} - Array de objetos con {value, label}
 */
function getAvailableTimezones() {
    return moment.tz.names().map((tz) => ({
        value: tz,
        label: tz.replace(/_/g, " "),
    }));
}

/*
 * Formatea el offset en minutos a formato legible (ej: "UTC+1", "UTC-5")
 * @param {number} offsetMinutes - Offset en minutos
 * @returns {string} - Offset formateado como "UTC+X" o "UTC-X"
 */
function formatOffset(offsetMinutes) {
    const hours = offsetMinutes / 60;
    const sign = hours >= 0 ? "+" : "";
    return `UTC${sign}${hours}`;
}

/*
 * Obtiene la lista de timezones limitada a una ciudad importante por offset
 * @returns {Array} - Array de objetos con {value, label} filtrado por offset
 */
function getAvailableTimezonesByOffset() {
    const allTimezones = moment.tz.names();
    //usar una fecha en invierno (enero) para obtener el offset estándar sin DST
    const winterDate = moment.tz("2024-01-15 12:00:00", "UTC");

    //mapa para almacenar el mejor timezone por cada offset (en minutos)
    const timezonesByOffset = new Map();

    //lista de ciudades prioritarias (ordenadas por importancia)
    //Europe/Madrid se asegura que esté siempre presente
    const priorityCities = [
        "Europe/Madrid", //zona por defecto, asegurar que esté primero
        "Europe/London",
        "Europe/Paris",
        "Europe/Rome",
        "Europe/Berlin",
        "Europe/Amsterdam",
        "Europe/Athens",
        "Europe/Moscow",
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "America/Mexico_City",
        "America/Sao_Paulo",
        "America/Buenos_Aires",
        "America/Lima",
        "America/Bogota",
        "Asia/Tokyo",
        "Asia/Shanghai",
        "Asia/Hong_Kong",
        "Asia/Singapore",
        "Asia/Dubai",
        "Asia/Kolkata",
        "Asia/Bangkok",
        "Asia/Seoul",
        "Australia/Sydney",
        "Australia/Melbourne",
        "Pacific/Auckland",
        "Africa/Cairo",
        "Africa/Johannesburg",
        "Africa/Lagos",
    ];

    //primero, agregar todas las ciudades prioritarias
    priorityCities.forEach((tz) => {
        if (allTimezones.includes(tz)) {
            //obtener el offset en invierno (sin DST) para agrupar correctamente
            const offset = winterDate.clone().tz(tz).utcOffset();
            //si ya existe un timezone para este offset, solo reemplazarlo si es Europe/Madrid (prioridad)
            if (!timezonesByOffset.has(offset) || tz === "Europe/Madrid") {
                timezonesByOffset.set(offset, tz);
            }
        }
    });

    //luego, para los offsets que no tienen una ciudad prioritaria, seleccionar la primera disponible
    allTimezones.forEach((tz) => {
        const offset = winterDate.clone().tz(tz).utcOffset();
        if (!timezonesByOffset.has(offset)) {
            //preferir timezones con nombres más cortos y reconocibles
            //evitar timezones con muchos guiones bajos o nombres muy largos
            const parts = tz.split("/");
            if (parts.length === 2) {
                //formato: Continent/City
                timezonesByOffset.set(offset, tz);
            }
        }
    });

    //convertir el mapa a array y ordenar por offset
    const result = Array.from(timezonesByOffset.entries())
        .map(([offset, tz]) => {
            const formattedOffset = formatOffset(offset);
            const cityName = tz.replace(/_/g, " ");
            return {
                value: tz,
                label: `${cityName} (${formattedOffset})`,
                offset: offset,
            };
        })
        .sort((a, b) => a.offset - b.offset)
        .map(({ value, label }) => ({ value, label }));

    return result;
}

module.exports = {
    getCurrentDateInTimezone,
    convertUTCToTimezone,
    convertTimezoneToUTC,
    isValidTimezone,
    getAvailableTimezones,
    getAvailableTimezonesByOffset,
};

