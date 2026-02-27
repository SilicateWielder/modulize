# Modulize Library

`Modulize` is a TypeScript-based library for managing modules in a dynamic and organized way. It supports live loading, unloading, and reloading of modules, along with integrated dependency management. This library is a modernized replacement for the now-obsolete `modulize.js`. Any users of the old `modulize.js`, should consider it end of life and consider migrating to modulize.ts or fork the repo.

## Features

- **Dynamic Module Management**: Load, unload, and reload modules at runtime.
- **Archetype Support**: Organize modules into categories (archetypes).
- **Dependency Management**: Automatically resolve and initialize modules in the correct order.
- **TypeScript Support**: Strong typing for safer and more maintainable code.
- **Enhanced Logging**: Color-coded logs for better debugging.

## Installation

To use `Modulize` as a standalone library, copy it to your project for now. I'm looking into distribution still.

## Basic Usage

### 1. Import Modulize

```typescript
import Modulize from './modulize';
```

### 2. Create an Instance

```typescript
const mod = new Modulize(console);
```

### 3. Add Archetypes

Archetypes are directories that group related modules.

```typescript
mod.addArchetype('default', './modules');
mod.addArchetype('services', './services');
```

### 4. Load Modules

Load all modules from an archetype:

```typescript
await mod.load('default');
```

Load a single module:

```typescript
await mod.loadSingle('exampleModule.ts', 'default');
```

### 5. Retrieve Modules

Retrieve a module by its address (`archetype:module`):

```typescript
const myModule = mod.retrieveModule('default:exampleModule');
```

Retrieve the executable of a module:

```typescript
const executable = mod.retrieveExecutable('default:exampleModule');
executable();
```

### 6. Unload Modules

Unload a module:

```typescript
mod.unload('default:exampleModule');
```

### 7. Initialize Modules

Initialize all modules in the correct dependency order:

```typescript
await mod.initModules({});
```

## Advanced Usage

### Dependency Management

Modules can declare dependencies in their `properties.requires` field. `Modulize` ensures that dependencies are loaded and initialized before the module itself.

### Logging

`Modulize` uses a customizable logging method. By default, it uses `console.log`, but you can pass your own logger:

```typescript
const customLogger = {
    log: (message: string) => {
        console.log(`[CustomLog] ${message}`);
    }
};

const mod = new Modulize(customLogger);
```

### Validating Archetypes and Addresses

Validate an archetype:

```typescript
if (mod.validateArchetype('default')) {
    console.log('Archetype is valid.');
}
```

Validate a module address:

```typescript
if (mod.validateAddress('default:exampleModule')) {
    console.log('Module address is valid.');
}
```

## Migration from `modulize.js`

The old `modulize.js` is obsolete and should not be relied upon. The new `Modulize` library introduces several improvements:

- **Archetypes**: Organize modules into categories.
- **TypeScript Support**: Strong typing for safer code.
- **Dependency Management**: Automatically resolve dependencies.
- **Async Loading**: Use modern `await import()` for dynamic imports.

### Example Migration

#### Old Code:

```javascript
const mod = new modulize(console.log);
mod.load('./modules');
const myModule = mod.retrieveModule('exampleModule');
myModule.executable();
```

#### New Code:

```typescript
const mod = new Modulize(console);
mod.addArchetype('default', './modules');
await mod.load('default');
const myModule = mod.retrieveModule('default:exampleModule');
myModule.executable();
```

## Notes

- Ensure all modules have a `properties` object with a unique `id` field.
- Declare dependencies in the `requires` field of the `properties` object.
- Use `Modulize` for all new projects; the old `modulize.js` is no longer supported.

## License

This library is open-source and available under the GPLv3 License.
