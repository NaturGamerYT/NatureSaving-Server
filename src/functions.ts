import { getLocalServerProps, localServerProps, readDataProps, saveDataProps, SayHelloProps, searchDataProps } from "./types";
import { ServerInfo } from "./interfaces";
import * as fs from 'fs';
import * as npath from 'path';

let servers: ServerInfo[] = [];

export function sayHello({ firstName }: SayHelloProps) {
    if (firstName) {
        console.log(`Hello ${firstName}!`);
    } else {
        console.log('Hello!')
    }
}

export class LocalServer {
    private name: string;
    private path: string;
    private status: string;

    constructor({ name, path }: localServerProps) {
        if (!name) {
            throw new Error('[NatureSaving] No name for database was defined');
        };
        if (servers.find(server => server.name === name)) {
            throw new Error('[NatureSaving] Database couldnt be created! That name is already in use');
        };
        if (!path) {
            throw new Error('[NatureSaving] No path for database was defined');
        };
        const resolvedPath = npath.resolve(path);
        if (!fs.existsSync(resolvedPath)) {
            throw new Error('[NatureSaving] Path does not exist');
        }
        this.name = name;
        this.path = resolvedPath;
        this.status = 'init'

        const init: ServerInfo = {
            name: this.name,
            path: this.path,
            status: 'init',
        };

        servers.push(init);

        console.log(`[NatureSaving] Local server initialized with path: ${path}`);
    };

    public start() {

        const index = servers.findIndex(server => server.name === this.name);
        if (index !== -1) {
            servers[index].status = 'running';
            this.status = 'running';
            console.log(`[NatureSaving] Starting server ${this.name} with path: ${npath.resolve(this.path)}`);
        } else {
            console.error(`[NatureSaving] Server ${this.name} not found`);
        }
    };

    public stop() {

        const index = servers.findIndex(server => server.name === this.name);
        if (index !== -1) {
            servers[index].status = 'stopped';
            this.status = 'stopped';
            console.log(`[NatureSaving] Stopping server ${this.name} with path: ${npath.resolve(this.path)}`);
        } else {
            console.error(`[NatureSaving] Server ${this.name} not found`);
        }
    };
}

export function getLocalServer({ name }: getLocalServerProps) {
    if (!name) {
        throw new Error(`[NatureSaving] No name for database was defined`);
    };

    const server = servers.find(server => server.name === name);

    if (!server) {
        throw new Error(`[NatureSaving] No database with name ${name} was found`);
    };
    
    return server || null;
};

function validateDataAgainstSchema(schema: Record<string, any>, data: Record<string, any>): boolean {
    function validate(schema: any, data: any): boolean {
        if (Array.isArray(schema)) {
            if (!Array.isArray(data)) {
                return false;
            }
            for (let i = 0; i < data.length; i++) {
                if (!validate(schema[0], data[i])) {
                    return false;
                }
            }
        } else if (typeof schema === 'object') {
            for (const key in schema) {
                if (schema.hasOwnProperty(key)) {
                    if (!data.hasOwnProperty(key) || !validate(schema[key], data[key])) {
                        return false;
                    }
                }
            }
        } else if (typeof schema === 'function') {
            if (typeof data !== typeof schema()) {
                return false;
            }
        }
        return true;
    }

    return validate(schema.schema, data);
}

export function saveData({ server, schema, data }: saveDataProps) {
    if (!server) {
        throw new Error('[NatureSaving] Server object from getLocalServer is not defined or missing');
    }

    if (!server.name) {
        throw new Error('[NatureSaving] Database does not exist');
    }

    if (server.status !== 'running') {
        console.error('[NatureSaving] Database is not running. Please start the database.');
        return null;
    }

    if (!schema) {
        throw new Error('[NatureSaving] Schema is not defined or missing');
    }

    if (!data) {
        throw new Error('[NatureSaving] Data is not defined or missing');
    }

    if (!validateDataAgainstSchema(schema, data)) {
        throw new Error('[NatureSaving] Data does not match schema');
    }

    const filePath = npath.join(server.path, `${schema.name}.js`);
    let existingData: any[] = [];

    if (fs.existsSync(filePath)) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const dataMatch = fileContent.match(/const data = (\[.*\]);\s*module\.exports = data;/s);
            if (dataMatch && dataMatch[1]) {
                existingData = JSON.parse(dataMatch[1]);
            }
        } catch (error) {
            console.error('[NatureSaving] Could not read existing data file:', error);
        }
    }

    if (!Array.isArray(existingData)) {
        existingData = [];
    }

    existingData.push(data);

    const dataString = `const data = ${JSON.stringify(existingData, null, 2)};\n\nmodule.exports = data;`;

    fs.mkdirSync(npath.dirname(filePath), { recursive: true });
    try {
        fs.writeFileSync(filePath, dataString, 'utf8');
    } catch (error) {
        throw new Error('[NatureSaving] The data couldn\'t be saved');
    }

    console.log('[NatureSaving] Data saved successfully');
}

export function readData({ server, schema }: readDataProps) {
    if (!server) {
        throw new Error('[NatureSaving] Server object from getLocalServer is not defined or missing');
    }

    if (!server.name) {
        throw new Error('[NatureSaving] Database does not exist');
    }

    if (server.status !== 'running') {
        console.error('[NatureSaving] Database is not running. Please start the database.');
        return null;
    }

    const filePath = npath.join(server.path, `${schema.name}.js`);
    let existingData: any[] = [];

    if (fs.existsSync(filePath)) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const dataMatch = fileContent.match(/const data = (\[.*\]);\s*module\.exports = data;/s);
            if (dataMatch && dataMatch[1]) {
                existingData = JSON.parse(dataMatch[1]);
                return existingData;
            }
        } catch (error) {
            console.error('[NatureSaving] Could not read existing data file:', error);
        }
    }
}

export function findData({ server, schema, data }: searchDataProps) {
    if (!server) {
        throw new Error('[NatureSaving] Server object from getLocalServer is not defined or missing');
    }

    if (!server.name) {
        throw new Error('[NatureSaving] Database does not exist');
    }

    if (server.status !== 'running') {
        console.error('[NatureSaving] Database is not running. Please start the database.');
        return null;
    }

    if (!schema) {
        throw new Error('[NatureSaving] Schema is not defined or missing');
    }

    if (!data) {
        throw new Error('[NatureSaving] Data is not defined or missing');
    }

    // if (!validateDataAgainstSchema(schema, data)) {
    //     throw new Error('[NatureSaving] Data does not match schema');
    // }

    const filePath = npath.join(server.path, `${schema.name}.js`);
    let existingData: any[] = [];

    if (fs.existsSync(filePath)) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const dataMatch = fileContent.match(/const data = (\[.*\]);\s*module\.exports = data;/s);
            if (dataMatch && dataMatch[1]) {
                existingData = JSON.parse(dataMatch[1]);
            }
        } catch (error) {
            console.error('[NatureSaving] Could not read existing data file:', error);
        }
    }

    const searchKeys = Object.keys(data);
    const searchData = existingData.filter(item =>
        searchKeys.every(key => item[key] === data[key])
    );

    return searchData;
}