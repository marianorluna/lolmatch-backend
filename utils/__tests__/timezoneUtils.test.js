const {
    getCurrentDateInTimezone,
    convertUTCToTimezone,
    convertTimezoneToUTC,
    isValidTimezone,
    getAvailableTimezones,
    getAvailableTimezonesByOffset,
} = require('../timezoneUtils');

//test para verificar que las utilidades de timezone funcionan correctamente
describe('timezoneUtils', () => {
    describe('getCurrentDateInTimezone', () => {
        //test para verificar que retorna una fecha válida
        it('should return a valid date', () => {
            const date = getCurrentDateInTimezone('Europe/Madrid');
            expect(date).toBeInstanceOf(Date);
            expect(date.getTime()).not.toBeNaN();
        });

        //test para verificar que usa la timezone por defecto si no se especifica
        it('should use default timezone when not specified', () => {
            const date = getCurrentDateInTimezone();
            expect(date).toBeInstanceOf(Date);
        });

        //test para verificar que funciona con diferentes timezones
        it('should work with different timezones', () => {
            const madridDate = getCurrentDateInTimezone('Europe/Madrid');
            const newYorkDate = getCurrentDateInTimezone('America/New_York');
            
            expect(madridDate).toBeInstanceOf(Date);
            expect(newYorkDate).toBeInstanceOf(Date);
        });
    });

    describe('convertUTCToTimezone', () => {
        //test para verificar que convierte una fecha UTC a timezone
        it('should convert UTC date to timezone', () => {
            const utcDate = new Date('2024-01-15T12:00:00Z');
            const converted = convertUTCToTimezone(utcDate, 'Europe/Madrid');
            
            expect(converted).toBeInstanceOf(Date);
        });

        //test para verificar que retorna null si la fecha es null
        it('should return null for null date', () => {
            const result = convertUTCToTimezone(null, 'Europe/Madrid');
            expect(result).toBeNull();
        });

        //test para verificar que usa la timezone por defecto
        it('should use default timezone when not specified', () => {
            const utcDate = new Date('2024-01-15T12:00:00Z');
            const converted = convertUTCToTimezone(utcDate);
            expect(converted).toBeInstanceOf(Date);
        });
    });

    describe('convertTimezoneToUTC', () => {
        //test para verificar que convierte una fecha de timezone a UTC
        it('should convert timezone date to UTC', () => {
            const date = new Date('2024-01-15T12:00:00');
            const converted = convertTimezoneToUTC(date, 'Europe/Madrid');
            
            expect(converted).toBeInstanceOf(Date);
        });

        //test para verificar que retorna null si la fecha es null
        it('should return null for null date', () => {
            const result = convertTimezoneToUTC(null, 'Europe/Madrid');
            expect(result).toBeNull();
        });
    });

    describe('isValidTimezone', () => {
        //test para verificar que valida timezones correctamente
        it('should return true for valid timezone', () => {
            expect(isValidTimezone('Europe/Madrid')).toBe(true);
            expect(isValidTimezone('America/New_York')).toBe(true);
            expect(isValidTimezone('Asia/Tokyo')).toBe(true);
        });

        //test para verificar que retorna false para timezones inválidos
        it('should return false for invalid timezone', () => {
            expect(isValidTimezone('Invalid/Timezone')).toBe(false);
            expect(isValidTimezone('')).toBe(false);
        });
    });

    describe('getAvailableTimezones', () => {
        //test para verificar que retorna un array de timezones
        it('should return an array of timezones', () => {
            const timezones = getAvailableTimezones();
            expect(Array.isArray(timezones)).toBe(true);
            expect(timezones.length).toBeGreaterThan(0);
        });

        //test para verificar que cada timezone tiene value y label
        it('should return timezones with value and label', () => {
            const timezones = getAvailableTimezones();
            timezones.forEach(tz => {
                expect(tz).toHaveProperty('value');
                expect(tz).toHaveProperty('label');
                expect(typeof tz.value).toBe('string');
                expect(typeof tz.label).toBe('string');
            });
        });
    });

    describe('getAvailableTimezonesByOffset', () => {
        //test para verificar que retorna un array de timezones agrupados por offset
        it('should return an array of timezones grouped by offset', () => {
            const timezones = getAvailableTimezonesByOffset();
            expect(Array.isArray(timezones)).toBe(true);
            expect(timezones.length).toBeGreaterThan(0);
        });

        //test para verificar que cada timezone tiene value y label
        it('should return timezones with value and label', () => {
            const timezones = getAvailableTimezonesByOffset();
            timezones.forEach(tz => {
                expect(tz).toHaveProperty('value');
                expect(tz).toHaveProperty('label');
                expect(typeof tz.value).toBe('string');
                expect(typeof tz.label).toBe('string');
            });
        });

        //test para verificar que Europe/Madrid está incluido
        it('should include Europe/Madrid timezone', () => {
            const timezones = getAvailableTimezonesByOffset();
            const madridTz = timezones.find(tz => tz.value === 'Europe/Madrid');
            expect(madridTz).toBeDefined();
        });
    });
});

