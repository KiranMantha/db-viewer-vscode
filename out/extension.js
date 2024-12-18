"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const vscode = __importStar(require("vscode"));
const vscode_1 = require("vscode");
// Define the SQLite Database structure
class SqliteDatabaseProvider {
    _onDidChangeTreeData = new vscode_1.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    db = null;
    tables = [];
    constructor() { }
    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    // Getter method to access the 'db' property
    getDatabase() {
        return this.db;
    }
    async getChildren(element) {
        if (!this.db) {
            return [];
        }
        if (element) {
            // Show columns of the selected table
            const tableName = element.label ?? '';
            return this.getColumnsForTable(tableName);
        }
        else {
            // Show the list of tables
            if (this.tables.length === 0) {
                await this.loadTables();
            }
            return this.tables.map(tableName => new TableItem(tableName));
        }
    }
    openDatabase(dbPath) {
        try {
            this.db = new better_sqlite3_1.default(dbPath);
            this.loadTables();
        }
        catch (err) {
            vscode.window.showErrorMessage(`Failed to open database: ${err.message}`);
        }
    }
    loadTables() {
        if (this.db) {
            try {
                // Explicitly type the rows as an array of objects with a 'name' property
                const rows = this.db.prepare('SELECT name FROM sqlite_master WHERE type="table";').all();
                this.tables = rows.map(row => row.name); // Now TypeScript knows 'row' has a 'name' property
                this.refresh();
            }
            catch (err) {
                vscode.window.showErrorMessage(`Failed to query database: ${err.message}`);
            }
        }
    }
    getColumnsForTable(tableName) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('Database is not opened.');
                return;
            }
            try {
                const rows = this.db.prepare(`PRAGMA table_info(${tableName});`).all();
                const columnItems = rows.map(row => new ColumnItem(row.name));
                resolve(columnItems);
            }
            catch (err) {
                vscode.window.showErrorMessage(`Failed to fetch columns: ${err.message}`);
                reject(err);
            }
        });
    }
}
class TableItem extends vscode_1.TreeItem {
    constructor(tableName) {
        super(tableName, vscode_1.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'table';
    }
}
class ColumnItem extends vscode_1.TreeItem {
    constructor(columnName) {
        super(columnName, vscode_1.TreeItemCollapsibleState.None);
        this.contextValue = 'column';
    }
}
function activate(context) {
    const sqliteDatabaseProvider = new SqliteDatabaseProvider();
    // Register the command to open a .db file
    let disposable = vscode.commands.registerCommand('extension.openDatabase', async () => {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            filters: {
                'SQLite Database': ['db']
            }
        });
        if (fileUri && fileUri[0]) {
            sqliteDatabaseProvider.openDatabase(fileUri[0].fsPath);
        }
    });
    context.subscriptions.push(disposable);
    // Register a TreeView to display the database tables and columns
    vscode.window.createTreeView('sqliteExplorer', {
        treeDataProvider: sqliteDatabaseProvider
    });
    // Add a button to trigger the processing of the selected .db file
    const buttonDisposable = vscode.commands.registerCommand('extension.processDatabase', async () => {
        // Add logic to process the loaded database
        if (sqliteDatabaseProvider.getDatabase()) {
            vscode.window.showInformationMessage('Processing database...');
            // Your logic for processing the database goes here
        }
        else {
            vscode.window.showErrorMessage('No database loaded.');
        }
    });
    context.subscriptions.push(buttonDisposable);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map