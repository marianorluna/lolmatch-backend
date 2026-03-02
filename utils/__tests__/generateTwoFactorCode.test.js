const generateTwoFactorCode = require('../generateTwoFactorCode');

//test para verificar que la generación de códigos 2FA funciona correctamente
describe('generateTwoFactorCode', () => {
    //test para verificar que genera un código de 6 dígitos
    it('should generate a 6-digit code', () => {
        const code = generateTwoFactorCode();
        expect(code).toHaveLength(6);
        expect(/^\d{6}$/.test(code)).toBe(true);
    });

    //test para verificar que el código es un string
    it('should return a string', () => {
        const code = generateTwoFactorCode();
        expect(typeof code).toBe('string');
    });

    //test para verificar que el código está en el rango correcto (100000-999999)
    it('should generate code between 100000 and 999999', () => {
        const code = generateTwoFactorCode();
        const codeNumber = parseInt(code, 10);
        expect(codeNumber).toBeGreaterThanOrEqual(100000);
        expect(codeNumber).toBeLessThanOrEqual(999999);
    });

    //test para verificar que genera códigos diferentes en múltiples llamadas
    it('should generate different codes on multiple calls', () => {
        const codes = new Set();
        //generar 100 códigos y verificar que son únicos (probabilísticamente)
        for (let i = 0; i < 100; i++) {
            codes.add(generateTwoFactorCode());
        }
        //debería haber al menos algunos códigos únicos (no todos iguales)
        expect(codes.size).toBeGreaterThan(1);
    });

    //test para verificar que el código solo contiene dígitos
    it('should generate code with only digits', () => {
        const code = generateTwoFactorCode();
        expect(/^\d+$/.test(code)).toBe(true);
    });
});

