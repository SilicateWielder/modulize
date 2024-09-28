const fs = require("fs");

class modulize {
    constructor (log_method = console.log) {

        this.log = (text) => {
            log_method(text);
        }

        this.id_keyword = 'id';
        this.module_catalog = {};
        this.modules_initialized = {};

        this.rootPath = null
    }

    // Identifies all valid modules in the module directory.
    identifyModules(modulesRoothPath) {
        const module_files = fs.readdirSync(modulesRoothPath);

        let modules = [];

        this.log('Checking directory: ' + modulesRoothPath)
        for(let file = 0; file < module_files.length; file++) {
            const filename = module_files[file];
            const filename_parts = filename.split('.');

            this.log('Checking ' + filename + '...');

            if(filename_parts.length > 2 || filename_parts[1] !== 'js') continue;

            modules.push(filename);
        }

        return modules;
    }

    // Useful for defining custom ID keywords
    setIdKeyword(keyword) {
        this.id_keyword = keyword;
    }

    loadSingle(modulePath) {
        const fullPath = (this.rootPath + '/' + modulePath)
        let module = null;
        try {
            module = require(fullPath);
        } catch(e) {
            this.log('Failed to load module: \n' + e)
            return false;
        }
        module.fullPath = fullPath;
        module.filepath = modulePath;

        const id = module.properties[this.id_keyword];

        this.log("Loading " + modulePath + " as '" + id + "'...");

        this.module_catalog[id] = module;

        return true;
    }

    // Loads all modules in the rootPath specified.
    load(modulesRoothPath) {
        this.rootPath = modulesRoothPath;
        const module_files = fs.readdirSync(modulesRoothPath);

        this.log('Loading from directory: ' + modulesRoothPath)
        for(let file = 0; file < module_files.length; file++) {
            const filename = module_files[file];
            const filename_parts = filename.split('.');

            this.log('Checking ' + filename + '...');

            if(filename_parts.length > 2 || filename_parts[1] !== 'js') continue;

            this.loadSingle(filename);
        }
    }

    unload(moduleId) {
        if(this.module_catalog[moduleId] === undefined || this.module_catalog[moduleId] === null) {
            return undefined;
        }

        const path = this.module_catalog[moduleId].fullPath;
        delete this.module_catalog[moduleId];
        delete require.cache[require.resolve(path)];
    }

    checkExists(moduleId) {
        if(this.module_catalog[moduleId] === undefined || this.module_catalog[moduleId] === null) {
            this.log('Failed to retrieve componenent: ' + moduleId);
            return false;
        } else {
            return true;
        }
    }

    // Retrieves a specific module.
    retrieveModule(moduleId) {
        if(this.module_catalog[moduleId] === undefined || this.module_catalog[moduleId] === null) {
            return undefined;
        }

        return this.module_catalog[moduleId];
    }

    retrieve(moduleId) {
        if(this.module_catalog[moduleId] === undefined || this.module_catalog[moduleId] === null) {
            return undefined;
        }

        return this.module_catalog[moduleId]; 
    }

    retrieveExecutable(moduleId) {
        let loaded = this.checkExists(moduleId);

        if(!loaded) return undefined;

        return this.module_catalog[moduleId].executable; 
    }

    // Returns the list of modules loaded.
    getModulesList() {
        const moduleList = Object.keys(this.module_catalog);

        return moduleList;
    }

    initModules(source) {
        let moduleList = Object.keys(this.module_catalog);

        for(let i = 0; i < moduleList.length; i++) {
            const moduleName = moduleList[i];
            let module = this.module_catalog[moduleName];

            if(this.modules_initialized[moduleName] !== undefined) {
                this.log(`[WARNING]: Module '${moduleName}' has already been initialized. Skipping for safety...`);
                continue;
            }

            if(module.init != undefined && module.init != null) {
                module.init(source);
                this.modules_initialized[moduleName] = true;
            }
        }
    }
}

module.exports = modulize;