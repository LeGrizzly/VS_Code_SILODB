import * as vscode from "vscode";

interface MethodDef {
    label: string;
    description: string;
    detail: string;
    doc: string;
    snippet: string;
}

const DBAPI_METHODS: MethodDef[] = [
    {
        label: "isReady",
        description: "Vérifier si la DB est prête",
        detail: "() → boolean",
        doc:
            "Vérifie si la base de données est initialisée et accessible.\n\n" +
            "**Exemple :**\n" +
            "```lua\n" +
            "if self.DBAPI.isReady() then\n" +
            '    print("Base de données opérationnelle")\n' +
            "end\n" +
            "```",
        snippet: "isReady()",
    },
    {
        label: "getVersion",
        description: "Version de l'API",
        detail: "() → string",
        doc:
            "Retourne la version actuelle de DBAPI.\n\n" +
            "**Exemple :**\n" +
            "```lua\n" +
            'print("Version : " .. self.DBAPI.getVersion())\n' +
            "```",
        snippet: "getVersion()",
    },
    {
        label: "bind",
        description: "Lier un namespace (ORM)",
        detail: "(namespace) → instance ORM",
        doc:
            "Crée une instance ORM liée à un namespace.\n\n" +
            "**Paramètres :**\n" +
            "- `namespace` — Nom de votre mod (ex: `\"FS25_MyMod\"`)\n\n" +
            "**Exemple :**\n" +
            "```lua\n" +
            'local db = DBAPI.bind("FS25_MyMod")\n' +
            'db:define("Player", { fields = { name = { type = "string" } } })\n' +
            "```",
        snippet: 'bind("${1:FS25_MyMod}")',
    },
    {
        label: "hasORM",
        description: "Vérifier la disponibilité ORM",
        detail: "() → boolean",
        doc:
            "Retourne true si les fonctionnalités ORM sont disponibles.\n\n" +
            "**Exemple :**\n" +
            "```lua\n" +
            "if DBAPI.hasORM() then\n" +
            '    local db = DBAPI.bind("FS25_MyMod")\n' +
            "end\n" +
            "```",
        snippet: "hasORM()",
    },
];

const ORM_INSTANCE_METHODS: MethodDef[] = [
    {
        label: "define",
        description: "Définir un modèle",
        detail: "(modelName, definition) → schema, err",
        doc:
            "Définit un modèle ORM avec ses champs.\n\n" +
            "**Exemple :**\n" +
            "```lua\n" +
            'db:define("Player", {\n' +
            "    fields = {\n" +
            '        name = { type = "string", required = true },\n' +
            '        money = { type = "number", default = 0 }\n' +
            "    }\n" +
            "})\n" +
            "```",
        snippet: 'define("${1:Model}", { fields = { ${2} } })',
    },
    {
        label: "create",
        description: "Créer un enregistrement",
        detail: "(modelName, data) → record, err",
        doc:
            "Crée un nouvel enregistrement pour le modèle spécifié.\n\n" +
            "**Exemple :**\n" +
            "```lua\n" +
            'local record, err = db:create("Player", { name = "John", money = 1000 })\n' +
            "```",
        snippet: 'create("${1:Model}", { ${2} })',
    },
    {
        label: "find",
        description: "Chercher un enregistrement",
        detail: "(modelName, query) → record, err",
        doc:
            "Trouve le premier enregistrement correspondant à la requête.\n\n" +
            "**Exemple :**\n" +
            "```lua\n" +
            'local player = db:find("Player", { where = { name = "John" } })\n' +
            "```",
        snippet: 'find("${1:Model}", { where = { ${2} } })',
    },
    {
        label: "findAll",
        description: "Chercher tous les enregistrements",
        detail: "(modelName, query) → table, err",
        doc:
            "Trouve tous les enregistrements correspondant à la requête.\n\n" +
            "**Exemple :**\n" +
            "```lua\n" +
            'local players = db:findAll("Player", { where = { level = 5 } })\n' +
            "for _, p in ipairs(players) do print(p.name) end\n" +
            "```",
        snippet: 'findAll("${1:Model}", { where = { ${2} } })',
    },
    {
        label: "findById",
        description: "Chercher par ID",
        detail: "(modelName, id) → record, err",
        doc:
            "Trouve un enregistrement par son identifiant unique.\n\n" +
            "**Exemple :**\n" +
            "```lua\n" +
            'local player = db:findById("Player", 1)\n' +
            "```",
        snippet: 'findById("${1:Model}", ${2:id})',
    },
    {
        label: "update",
        description: "Mettre à jour un enregistrement",
        detail: "(modelName, id, data) → record, err",
        doc:
            "Met à jour un enregistrement existant par son ID.\n\n" +
            "**Exemple :**\n" +
            "```lua\n" +
            'local updated, err = db:update("Player", 1, { money = 5000 })\n' +
            "```",
        snippet: 'update("${1:Model}", ${2:id}, { ${3} })',
    },
    {
        label: "delete",
        description: "Supprimer un enregistrement",
        detail: "(modelName, id) → boolean, err",
        doc:
            "Supprime un enregistrement par son ID.\n\n" +
            "**Exemple :**\n" +
            "```lua\n" +
            'local ok, err = db:delete("Player", 1)\n' +
            "```",
        snippet: 'delete("${1:Model}", ${2:id})',
    },
    {
        label: "count",
        description: "Compter les enregistrements",
        detail: "(modelName, query) → number, err",
        doc:
            "Compte les enregistrements correspondant à la requête.\n\n" +
            "**Exemple :**\n" +
            "```lua\n" +
            'local n = db:count("Player", { where = { level = 5 } })\n' +
            "```",
        snippet: 'count("${1:Model}", { where = { ${2} } })',
    },
];

export class DBAPICompletionProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] | undefined {
        const linePrefix = document
            .lineAt(position)
            .text.substring(0, position.character);

        // Trigger on "DBAPI." — returns global DBAPI methods
        if (linePrefix.match(/DBAPI\.$/)) {
            return this.buildCompletions(DBAPI_METHODS);
        }

        // Trigger on "varName:" — check if varName is bound via DBAPI.bind()
        const colonMatch = linePrefix.match(/(\w+):$/);
        if (colonMatch) {
            const varName = colonMatch[1];
            const fullText = document.getText();
            const bindPattern = new RegExp(`local\\s+${varName}\\s*=\\s*\\S*\\.?bind\\s*\\(`);
            if (bindPattern.test(fullText)) {
                return this.buildCompletions(ORM_INSTANCE_METHODS);
            }
        }

        return undefined;
    }

    private buildCompletions(methods: MethodDef[]): vscode.CompletionItem[] {
        return methods.map((m) => {
            const item = new vscode.CompletionItem(
                {
                    label: m.label,
                    description: m.description,
                },
                vscode.CompletionItemKind.Method
            );

            item.detail = m.detail;

            const docs = new vscode.MarkdownString(m.doc);
            docs.isTrusted = true;
            docs.supportHtml = true;
            item.documentation = docs;

            item.insertText = new vscode.SnippetString(m.snippet);
            item.sortText = `0_${m.label}`;
            item.filterText = m.label;

            return item;
        });
    }
}
