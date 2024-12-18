import Database from 'better-sqlite3';
import * as vscode from 'vscode';
import { Event, EventEmitter, TreeDataProvider, TreeItem, TreeItemCollapsibleState } from 'vscode';

// Define the SQLite Database structure
class SqliteDatabaseProvider implements TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: EventEmitter<TreeItem | undefined> = new EventEmitter<TreeItem | undefined>();
  readonly onDidChangeTreeData: Event<TreeItem | undefined> = this._onDidChangeTreeData.event;

  private db: Database.Database | null = null;
  private tables: string[] = [];

  constructor() {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeItem): TreeItem {
    return element;
  }

  // Getter method to access the 'db' property
  public getDatabase(): Database.Database | null {
    return this.db;
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!this.db) {
      return [];
    }

    if (element) {
      // Show columns of the selected table
      const tableName = (element.label as string) ?? '';
      return this.getColumnsForTable(tableName);
    } else {
      // Show the list of tables
      if (this.tables.length === 0) {
        await this.loadTables();
      }
      return this.tables.map(tableName => new TableItem(tableName));
    }
  }

  openDatabase(dbPath: string) {
    try {
      this.db = new Database(dbPath);
      this.loadTables();
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to open database: ${(err as { message: string }).message}`);
    }
  }

  private loadTables() {
    if (this.db) {
      try {
        // Explicitly type the rows as an array of objects with a 'name' property
        const rows = this.db.prepare('SELECT name FROM sqlite_master WHERE type="table";').all();
        this.tables = rows.map(row => (row as { name: string }).name); // Now TypeScript knows 'row' has a 'name' property
        this.refresh();
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to query database: ${(err as { message: string }).message}`);
      }
    }
  }

  private getColumnsForTable(tableName: string): Promise<TreeItem[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject('Database is not opened.');
        return;
      }

      try {
        const rows = this.db.prepare(`PRAGMA table_info(${tableName});`).all();
        const columnItems = rows.map(row => new ColumnItem((row as { name: string }).name));
        resolve(columnItems);
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to fetch columns: ${(err as { message: string }).message}`);
        reject(err);
      }
    });
  }
}

class TableItem extends TreeItem {
  constructor(tableName: string) {
    super(tableName, TreeItemCollapsibleState.Collapsed);
    this.contextValue = 'table';
  }
}

class ColumnItem extends TreeItem {
  constructor(columnName: string) {
    super(columnName, TreeItemCollapsibleState.None);
    this.contextValue = 'column';
  }
}

export function activate(context: vscode.ExtensionContext) {
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
    } else {
      vscode.window.showErrorMessage('No database loaded.');
    }
  });

  context.subscriptions.push(buttonDisposable);
}

export function deactivate() {}
