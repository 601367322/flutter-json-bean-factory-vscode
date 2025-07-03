import * as assert from 'assert';
import { JsonParser } from '../../parsers/JsonParser';

suite('JsonParser Test Suite', () => {
    let parser: JsonParser;

    setup(() => {
        parser = new JsonParser();
    });

    test('Should validate valid JSON', () => {
        const validJson = '{"name": "John", "age": 30}';
        const result = parser.validateJson(validJson);
        assert.strictEqual(result.isValid, true);
        assert.strictEqual(result.error, undefined);
    });

    test('Should invalidate invalid JSON', () => {
        const invalidJson = '{"name": "John", "age":}';
        const result = parser.validateJson(invalidJson);
        assert.strictEqual(result.isValid, false);
        assert.notStrictEqual(result.error, undefined);
    });

    test('Should parse simple JSON object', () => {
        const json = '{"name": "John", "age": 30, "isActive": true}';
        const result = parser.parseJson(json, 'User');
        
        assert.strictEqual(result.name, 'User');
        assert.strictEqual(result.properties.length, 3);
        
        const nameProperty = result.properties.find(p => p.name === 'name');
        assert.strictEqual(nameProperty?.dartType, 'String');
        assert.strictEqual(nameProperty?.isNullable, false);
        
        const ageProperty = result.properties.find(p => p.name === 'age');
        assert.strictEqual(ageProperty?.dartType, 'int');
        
        const isActiveProperty = result.properties.find(p => p.name === 'isActive');
        assert.strictEqual(isActiveProperty?.dartType, 'bool');
    });

    test('Should handle nested objects', () => {
        const json = '{"user": {"name": "John", "age": 30}, "count": 5}';
        const result = parser.parseJson(json, 'Response');
        
        assert.strictEqual(result.name, 'Response');
        assert.strictEqual(result.properties.length, 2);
        
        const userProperty = result.properties.find(p => p.name === 'user');
        assert.strictEqual(userProperty?.isNestedObject, true);
        assert.strictEqual(userProperty?.nestedClass?.name, 'ResponseUser');
        assert.strictEqual(userProperty?.nestedClass?.properties.length, 2);
    });

    test('Should handle arrays', () => {
        const json = '{"names": ["John", "Jane"], "numbers": [1, 2, 3]}';
        const result = parser.parseJson(json, 'Data');
        
        const namesProperty = result.properties.find(p => p.name === 'names');
        assert.strictEqual(namesProperty?.isArray, true);
        assert.strictEqual(namesProperty?.dartType, 'List<String>');
        assert.strictEqual(namesProperty?.arrayElementType, 'String');
        
        const numbersProperty = result.properties.find(p => p.name === 'numbers');
        assert.strictEqual(numbersProperty?.isArray, true);
        assert.strictEqual(numbersProperty?.dartType, 'List<int>');
        assert.strictEqual(numbersProperty?.arrayElementType, 'int');
    });

    test('Should handle array of objects', () => {
        const json = '{"users": [{"name": "John", "age": 30}]}';
        const result = parser.parseJson(json, 'Response');
        
        const usersProperty = result.properties.find(p => p.name === 'users');
        assert.strictEqual(usersProperty?.isArray, true);
        assert.strictEqual(usersProperty?.isNestedObject, true);
        assert.strictEqual(usersProperty?.nestedClass?.name, 'ResponseUsersItem');
        assert.strictEqual(usersProperty?.dartType, 'List<ResponseUsersItem>');
    });

    test('Should handle null values', () => {
        const json = '{"name": "John", "age": null}';
        const result = parser.parseJson(json, 'User');
        
        const ageProperty = result.properties.find(p => p.name === 'age');
        assert.strictEqual(ageProperty?.isNullable, true);
        assert.strictEqual(ageProperty?.dartType, 'dynamic');
    });

    test('Should convert property names to camelCase', () => {
        const json = '{"first_name": "John", "last-name": "Doe", "user_id": 123}';
        const result = parser.parseJson(json, 'User');
        
        const properties = result.properties.map(p => p.name);
        assert.deepStrictEqual(properties.sort(), ['firstName', 'lastName', 'userId']);
    });

    test('Should convert class names to PascalCase', () => {
        const json = '{"user_profile": {"first_name": "John"}}';
        const result = parser.parseJson(json, 'response_data');
        
        assert.strictEqual(result.name, 'ResponseData');
        
        const userProfileProperty = result.properties.find(p => p.name === 'userProfile');
        assert.strictEqual(userProfileProperty?.nestedClass?.name, 'ResponseDataUserProfile');
    });

    test('Should get all classes including nested ones', () => {
        const json = '{"user": {"profile": {"name": "John"}}, "count": 5}';
        const result = parser.parseJson(json, 'Response');
        const allClasses = parser.getAllClasses(result);
        
        assert.strictEqual(allClasses.length, 3);
        assert.strictEqual(allClasses[0].name, 'Response');
        assert.strictEqual(allClasses[1].name, 'ResponseUser');
        assert.strictEqual(allClasses[2].name, 'ResponseUserProfile');
    });
});
