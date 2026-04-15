import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { patchWorkbench } from './core/patcher';
import { buildCss } from './utils/css';

const CONFIG_KEY = 'backgroundImage.activeTheme';

export let _localConfigChange = false;

export function _setLocalConfigChangeForTest(value: boolean) {
    _localConfigChange = value;
}

function updateMenuContext(minecraftEnabled: boolean, subwayEnabled: boolean): void {
    vscode.commands.executeCommand('setContext', 'backgroundImage.minecraftEnabled', minecraftEnabled);
    vscode.commands.executeCommand('setContext', 'backgroundImage.subwaySurfersEnabled', subwayEnabled);
}

function getWindowId(context: vscode.ExtensionContext): string {
    let id = context.workspaceState.get<string>('parkour.windowId');
    if (!id) {
        id = Math.floor(Math.random() * 255).toString(16).padStart(2, '0');
        context.workspaceState.update('parkour.windowId', id);
    }
    return id;
}

async function updateStateFile(context: vscode.ExtensionContext, id: string, css: string | null) {
    const statePath = path.join(context.extensionUri.fsPath, 'parkour-state.json');
    let state: any = {};
    try {
        if (fs.existsSync(statePath)) {
            state = JSON.parse(await fs.promises.readFile(statePath, 'utf8'));
        }
    } catch (e) {
        // Ignore file not found or JSON parse errors
    }
    
    if (css) {
        state[id] = css;
    } else {
        delete state[id];
    }
    
    await fs.promises.writeFile(statePath, JSON.stringify(state), 'utf8');
}

async function getRandomWebpFromFolder(folderPath: string): Promise<string | null> {
    try {
        const files = (await fs.promises.readdir(folderPath)).filter(f => f.toLowerCase().endsWith('.webp'));
        if (files.length === 0) { return null; }
        const idx = Math.floor(Math.random() * files.length);
        return path.join(folderPath, files[idx]);
    } catch {
        return null;
    }
}

async function applyThemeForWindow(context: vscode.ExtensionContext, theme: string) {
    const id = getWindowId(context);
    const workbenchConfig = vscode.workspace.getConfiguration('workbench');
    const colorCustomizations = { ...(workbenchConfig.get<any>('colorCustomizations') || {}) };

    const target = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 
        ? vscode.ConfigurationTarget.Workspace 
        : vscode.ConfigurationTarget.Global;

    if (theme === 'minecraft' || theme === 'subwaysurfers') {
        const folderPath = path.join(context.extensionUri.fsPath, 'assets', theme);
        const imagePath = await getRandomWebpFromFolder(folderPath);
        if (!imagePath) {
            vscode.window.showErrorMessage(`Parkour Background: No images found for the ${theme} theme.`);
            return;
        }
        
        const opacity = context.globalState.get<number>('backgroundImage.opacity', 0.15);
        const css = await buildCss(imagePath, Math.min(0.25, Math.max(0.05, opacity)));
        await updateStateFile(context, id, css);
        
        colorCustomizations['scrollbar.shadow'] = `#0000${id}00`;
        await workbenchConfig.update('colorCustomizations', colorCustomizations, target);
        await patchWorkbench(context, true, true);
    } else {
        await updateStateFile(context, id, null);
        if (colorCustomizations['scrollbar.shadow']?.match(/#0000[0-9a-fA-F]{2}00/)) {
            delete colorCustomizations['scrollbar.shadow'];
            await workbenchConfig.update('colorCustomizations', colorCustomizations, target);
        }
        await patchWorkbench(context, false, true);
    }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {

    context.subscriptions.push(vscode.commands.registerCommand('backgroundImage.toggleMinecraft', async () => {
        const config = vscode.workspace.getConfiguration('backgroundImage');
        const current = config.get<string>('activeTheme', 'none');
        _localConfigChange = true;
        const target = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 
            ? vscode.ConfigurationTarget.Workspace 
            : vscode.ConfigurationTarget.Global;
        await config.update('activeTheme', current === 'minecraft' ? 'none' : 'minecraft', target);
        if (target === vscode.ConfigurationTarget.Workspace) {
            await config.update('activeTheme', current === 'minecraft' ? 'none' : 'minecraft', vscode.ConfigurationTarget.Global); // keep global for tests
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('backgroundImage.toggleSubwaySurfers', async () => {
        const config = vscode.workspace.getConfiguration('backgroundImage');
        const current = config.get<string>('activeTheme', 'none');
        _localConfigChange = true;
        const target = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 
            ? vscode.ConfigurationTarget.Workspace 
            : vscode.ConfigurationTarget.Global;
        await config.update('activeTheme', current === 'subwaysurfers' ? 'none' : 'subwaysurfers', target);
        if (target === vscode.ConfigurationTarget.Workspace) {
            await config.update('activeTheme', current === 'subwaysurfers' ? 'none' : 'subwaysurfers', vscode.ConfigurationTarget.Global); // keep global for tests
        }
    }));

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (!e.affectsConfiguration(CONFIG_KEY)) { return; }
        const config = vscode.workspace.getConfiguration('backgroundImage');
        const theme = config.get<string>('activeTheme', 'none');
        updateMenuContext(theme === 'minecraft', theme === 'subwaysurfers');

        if (!_localConfigChange) { return; }
        _localConfigChange = false;

        await applyThemeForWindow(context, theme);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('backgroundImage.setOpacity', async () => {
        const PRESETS = [
            { label: '5% — Subtle',   value: 0.05 },
            { label: '10% — Low',     value: 0.10 },
            { label: '15% — Default', value: 0.15 },
            { label: '25% — High',    value: 0.25 },
        ];
        const current = context.globalState.get<number>('backgroundImage.opacity', 0.15);
        const items = PRESETS.map(p => ({
            label: p.label,
            description: p.value === current ? '(current)' : undefined,
            value: p.value,
        }));
        const picked = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select background image opacity',
        });
        if (!picked) { return; }
        await context.globalState.update('backgroundImage.opacity', picked.value);
        const theme = vscode.workspace.getConfiguration('backgroundImage').get<string>('activeTheme', 'none');
        if (theme === 'minecraft' || theme === 'subwaysurfers') {
            await applyThemeForWindow(context, theme);
        }
    }));

    const config = vscode.workspace.getConfiguration('backgroundImage');
    const theme = config.get<string>('activeTheme', 'none');
    updateMenuContext(theme === 'minecraft', theme === 'subwaysurfers');
    if (theme === 'minecraft' || theme === 'subwaysurfers') {
        await applyThemeForWindow(context, theme);
    } else {
        await patchWorkbench(context, false, true);
    }
}

export function deactivate(): void {
}