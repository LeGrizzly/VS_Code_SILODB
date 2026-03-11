# SILODB Explorer - VS Code Extension

Browse and edit [FS25 SILODB](https://github.com/LeGrizzly/FS25_SILODB) database files directly from VS Code.

## Features

- **Sidebar TreeView** - Namespaces and key-value entries in the activity bar
- **Auto-detect savegames** - Finds `SILODB_data` directories in your FS25 savegames
- **CRUD operations** - Add, edit, delete namespaces and entries
- **JSON-aware editing** - Input `42` (number), `true` (boolean), `{"key": "value"}` (object), or plain strings
- **Manual path** - Point to any `SILODB_data` directory

## Getting Started

### Install

```bash
cd vscode-extension
npm install
npm run compile
```

### Run in Development

1. Open `vscode-extension/` in VS Code
2. Press `F5` to launch the Extension Development Host
3. The "SILODB Explorer" icon appears in the activity bar (left sidebar)

### Connect to Data

- Click the **search icon** in the SILODB view title bar to auto-detect savegames
- Or click the **folder icon** to manually browse to a `SILODB_data` directory
- Or set `SILODB.dataPath` in VS Code settings

## Usage

### Sidebar Tree

```
SILODB Explorer
  FS25_MyMod          (namespace - click to expand)
    highScore = 9001   (entry)
    settings = {...}   (entry - JSON object)
  FS25_OtherMod
    ...
```

### Inline Actions

| Context | Actions |
|---------|---------|
| Namespace | Add entry (+), Delete namespace (trash) |
| Entry | Edit value (pencil), Delete entry (trash) |

### Title Bar Actions

| Icon | Action |
|------|--------|
| Search | Auto-detect savegames |
| Folder | Set database path manually |
| Refresh | Reload data from disk |
| New folder | Create namespace |

### Value Input

When adding or editing values, the extension parses your input intelligently:

| Input | Stored as |
|-------|-----------|
| `42` | number |
| `3.14` | number |
| `true` / `false` | boolean |
| `"hello"` | string `hello` |
| `hello` | string `hello` |
| `{"a": 1}` | object |
| `[1, 2, 3]` | array |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `SILODB.dataPath` | `""` | Path to `SILODB_data` directory. Leave empty for auto-detection. |

## Architecture

```
src/
  extension.ts           -- Entry point, command registration
  DatabaseService.ts     -- File I/O, auto-detection, CRUD operations
  DatabaseTreeProvider.ts -- VS Code TreeDataProvider implementation
```

The extension reads/writes the same JSON files that the FS25 SILODB mod uses, so changes are immediately visible in-game after a reload.

---

## Feedback

Your feedback is invaluable as we cultivate this project. Please feel free to raise an issue on this repository to report bugs or suggest new features.

---

## Credits
- **Author**: LeGrizzly
- **Version**: 2.0.2

---

## 📝 License

This mod is licensed under **[CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)**.

You may share it in its original form with attribution. You may not sell it, modify and redistribute it, or reupload it under a different name or authorship. Contributions via pull request are explicitly permitted and encouraged.

---

## ☕ Support

If you enjoy this mod and want to support my work, consider buying me a coffee!
<br><br>
<a href="https://buymeacoffee.com/legrizzly"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" width="150" alt="Buy Me A Coffee" /></a>
