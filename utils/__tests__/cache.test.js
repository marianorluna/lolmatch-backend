const { get, set } = require('../cache');

//test para verificar que el sistema de caché funciona correctamente
describe('Cache', () => {
    beforeEach(() => {
        //limpiar el caché antes de cada test
        //como no tenemos un método clear, vamos a usar set con valores conocidos
    });

    //test para verificar que se puede guardar un valor en el caché
    it('should set a value in cache', () => {
        const key = 'test-key';
        const value = 'test-value';
        set(key, value);
        const result = get(key);
        expect(result).toBe(value);
    });

    //test para verificar que se puede obtener un valor del caché
    it('should get a value from cache', () => {
        const key = 'test-key-2';
        const value = { data: 'test' };
        set(key, value);
        const result = get(key);
        expect(result).toEqual(value);
    });

    //test para verificar que retorna undefined si la clave no existe
    it('should return undefined for non-existent key', () => {
        const result = get('non-existent-key');
        expect(result).toBeUndefined();
    });

    //test para verificar que se puede actualizar un valor en el caché
    it('should update a value in cache', () => {
        const key = 'test-key-3';
        const initialValue = 'initial';
        const updatedValue = 'updated';

        set(key, initialValue);
        expect(get(key)).toBe(initialValue);

        set(key, updatedValue);
        expect(get(key)).toBe(updatedValue);
    });

    //test para verificar que funciona con diferentes tipos de datos
    it('should handle different data types', () => {
        const stringValue = 'string';
        const numberValue = 123;
        const objectValue = { key: 'value' };
        const arrayValue = [1, 2, 3];

        set('string', stringValue);
        set('number', numberValue);
        set('object', objectValue);
        set('array', arrayValue);

        expect(get('string')).toBe(stringValue);
        expect(get('number')).toBe(numberValue);
        expect(get('object')).toEqual(objectValue);
        expect(get('array')).toEqual(arrayValue);
    });
});

