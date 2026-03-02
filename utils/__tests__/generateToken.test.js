const generateToken = require('../generateToken');
const jwt = require('jsonwebtoken');

//test para verificar que la generación de tokens JWT funciona correctamente
describe('generateToken', () => {
    //configurar JWT_SECRET para los tests
    const originalSecret = process.env.JWT_SECRET;
    
    beforeAll(() => {
        process.env.JWT_SECRET = 'test-secret-key-for-jwt';
    });

    afterAll(() => {
        process.env.JWT_SECRET = originalSecret;
    });

    //test para verificar que genera un token válido
    it('should generate a valid JWT token', () => {
        const payload = { id: '123', email: 'test@example.com' };
        const token = generateToken(payload);
        
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.split('.').length).toBe(3); // JWT tiene 3 partes separadas por puntos
    });

    //test para verificar que el token puede ser decodificado
    it('should generate a token that can be decoded', () => {
        const payload = { id: '456', username: 'testuser' };
        const token = generateToken(payload);
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        expect(decoded.id).toBe(payload.id);
        expect(decoded.username).toBe(payload.username);
    });

    //test para verificar que el token expira según el tiempo especificado
    it('should generate token with custom expiration', () => {
        const payload = { id: '789' };
        const token = generateToken(payload, '1h');
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        expect(decoded).toHaveProperty('exp');
        expect(decoded).toHaveProperty('iat');
    });

    //test para verificar que usa el tiempo de expiración por defecto
    it('should use default expiration time when not specified', () => {
        const payload = { id: '999' };
        const token = generateToken(payload);
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        expect(decoded).toHaveProperty('exp');
    });

    //test para verificar que diferentes payloads generan diferentes tokens
    it('should generate different tokens for different payloads', () => {
        const payload1 = { id: '111' };
        const payload2 = { id: '222' };
        
        const token1 = generateToken(payload1);
        const token2 = generateToken(payload2);
        
        expect(token1).not.toBe(token2);
    });
});

