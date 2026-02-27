///////////////////////////////////////////////////////////////////////////////////////////////////////////////
// modulize.ts - Bun TS port of MeushiBot's module/package management system.
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Allows live loading, unloading, and reloading of modules. Includes integrated dependency management.
//
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// NOTES:
//  - Modules addresses follow the [archetype]:[module] format.
//
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// TODO:
//   - Implement initial loading of modules from a specified directory.
//
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// INVESTIGATE:
//   - how to make services able to communicate with modulize.
//
///////////////////////////////////////////////////////////////////////////////////////////////////////////////


// Typescript port of modulize.js for Bun.
import * as fs from 'fs';

const valid_file_types: string[] = ['ts', 'js'];

// Define archetypes type.

type ModuleAddress = `${string}:${string}`;
type ModuleAddressObject = {
    archetype: string;
    module: string;
}

interface Archetype {
    id_keyword: string;
    modules_catalog: Record<string, any>;
    modules_initialized: Record<string, boolean>;
    rootPath: string | null;
}

// Main modulize class.
export class Modulize {
    archetypes: Record<string, Archetype>;
    log: (text: string) => void;
    defaultArchetype: string | null;
    rootPath: string | null;

    /**
     * Sets up the Modulize instance.
     * @param log_method An object with a 'log' method for logging messages. Defaults to console.
    */
    constructor(log_method = console) {

        this.log = (text) => {
            log_method.log(`\x1b[45m\x1b[38m[Modulize]\x1b[0m ${text}`);
        }

        // An archetype is basically a directory of modules.
        this.archetypes = {};

        this.defaultArchetype = null;

        this.rootPath = null;
    }

    /**
     * Adds a new archetype to the modulize instance.
     * @param id The identifier for the archetype.
     * @param rootPath The root path where the archetype's modules are located.
    */
    addArchetype(id: string, rootPath: string) {

        const template: Archetype = {
            id_keyword: id,
            modules_catalog: {},
            modules_initialized: {},
            rootPath: rootPath,
        }

        // Copy, do not reference.
        this.archetypes[id] = { ...template };
    }

    /**
     * Legacy command, now just sets a default archetype if it's not already set.
     * @param archetype The id of the archetype to set as default.
     * @throws Error if the archetype does not exist or is already set.
    */
    setIdKeyword(archetype: string) {
        if (this.defaultArchetype !== null) {
            throw new Error(`Default archetype is already set to '${this.defaultArchetype}'.`);
        }

        if (!(archetype in this.archetypes)) {
            throw new Error(`Archetype '${archetype}' does not exist.`);
        }

        this.defaultArchetype = archetype;
    }

    /**
     * Identifies all valid modules in an archetype directory. Returns a list of compatible modules within that archetype.
     * @param archetype The id of the archetype directory to scan for modules.
     * @returns An array of compatible module filenames within the archetype's directory.
     * @throws Error if the archetype is invalid.
    */
    identifyModules(archetype: string): string[] {
        if (!archetype && this.defaultArchetype === null) {
            throw new Error(`Unable to identify modules: No archetype (passed or default).`);
        }

        if (!this.archetypes[archetype] && (this.defaultArchetype === null || !this.archetypes[this.defaultArchetype!])) {
            throw new Error(`Unable to identify modules: Invalid archetype '${archetype}'.`);
        }

        const rootPath: any = (archetype) ? this.archetypes[archetype].rootPath : this.archetypes[this.defaultArchetype!].rootPath;
        const module_files: string[] = fs.readdirSync(rootPath!);
        
        let files: string[] = [];

        this.log(`\x1b[45m\x1b[38m[IDENT]\x1b[0m Checking directory '${rootPath}' for modules...`);

        const fileCount: number = module_files.length;
        for (let file: number = 0; file < fileCount; file++) {
            const filename: string = module_files[file];
            const filename_parts: string[] = filename.split('.');

            this.log(`\x1b[45m\x1b[38m[IDENT]\x1b[0m (${file}/${fileCount}) Checking '${filename}'...`);

            if (filename_parts.length < 2 || filename_parts.length > 2 || !valid_file_types.includes(filename_parts[1])) {
                this.log(`\x1b[45m\x1b[38m[IDENT]\x1b[0m Skipping invalid file: '${filename}'.`);
                continue;
            }

            this.log(`\x1b[45m\x1b[38m[IDENT]\x1b[0m Identified valid module: '${filename}'.`);
            files.push(filename);
        }

        this.log(`\x1b[45m\x1b[38m[IDENT]\x1b[0m Identified ${files.length} valid modules in archetype '${archetype}': ${files.join(', ')}.`);
        return files;
    }

    /** 
     * Validates an archetype, ensuring it exists.
     * @param archetype The id of the archetype to validate.
     * @returns True if the archetype exists, false otherwise.
    */
    validateArchetype(archetype: string): boolean {
        if(!archetype) throw new Error(`Unable to validate archetype: No archetype (passed).`);

        return this.archetypes.hasOwnProperty(archetype);
    }

    /**
     * Gets an archetype by its ID.
     * @param archetype The id of the archetype to retrieve.
     * @returns The Archetype object.
     * @throws Error if the archetype does not exist.
    */
    getArchetype(archetype: string): Archetype {
        if (!this.validateArchetype(archetype)) {
            throw new Error(`Archetype '${archetype}' does not exist.`);
        }

        return this.archetypes[archetype];
    }

    /**
     * Validates a module address.
     * @param address  The address of the module to validate for. Of type ModuleAddress.
     * @returns True if the module address is valid, false otherwise.
    */
    validateAddress(address: ModuleAddress): boolean{
        const addressParts = address.split(':');

        // With TypeScript's type system, we can be sure addressParts has exactly 2 elements.
        let archetype: string = addressParts[0];
        let moduleName: string = addressParts[1];

        if (!this.validateArchetype(archetype)) {
            return false;
        }

        const archetypeRef = this.getArchetype(archetype);
        if (!archetypeRef.modules_catalog.hasOwnProperty(moduleName)) {
            return false;
        }

        return true;
    }

    // Substitutes previous use of validateAddress where we might've used it to decode instead.
    /**
     * Decodes a module address into its archetype and module name components.
     * @param address The address of the module to decode. Of type ModuleAddress.
     * @returns An object containing the archetype and module name, or null if invalid.
    */
    decodeModuleAddress(address: ModuleAddress): { archetype: string; module: string } | null {
        if(!this.validateAddress(address)) {
            return null;
        }

        const addressParts = address.split(':');
        
        // With TypeScript's type system, we can be sure addressParts has exactly 2 elements.
        const archetype: string = addressParts[0];
        const moduleName: string = addressParts[1];

        return { archetype, module: moduleName };
    }

    /**
     * Loads a single module, accepts just the script name and the path is automatically determined.
     * @param modulePath the path to the module file to load.
     * @param archetype The archetype the module belongs to.
     * @returns true if the module was loaded successfully, false otherwise.
     */
    async loadSingle(modulePath: string, archetype: string): Promise<ModuleAddressObject | false> {
        if (!archetype && !this.defaultArchetype) {
            throw new Error(`Unable to load single module: No archetype (passed or default).`);
        }

        if(!this.validateArchetype(archetype)) {
            throw new Error(`Unable to load single module: Invalid archetype '${archetype}'.`);
        }

        const fullPath: string = (this.archetypes[archetype].rootPath + '/' + modulePath);

        // Previously we checked require.cache here and would delete the old entry if needed, but Bun doesn't need this...
        // Noted just incase. "delete require.cache[require.resolve(fullPath)];".
        delete require.cache[modulePath];

        let module: Record<string, any> = {};

        this.log(`\x1b[44m\x1b[38m[LOAD]\x1b[0m Loading module "${fullPath}" to ${archetype}:${modulePath}...`);

        try {
            module.module = await import(fullPath + `?t=${Date.now()}`);
        } catch (error) {
            this.log(`\x1b[44m\x1b[38m[LOAD]\x1b[0m\t Failed to load module: ${error}`);
            return false;
        }

        module.fullPath = fullPath;
        module.filePath = modulePath;
        module.properties = module.module.properties;
        module.executable = module.module.executable;
        module.api = module.module.api;
        module.init = module.module.init;

        // Ensure module.properties exists.
        if (!module.hasOwnProperty('properties')) {
            this.log(`\x1b[44m\x1b[38m[LOAD]\x1b[0m\t Module cannot be loaded: Missing 'properties' object.`);
            return false;
        }

        // Ensure module has an id property.
        if (!module.properties.hasOwnProperty('id')) {
            this.log(`\x1b[44m\x1b[38m[LOAD]\x1b[0m\t Module cannot be loaded: Missing module ID ('properties.id').`);
            return false;
        }

        const id: string = module.properties.id;

        // Register module in catalog.
        this.archetypes[archetype].modules_catalog[id] = module;

        return { archetype: archetype, module: id };
    }

    /**
     * Loads all modules of the archetype specified.
     * @param archetype The archetype to load modules from.
     * @throws Error if the archetype is invalid or undefined.
     */
    async load(archetype: string) {
        if (!archetype && this.defaultArchetype === null) {
            throw new Error(`Unable to load modules: No archetype (passed or default).`);
        }

        if (!this.validateArchetype(archetype)) {
            throw new Error(`Unable to load modules: Invalid archetype '${archetype}'.`);
        }

        const rootPath = this.archetypes[archetype].rootPath;
        const moduleFiles = this.identifyModules(archetype);

        const moduleCount: number = moduleFiles.length;

        this.log(`\x1b[44m\x1b[38m[LOAD]\x1b[0m Beginning module loading process from '${rootPath}' with ${moduleCount} modules...`);
        for (let file: number = 0; file < moduleCount; file++) {
            const fileName = moduleFiles[file];
            await this.loadSingle(fileName, archetype);
        }
        
        this.log(`\x1b[44m\x1b[38m[LOAD]\x1b[0m Completed module loading process for archetype '${archetype}'.`);
    }

    /**
     * Unload a module
     * @param address The address of the module to unload. Of type ModuleAddress.
     * @throws Error if the module address is invalid.
     */
    unload(address: ModuleAddress) {
        let adr = this.decodeModuleAddress(address);

        if (!adr) {
            throw new Error(`\x1b[47m\x1b[38m[UNLOAD]\x1b[0m Unable to unload module: Invalid module address '${address}'.`);
        }

        const catalog: Record<string, any> = this.archetypes[adr.archetype].modules_catalog;
        const path: string = catalog[adr.module].fullPath;

        // In nodeJS we would call "delete this.archetypes[adr.archetype].modules_catalog[adr.module]; then delete catalog[adr.module]; and delete require.cache[require.resolve(path)];"
        // but Bun handles module caching differently, so we just delete from our catalog.

        delete this.archetypes[adr.archetype].modules_catalog[adr.module];

        this.log(`\x1b[47m\x1b[38m[UNLOAD]\x1b[0m Unloaded module '${address}'.`);
    }

    /**
     * Retrieves a specific module.
     * @param address The address of the module to retrieve. Of type ModuleAddress.
     * @returns The module object.
     * @throws Error if the module address is invalid.
    */
    retrieveModule(address: ModuleAddress): any {
        this.log(`\x1b[43m\x1b[30m[RETRIEVE]\x1b[0m Retrieving module '${address}'...`);
        let adr: any = this.decodeModuleAddress(address);

        if (!adr) {
            throw new Error(`Unable to get module: Invalid module address '${address}'.`);
        }

        return this.archetypes[adr.archetype].modules_catalog[adr.module];
    }

    /**
     * Retrieves a spcific module's properties object.
     * @param address The address of the module to retrieve properties from. Of type ModuleAddress.
     * @returns The module's properties object.
     * @throws Error if the module address is invalid.
    */
    retrieveModuleProperties(address: ModuleAddress): any {
        this.log(`\x1b[43m\x1b[30m[RETRIEVE]\x1b[0m Retrieving properties for module '${address}'...`);
        let module: any = this.retrieveModule(address);

        if (!module) {
            throw new Error(`Unable to get module properties: Invalid module address '${address}'.`);
        }

        if (!module.hasOwnProperty('properties')) {
            throw new Error(`Unable to get module properties: Module at address '${address}' has no 'properties' object.`);
        }

        return module.properties;
    }

    /** 
     * Retrieves a specific module's valid sources, as defined in its properties, or an empty list if it's not defined.
     * @param address The address of the module to retrieve sources from. Of type ModuleAddress.
     * @returns An array of valid sources for the module.
     * @throws Error if the module address is invalid.
    */
    retrieveModuleValidSources(address: ModuleAddress): string[] {
        this.log(`\x1b[43m\x1b[30m[RETRIEVE]\x1b[0m Retrieving valid sources for module '${address}'...`);
        let properties: Record<string, any> = this.retrieveModuleProperties(address);

        if (!properties) {
            throw new Error(`Unable to get module valid sources: Invalid module address '${address}'.`);
        }

        if (!properties.hasOwnProperty('valid_sources')) {
            return [];
        }
        
        return properties.valid_sources;
    }

    /**
     * retrieves the admin_only status of a module.
     * @param address The address of the module to check. Of type ModuleAddress.
     * @returns True if the module is admin only, false otherwise.
     * @throws Error if the module address is invalid.
    */
    retrieveAdminOnly(address: ModuleAddress): boolean {
        this.log(`[CHECK] Checking if module '${address}' is admin only...`);
        let properties: Record<string, any> = this.retrieveModuleProperties(address);

        if (!properties) {
            throw new Error(`Unable to check if module is admin only: Invalid module address '${address}'.`);
        }

        if (!properties.hasOwnProperty('admin_only')) {
            return false;
        }

        return properties.admin_only;
    }

    /**
     * retrieve a module by it's whole address (deprecated)
     * @param address The address of the module to retrieve. Of type ModuleAddress.
     * @returns The module object.
     * @throws Error if the module address is invalid.
     */
    retrrieve(address: ModuleAddress): any {
        this.log(`\x1b[43m\x1b[30m[RETRIEVE]\x1b[0m 'retrrieve' is deprecated, use 'retrieveModule' instead.`);
        return this.retrieveModule(address);
    }

    /**
     * Retrieves a spcific module's executable object.
     * @param address The address of the module to retrieve executable from. Of type ModuleAddress.
     * @returns The module's executable object.
     * @throws Error if the module address is invalid.
     */
    retrieveExecutable(address: ModuleAddress): any {
        const module = this.retrieveModule(address);

        if (!module) {
            throw new Error(`Unable to get module executable: Invalid module address '${address}'.`);
        }

        if (!module.hasOwnProperty('executable')) {
            return null; // Some modules may not have an executable object, and instead expose an API.
        }

        return module.executable;
    }

    /**
     * Retrieves a specific module's API object, or returns an empty object if none exists.
     * @param address The address of the module to retrieve API from. Of type ModuleAddress.
     * @returns The module's API object.
     * @throws Error if the module address is invalid.
    */
    retrieveApi(address: ModuleAddress): Record<string, any> {
        const module = this.retrieveModule(address);

        if (!module) {
            throw new Error(`Unable to get module API: Invalid module address '${address}'.`);
        }

        if (!module.hasOwnProperty('api')) {
            return {}; // Some modules may not have an API object.
        }

        return module.api;
    }

    /**
     * Returns a list of loaded modules for a given archetype.
     * @param archetype The archetype to list modules from.
     * @returns An array of module IDs.
     * @throws Error if the archetype is invalid.
    */
    getModulesList(archetype: string): string[] {
        if (!this.validateArchetype(archetype)) {
            throw new Error(`Unable to list modules: Invalid archetype '${archetype}'.`);
        }

        return Object.keys(this.archetypes[archetype].modules_catalog);
    }
    
    
    /**
     * Loads modules in order of dependencies.
     * @param source The source to pass to the module's init function.
     * @throws Error if the source is not valid.
     */
    async initModules(source: any) {
        const archetypes: string[] = Object.keys(this.archetypes);
        
        this.log(`\x1b[46m\x1b[30m[INIT]\x1b[0m Beginning module initialization process for archetypes ${archetypes.join(', ')}...`);

        for (const archetype of archetypes) {
            this.log(`\x1b[46m\x1b[30m[INIT]\x1b[0m\t\t\tInitializing modules for archetype '${archetype}'...`);

            const modulesList: string[] = Object.keys(this.getArchetype(archetype).modules_catalog);

            let modulesReady: string[] = [];
            let unprocessedModules: string[] = [...modulesList];

            while (unprocessedModules.length > 0) {
                let progress: boolean = false;

                for (let i = 0; i < unprocessedModules.length; i++) {
                    const moduleName: string = unprocessedModules[i];
                    const module: any = this.retrieveModule(`${archetype}:${moduleName}`);

                    if (!module) {
                        throw new Error(`\x1b[46m\x1b[30m[INIT]\x1b[0m No module retrieved: '${archetype}:${moduleName}'.`);
                    }

                    const deps: string[] = module.properties.hasOwnProperty('requires') ? module.properties.requires : [];

                    const depsAvailable: boolean = deps.every((dep: string) => modulesList.includes(dep));

                    if(!depsAvailable) {
                        this.log(`\x1b[46m\x1b[30m[INIT]\x1b[0m Skipping module '${archetype}:${moduleName}': Missing dependencies.`);
                        //modulesReady.push(moduleName); // Prevents infinite loop on missing dependencies.
                        unprocessedModules.splice(i, 1);
                        i--;
                        continue;
                    }

                    const depsReady: boolean = deps.every((dep: string) => modulesReady.includes(dep));
                    if (!depsReady) {
                        continue;
                    }
                    
                    if(module.init === null || module.init === undefined) {
                        unprocessedModules.splice(i, 1);
                        i--;
                        modulesReady.push(moduleName);
                        this.log(`\x1b[46m\x1b[30m[INIT]\x1b[0m Module '${archetype}:${moduleName}' has no init function, skipping initialization.`);
                        progress = true;
                        continue;
                    }

                    if(this.archetypes[archetype].modules_initialized.hasOwnProperty(moduleName)) {
                        this.log(`\x1b[46m\x1b[30m[INIT]\x1b[0m[WARNING] Module '${archetype}:${moduleName}' is already initialized, skipping.`);
                        unprocessedModules.splice(i, 1);
                        i--;
                        modulesReady.push(moduleName);
                        progress = true;
                        continue;
                    }

                    if(module.hasOwnProperty('init')) {
                        this.log(`\x1b[46m\x1b[30m[INIT]\x1b[0m Initializing module '${archetype}:${moduleName}'...`);
                        try {
                            await module.init(source);
                            this.log(`\x1b[46m\x1b[30m[INIT]\x1b[0m \x1b[42m[PASS]\x1b[0m Module '${archetype}:${moduleName}' initialized successfully.`);
                        } catch (error) {
                            this.log(`\x1b[46m\x1b[30m[INIT]\x1b[0m \x1b[41m[FAIL]\x1b[0m Failed to initialize module '${archetype}:${moduleName}': ${error}`);
                        }

                        this.archetypes[archetype].modules_initialized[moduleName] = true;
                        modulesReady.push(moduleName);
                        unprocessedModules.splice(i, 1);
                        i--;
                        progress = true;
                    }
                }

                if (!progress) {
                    this.log(`\x1b[46m\x1b[30m[INIT]\x1b[0m No progress made during module initialization for archetype '${archetype}'. Possible circular dependency detected.`);
                    break;
                }
            }
        }

        this.log(`\x1b[46m\x1b[30m[INIT]\x1b[0m Completed module initialization process for all archetypes.`);
    }
}

export default Modulize;