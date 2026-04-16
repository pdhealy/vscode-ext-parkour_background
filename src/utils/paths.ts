import * as path from 'path';
import * as fs from 'fs';

export function getProductJsonPath(appRoot: string): string {
    return path.join(appRoot, 'product.json');
}

export function getAppOutDir(appRoot: string): string {
    return path.join(appRoot, 'out');
}

export function getWorkbenchHtmlPaths(appRoot?: string): string[] {
    const subPaths = [
        ['out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html'],
        ['out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html'],
    ];

    const possiblePaths = new Set<string>();

    const tryAdd = (rootPath: string) => {
        for (const parts of subPaths) {
            const p = path.join(rootPath, ...parts);
            if (fs.existsSync(p)) { possiblePaths.add(p); }
        }
    };

    // 1. If appRoot is provided (from vscode.env.appRoot)
    if (appRoot) {
        tryAdd(appRoot);
    }

    // 2. Try process.execPath dynamically
    if (process.execPath) {
        const execDir = path.dirname(process.execPath);
        if (process.platform === 'darwin') {
            tryAdd(path.join(execDir, '..', 'Resources', 'app'));
        } else {
            tryAdd(path.join(execDir, 'resources', 'app'));
        }
    }

    // 3. Fallbacks
    const appRoots: string[] = [
        '/usr/share/code/resources/app',
        '/usr/lib/code/resources/app',
        '/opt/visual-studio-code/resources/app',
        '/Applications/Visual Studio Code.app/Contents/Resources/app',
        path.join(process.env.HOME ?? '', 'Applications', 'Visual Studio Code.app', 'Contents', 'Resources', 'app'),
        path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Microsoft VS Code', 'resources', 'app'),
        path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Microsoft VS Code', 'resources', 'app'),
        path.join(process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)', 'Microsoft VS Code', 'resources', 'app'),
    ];

    for (const root of appRoots) {
        tryAdd(root);
    }

    return Array.from(possiblePaths);
}