import * as vscode from "vscode";
import { DatabaseService, OrmModelInfo } from "./DatabaseService";

/**
 * Types of items shown in the tree view.
 */
export type ItemType =
    | "namespace" | "entry" | "property"
    | "ormGroup" | "model" | "schemaGroup"
    | "schemaField" | "recordsGroup" | "record";

/**
 * Tree item representing a namespace, a top-level key, or a nested property.
 */
export class DatabaseTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly itemType: ItemType,
        public readonly namespace?: string,
        public readonly keyPath?: string[],
        public readonly value?: unknown,
        public readonly modelName?: string,
        public readonly ormModels?: OrmModelInfo[],
        public readonly schemaFile?: string,
        public readonly dataFile?: string,
    ) {
        super(label, DatabaseTreeItem.resolveCollapsibleState(itemType, value));

        const isObject = typeof value === "object" && value !== null;

        switch (itemType) {
            case "namespace":
                this.contextValue = "namespace";
                this.iconPath = new vscode.ThemeIcon("database");
                this.tooltip = `Namespace: ${label}`;
                break;
            case "ormGroup":
                this.contextValue = "ormGroup";
                this.iconPath = new vscode.ThemeIcon("symbol-class");
                this.tooltip = "ORM Models";
                break;
            case "model":
                this.contextValue = "model";
                this.iconPath = new vscode.ThemeIcon("symbol-struct");
                this.tooltip = `Model: ${label}`;
                break;
            case "schemaGroup":
                this.contextValue = "schemaGroup";
                this.iconPath = new vscode.ThemeIcon("symbol-interface");
                this.tooltip = "Schema definition";
                break;
            case "schemaField":
                this.contextValue = "schemaField";
                this.iconPath = new vscode.ThemeIcon("symbol-field");
                break;
            case "recordsGroup":
                this.contextValue = "recordsGroup";
                this.iconPath = new vscode.ThemeIcon("list-tree");
                this.tooltip = "Records";
                break;
            case "record":
                this.contextValue = "record";
                this.iconPath = new vscode.ThemeIcon("symbol-object");
                break;
            default:
                this.contextValue = isObject ? "object" : "leaf";
                this.iconPath = isObject
                    ? new vscode.ThemeIcon("symbol-class")
                    : new vscode.ThemeIcon("symbol-field");
                this.description = this.formatValue(value);
                this.tooltip = `${label} = ${this.formatValue(value)}`;
                break;
        }
    }

    private static resolveCollapsibleState(itemType: ItemType, value?: unknown): vscode.TreeItemCollapsibleState {
        const collapsibleTypes: ItemType[] = [
            "namespace", "ormGroup", "model", "schemaGroup", "recordsGroup", "record"
        ];
        if (collapsibleTypes.includes(itemType)) {
            return vscode.TreeItemCollapsibleState.Collapsed;
        }
        if (typeof value === "object" && value !== null) {
            return vscode.TreeItemCollapsibleState.Collapsed;
        }
        return vscode.TreeItemCollapsibleState.None;
    }

    private formatValue(value: unknown): string {
        if (value === null || value === undefined) {
            return "null";
        }
        if (Array.isArray(value)) {
            return `Array(${value.length})`;
        }
        if (typeof value === "object") {
            return "{...}";
        }
        return String(value);
    }
}

/**
 * TreeDataProvider for the DBAPI database explorer.
 * Supports infinite nesting (Namespace > Key > SubKey > ...)
 * and ORM models (Schema + Records).
 */
export class DatabaseTreeProvider
    implements vscode.TreeDataProvider<DatabaseTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<
        DatabaseTreeItem | undefined | null | void
    >();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private readonly dbService: DatabaseService) { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DatabaseTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: DatabaseTreeItem): DatabaseTreeItem[] {
        if (!this.dbService.isConfigured()) {
            return [];
        }

        // Root level: Show grouped namespaces
        if (!element) {
            return this.dbService.getGroupedNamespaces().map(
                (group) => {
                    const item = new DatabaseTreeItem(
                        group.namespace, "namespace", group.namespace,
                        undefined, undefined, undefined, group.models
                    );
                    return item;
                }
            );
        }

        // Namespace level: KV entries + "Modeles" group
        if (element.itemType === "namespace" && element.namespace) {
            const items: DatabaseTreeItem[] = [];

            // KV entries from the main namespace file
            const data = this.dbService.getNamespaceData(element.namespace);
            const keys = Object.keys(data).sort();
            for (const key of keys) {
                items.push(new DatabaseTreeItem(
                    key, "entry", element.namespace, [key], data[key]
                ));
            }

            // ORM models group
            const models = element.ormModels || [];
            if (models.length > 0) {
                items.push(new DatabaseTreeItem(
                    "Modeles", "ormGroup", element.namespace,
                    undefined, undefined, undefined, models
                ));
            }

            return items;
        }

        // ORM Group: list models
        if (element.itemType === "ormGroup" && element.ormModels) {
            return element.ormModels.map(
                (m) => new DatabaseTreeItem(
                    m.modelName, "model", element.namespace,
                    undefined, undefined, m.modelName, undefined,
                    m.schemaFile, m.dataFile
                )
            );
        }

        // Model: Schema + Records
        if (element.itemType === "model" && element.schemaFile && element.dataFile) {
            const records = this.dbService.getOrmRecords(element.dataFile);
            return [
                new DatabaseTreeItem(
                    "Schema", "schemaGroup", element.namespace,
                    undefined, undefined, element.modelName, undefined,
                    element.schemaFile
                ),
                new DatabaseTreeItem(
                    `Enregistrements (${records.length})`, "recordsGroup",
                    element.namespace, undefined, undefined,
                    element.modelName, undefined, undefined, element.dataFile
                ),
            ];
        }

        // Schema Group: show fields
        if (element.itemType === "schemaGroup" && element.schemaFile) {
            const schema = this.dbService.getOrmSchema(element.schemaFile);
            if (!schema || !schema.fields || typeof schema.fields !== "object") {
                return [];
            }
            const fields = schema.fields as Record<string, Record<string, unknown>>;
            return Object.keys(fields).sort().map((fieldName) => {
                const field = fields[fieldName];
                const typeName = String(field.type || "unknown");
                const parts = [typeName];
                if (field.required) {
                    parts.push("requis");
                }
                if (field.default !== undefined) {
                    parts.push(`defaut: ${JSON.stringify(field.default)}`);
                }
                const item = new DatabaseTreeItem(
                    fieldName, "schemaField", element.namespace
                );
                item.description = parts.join(", ");
                return item;
            });
        }

        // Records Group: list records
        if (element.itemType === "recordsGroup" && element.dataFile) {
            const records = this.dbService.getOrmRecords(element.dataFile);
            return records.map((rec) => {
                const id = rec.id !== undefined ? String(rec.id) : "?";
                return new DatabaseTreeItem(
                    `#${id}`, "record", element.namespace,
                    undefined, rec
                );
            });
        }

        // Record: show fields as properties
        if (element.itemType === "record" && element.value && typeof element.value === "object") {
            const obj = element.value as Record<string, unknown>;
            return Object.keys(obj).sort().map((key) => {
                return new DatabaseTreeItem(
                    key, "property", element.namespace,
                    [...(element.keyPath || []), key], obj[key]
                );
            });
        }

        // Nested level: Show properties of objects/tables
        if (element.value && typeof element.value === "object" && element.namespace && element.keyPath) {
            const obj = element.value as Record<string, unknown>;
            const keys = Object.keys(obj).sort();

            return keys.map(
                (key) => {
                    const newPath = [...(element.keyPath || []), key];
                    return new DatabaseTreeItem(
                        key,
                        "property",
                        element.namespace,
                        newPath,
                        obj[key]
                    );
                }
            );
        }

        return [];
    }
}
