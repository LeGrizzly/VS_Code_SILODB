import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Represents a namespace with its key-value data.
 */
export interface NamespaceData {
    [key: string]: unknown;
}

/**
 * Parsed ORM filename components.
 */
export interface OrmFileParts {
    namespace: string;
    type: "schema" | "data";
    modelName: string;
}

/**
 * Information about an ORM model (schema + data files).
 */
export interface OrmModelInfo {
    modelName: string;
    schemaFile: string;
    dataFile: string;
}

/**
 * A namespace grouped with its ORM models and plain KV files.
 */
export interface OrmNamespaceInfo {
    namespace: string;
    models: OrmModelInfo[];
    kvFiles: string[];
}

/**
 * DatabaseService reads and writes DBAPI XML files on disk.
 */
export class DatabaseService {
    private dataPath: string | null = null;

    setDataPath(dataPath: string): void {
        this.dataPath = dataPath;
    }

    getDataPath(): string | null {
        return this.dataPath;
    }

    isConfigured(): boolean {
        return this.dataPath !== null && fs.existsSync(this.dataPath);
    }

    getNamespaces(): string[] {
        if (!this.dataPath || !fs.existsSync(this.dataPath)) {
            return [];
        }

        try {
            return fs
                .readdirSync(this.dataPath)
                .filter((file) => {
                    const fullPath = path.join(this.dataPath!, file);
                    return fs.statSync(fullPath).isFile() && file.endsWith(".xml");
                })
                .sort();
        } catch {
            return [];
        }
    }

    getNamespaceData(namespace: string): NamespaceData {
        if (!this.dataPath) {
            return {};
        }

        const filePath = path.join(this.dataPath, namespace);
        if (!fs.existsSync(filePath)) {
            return {};
        }

        try {
            const xmlContent = fs.readFileSync(filePath, "utf-8");
            const match = xmlContent.match(/<data>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/data>/);
            
            if (!match || !match[1]) {
                return {};
            }

            const jsonString = match[1].trim();
            if (jsonString === "") {
                return {};
            }

            return JSON.parse(jsonString) as NamespaceData;
        } catch (err) {
            console.error(`Error reading namespace ${namespace}:`, err);
            return {};
        }
    }

    saveNamespaceData(namespace: string, data: NamespaceData): boolean {
        if (!this.dataPath) {
            return false;
        }

        try {
            const filePath = path.join(this.dataPath, namespace);
            const jsonString = JSON.stringify(data);
            
            const xmlContent = `<?xml version="1.0" encoding="utf-8" standalone="no" ?>
<db>
    <data>${jsonString.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</data>
</db>`;

            fs.writeFileSync(filePath, xmlContent, "utf-8");
            return true;
        } catch (err) {
            console.error(`Error saving namespace ${namespace}:`, err);
            return false;
        }
    }

    /**
     * Sets a value at a specific path in the namespace.
     * @param keyPath Array of keys (e.g. ["player", "stats", "score"])
     */
    setValueAtPath(namespace: string, keyPath: string[], value: unknown): boolean {
        const data = this.getNamespaceData(namespace);
        let current: any = data;

        for (let i = 0; i < keyPath.length - 1; i++) {
            const part = keyPath[i];
            if (current[part] === undefined || typeof current[part] !== "object") {
                current[part] = {};
            }
            current = current[part];
        }

        current[keyPath[keyPath.length - 1]] = value;
        return this.saveNamespaceData(namespace, data);
    }

    /**
     * Deletes a key at a specific path in the namespace.
     */
    deleteKeyAtPath(namespace: string, keyPath: string[]): boolean {
        const data = this.getNamespaceData(namespace);
        let current: any = data;

        for (let i = 0; i < keyPath.length - 1; i++) {
            const part = keyPath[i];
            if (current[part] === undefined || typeof current[part] !== "object") {
                return false;
            }
            current = current[part];
        }

        delete current[keyPath[keyPath.length - 1]];
        return this.saveNamespaceData(namespace, data);
    }

    createNamespace(namespace: string): boolean {
        const fileName = namespace.endsWith(".xml") ? namespace : `${namespace}.xml`;
        return this.saveNamespaceData(fileName, {});
    }

    deleteNamespace(namespace: string): boolean {
        if (!this.dataPath) {
            return false;
        }

        try {
            const filePath = path.join(this.dataPath, namespace);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Parses an ORM filename into its components.
     * Expected format: `Namespace__schema_ModelName.xml` or `Namespace__data_ModelName.xml`
     */
    parseOrmFilename(filename: string): OrmFileParts | null {
        const match = filename.match(/^(.+)__(schema|data)_(.+)\.xml$/);
        if (!match) {
            return null;
        }
        return {
            namespace: match[1],
            type: match[2] as "schema" | "data",
            modelName: match[3],
        };
    }

    /**
     * Groups all XML files by namespace, classifying ORM vs KV files.
     */
    getGroupedNamespaces(): OrmNamespaceInfo[] {
        const files = this.getNamespaces();
        const groups = new Map<string, { models: Map<string, { schema?: string; data?: string }>; kvFiles: string[] }>();

        for (const file of files) {
            const parsed = this.parseOrmFilename(file);
            if (parsed) {
                const baseNs = parsed.namespace + ".xml";
                if (!groups.has(baseNs)) {
                    groups.set(baseNs, { models: new Map(), kvFiles: [] });
                }
                const group = groups.get(baseNs)!;
                if (!group.models.has(parsed.modelName)) {
                    group.models.set(parsed.modelName, {});
                }
                const model = group.models.get(parsed.modelName)!;
                if (parsed.type === "schema") {
                    model.schema = file;
                } else {
                    model.data = file;
                }
            } else {
                if (!groups.has(file)) {
                    groups.set(file, { models: new Map(), kvFiles: [] });
                }
                groups.get(file)!.kvFiles.push(file);
            }
        }

        const result: OrmNamespaceInfo[] = [];
        for (const [namespace, group] of groups) {
            const models: OrmModelInfo[] = [];
            for (const [modelName, files] of group.models) {
                if (files.schema && files.data) {
                    models.push({
                        modelName,
                        schemaFile: files.schema,
                        dataFile: files.data,
                    });
                }
            }
            result.push({
                namespace,
                models: models.sort((a, b) => a.modelName.localeCompare(b.modelName)),
                kvFiles: group.kvFiles,
            });
        }

        return result.sort((a, b) => a.namespace.localeCompare(b.namespace));
    }

    /**
     * Reads ORM schema definition from a schema file.
     */
    getOrmSchema(schemaFile: string): Record<string, unknown> | null {
        const data = this.getNamespaceData(schemaFile);
        if (data && typeof data.__schema === "object" && data.__schema !== null) {
            return data.__schema as Record<string, unknown>;
        }
        return null;
    }

    /**
     * Reads ORM records from a data file.
     */
    getOrmRecords(dataFile: string): Record<string, unknown>[] {
        const data = this.getNamespaceData(dataFile);
        if (!data || !data.__records || typeof data.__records !== "object") {
            return [];
        }
        // Records are stored as a map keyed by stringified IDs, not an array
        const records = data.__records as Record<string, unknown>;
        return Object.values(records) as Record<string, unknown>[];
    }

    autoDetectPaths(): string[] {
        const results: string[] = [];
        const home = os.homedir();

        const basePaths = [
            path.join(home, "Documents", "My Games", "FarmingSimulator2025"),
            path.join(
                home,
                "OneDrive",
                "Documents",
                "My Games",
                "FarmingSimulator2025"
            ),
        ];

        for (const basePath of basePaths) {
            if (!fs.existsSync(basePath)) {
                continue;
            }

            try {
                const entries = fs.readdirSync(basePath);
                for (const entry of entries) {
                    if (!entry.startsWith("savegame")) {
                        continue;
                    }
                    const dbPath = path.join(basePath, entry, "DBAPI_data");
                    if (fs.existsSync(dbPath)) {
                        results.push(dbPath);
                    }
                }
            } catch { }
        }

        return results.sort();
    }
}
