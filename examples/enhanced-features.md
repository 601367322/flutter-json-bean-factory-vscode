# Enhanced Features Examples

This document demonstrates the enhanced null handling and code generation features.

## Sample JSON with Null Values

```json
{
  "id": 1,
  "name": "John Doe",
  "email": null,
  "age": 30,
  "profile": {
    "bio": "Developer",
    "avatar": null
  }
}
```

## Configuration Examples

### 1. Default Configuration (Nullable Fields)

```json
{
  "flutter-json-bean-factory.forceNonNullable": false,
  "flutter-json-bean-factory.addNullChecks": true,
  "flutter-json-bean-factory.generateToString": true
}
```

**Generated Code:**
```dart
class User {
  int id;
  String name;
  dynamic? email;  // Nullable because JSON has null
  int age;
  UserProfile profile;

  User({
    required this.id,
    required this.name,
    this.email,  // Optional parameter
    required this.age,
    required this.profile,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    // Null checks for non-nullable fields
    if (json['id'] == null) {
      throw ArgumentError('id cannot be null');
    }
    if (json['name'] == null) {
      throw ArgumentError('name cannot be null');
    }
    // ... more checks

    return User(
      id: JsonConvert.fromJsonAsT<int>(json['id'])!,
      name: JsonConvert.fromJsonAsT<String>(json['name'])!,
      email: JsonConvert.fromJsonAsT<dynamic?>(json['email']),
      age: JsonConvert.fromJsonAsT<int>(json['age'])!,
      profile: UserProfile.fromJson(json['profile'] as Map<String, dynamic>),
    );
  }

  @override
  String toString() {
    return 'User(id: $id, name: $name, email: $email, age: $age, profile: $profile)';
  }
}
```

### 2. Force Non-Nullable Configuration

```json
{
  "flutter-json-bean-factory.forceNonNullable": true,
  "flutter-json-bean-factory.addNullChecks": true,
  "flutter-json-bean-factory.generateToString": true
}
```

**Generated Code:**
```dart
class User {
  int id;
  String name;
  dynamic email;  // No ? suffix even though JSON has null
  int age;
  UserProfile profile;

  User({
    required this.id,
    required this.name,
    required this.email,  // Required parameter
    required this.age,
    required this.profile,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    // Null checks for ALL fields
    if (json['email'] == null) {
      throw ArgumentError('email cannot be null');
    }
    // ... more checks

    return User(
      email: JsonConvert.fromJsonAsT<dynamic>(json['email'])!,
      // ... other fields
    );
  }
}
```

### 3. Assert-Based Validation

```json
{
  "flutter-json-bean-factory.forceNonNullable": true,
  "flutter-json-bean-factory.addNullChecks": false,
  "flutter-json-bean-factory.useAsserts": true,
  "flutter-json-bean-factory.generateEquality": true
}
```

**Generated Code:**
```dart
class User {
  // ... fields

  factory User.fromJson(Map<String, dynamic> json) {
    // Assert statements instead of if checks
    assert(json['id'] != null, 'id cannot be null');
    assert(json['name'] != null, 'name cannot be null');
    assert(json['email'] != null, 'email cannot be null');
    // ... more asserts

    return User(
      // ... assignments
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is User && 
           id == other.id && 
           name == other.name && 
           email == other.email && 
           age == other.age && 
           profile == other.profile;
  }

  @override
  int get hashCode => Object.hash(id, name, email, age, profile);
}
```

## Use Cases

### 1. Strict API Contracts
When your API guarantees that certain fields will never be null, use:
- `forceNonNullable: true`
- `addNullChecks: true`

This generates runtime validation to catch API contract violations.

### 2. Development/Debug Mode
For catching null issues early in development:
- `useAsserts: true`

Asserts are removed in release builds but help catch issues during development.

### 3. Value Objects
For classes that need equality comparison:
- `generateEquality: true`

Useful for models that will be used in Sets, Maps, or need comparison.

### 4. Debugging
For better debugging experience:
- `generateToString: true`

Provides readable string representation of objects.

## Best Practices

1. **Start with defaults** and adjust based on your needs
2. **Use forceNonNullable carefully** - only when you're sure about API contracts
3. **Enable null checks** for better error messages than generic cast errors
4. **Use asserts in development** and null checks in production
5. **Generate toString** for better debugging experience
6. **Generate equality** only when needed (performance consideration)

## Migration Strategy

If you have existing code and want to adopt stricter null handling:

1. Start with `addNullChecks: true` to identify potential issues
2. Fix any null-related bugs in your API or data handling
3. Gradually enable `forceNonNullable: true` for specific models
4. Add equality methods only where needed for business logic
