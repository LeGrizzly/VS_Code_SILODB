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
        label: "setValue",
        description: "Sauvegarder une valeur",
        detail: "(namespace, key, value) → boolean, err",
        doc:
            "Enregistre une donnée dans la base de données.\n\n" +
            "**Paramètres :**\n" +
            "- `namespace` — Nom de votre mod (ex: `\"FS25_MyMod\"`)\n" +
            "- `key` — La clé unique pour cette donnée\n" +
            "- `value` — La valeur (nombre, texte, booléen ou table)\n\n" +
            "**Exemple :**\n" +
            "```lua\n" +
            'local DBAPI = g_globalMods["FS25_DBAPI"]\n' +
            'local ok, err = DBAPI.setValue("FS25_MyMod", "money", 5000)\n' +
            "if not ok then print(err) end\n" +
            "```",
        
        snippet: 'setValue("${1:namespace}", "${2:key}", ${3:value})',
    },
    {
        label: "getValue",
        description: "Récupérer une valeur",
        detail: "(namespace, key) → any|nil, err",
        doc:
            "Récupère une donnée depuis la base de données.\n\n" +
            "**Paramètres :**\n" +
            "- `namespace` — Nom de votre mod\n" +
            "- `key` — La clé à récupérer\n\n" +
            "**Exemple :**\n" +
            "```lua\n" +
            'local DBAPI = g_globalMods["FS25_DBAPI"]\n' +
            'local val = DBAPI.getValue("FS25_MyMod", "money")\n' +
            'if val ~= nil then print("Solde: " .. tostring(val)) end\n' +
            "```",
        snippet: 'getValue("${1:namespace}", "${2:key}")',
    },
    {
        label: "deleteValue",
        description: "Supprimer une clé",
        detail: "(namespace, key) → boolean, err",
        doc:
            "Supprime définitivement une clé et sa valeur.\n\n" +
            "**Paramètres :**\n" +
            "- `namespace` — Nom de votre mod\n" +
            "- `key` — La clé à supprimer\n\n" +
            "**Exemple :**\n" +
            "```lua\n" +
            'local ok, err = self.DBAPI.deleteValue("FS25_MyMod", "oldKey")\n' +
            "```",
        snippet: 'deleteValue("${1:namespace}", "${2:key}")',
    },
    {
        label: "listKeys",
        description: "Lister les clés d'un mod",
        detail: "(namespace) → table|nil, err",
        doc:
            "Retourne une liste triée de toutes les clés enregistrées pour un mod.\n\n" +
            "**Exemple :**\n" +
            "```lua\n" +
            'local keys = self.DBAPI.listKeys("FS25_MyMod")\n' +
            "for _, k in ipairs(keys or {}) do print(k) end\n" +
            "```",
        snippet: 'listKeys("${1:namespace}")',
    },
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
];

export class DBAPICompletionProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] | undefined {
        const linePrefix = document
            .lineAt(position)
            .text.substring(0, position.character);

        // Déclenche sur "DBAPI." peu importe ce qu'il y a avant (self.DBAPI, myMod.DBAPI, etc)
        if (!linePrefix.match(/DBAPI\.$/)) {
            return undefined;
        }

        return DBAPI_METHODS.map((m) => {
            // Utilisation du format riche pour le label (disponible dans les versions récentes de VS Code)
            const item = new vscode.CompletionItem(
                {
                    label: m.label,
                    description: m.description // Apparaît en gris clair à côté du label
                },
                vscode.CompletionItemKind.Method
            );
            
            item.detail = m.detail; // Signature de la méthode
            
            const docs = new vscode.MarkdownString(m.doc);
            docs.isTrusted = true;
            docs.supportHtml = true;
            item.documentation = docs;
            
            item.insertText = new vscode.SnippetString(m.snippet);
            
            // Priorité dans la liste
            item.sortText = `0_${m.label}`;
            
            // Le texte filtré doit être uniquement le nom de la fonction
            item.filterText = m.label;
            
            return item;
        });
    }
}
