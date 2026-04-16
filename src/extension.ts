import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { patchWorkbench } from './core/patcher';
import { buildCss } from './utils/css';

const CONFIG_KEY = 'backgroundImage.activeTheme';

// True only in the window that ran a toggle command — prevents other windows
// from patching workbench.html and reloading when the global config changes.
export let _localConfigChange = false;

export function _setLocalConfigChangeForTest(value: boolean) {
    _localConfigChange = value;
}

function updateMenuContext(minecraftEnabled: boolean, subwayEnabled: boolean): void {
    vscode.commands.executeCommand('setContext', 'backgroundImage.minecraftEnabled', minecraftEnabled);
    vscode.commands.executeCommand('setContext', 'backgroundImage.subwaySurfersEnabled', subwayEnabled);
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

async function applyThemeForWindow(context: vscode.ExtensionContext, theme: string, silent = false) {
    if (theme === 'minecraft' || theme === 'subwaysurfers') {
        const folderPath = path.join(context.extensionUri.fsPath, 'assets', theme);
        const imagePath = await getRandomWebpFromFolder(folderPath);
        if (!imagePath) {
            if (!silent) {
                vscode.window.showErrorMessage(`Parkour Background: No images found for the ${theme} theme.`);
            }
            return;
        }
        
        const config = vscode.workspace.getConfiguration('backgroundImage');
        const opacity = config.get<number>('opacity', 0.15);
        const css = await buildCss(imagePath, Math.min(0.25, Math.max(0.05, opacity)));
        await patchWorkbench(context, css, silent);
    } else {
        await patchWorkbench(context, null, silent);
    }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {

    // Save appRoot for the uninstaller to use
    const appRootFile = path.join(context.extensionPath, 'app-root.txt');
    try {
        await fs.promises.writeFile(appRootFile, vscode.env.appRoot, 'utf8');
    } catch (err) {
        console.error('Parkour Background: Failed to save app-root.txt', err);
    }

    context.subscriptions.push(vscode.commands.registerCommand('backgroundImage.uninstall', async () => {
        const choice = await vscode.window.showWarningMessage(
            'Are you sure you want to uninstall Parkour Background? This will toggle the background off and reload the window.',
            'Uninstall'
        );
        if (choice !== 'Uninstall') { return; }
        
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        
        // Ensure the CSS is removed and file patched immediately (silent = true)
        await applyThemeForWindow(context, 'none', true);

        try {
            await vscode.commands.executeCommand('workbench.extensions.uninstallExtension', 'paulhealydev.vscode-ext-parkour-background');
        } catch (err) {
            console.error('Failed to uninstall extension programmatically', err);
            vscode.window.showErrorMessage('Could not uninstall extension automatically. Please uninstall it manually from the Extensions view.');
        }
        
        vscode.commands.executeCommand('workbench.action.reloadWindow');
    }));

    context.subscriptions.push(vscode.commands.registerCommand('backgroundImage.toggleMinecraft', async () => {
        const config = vscode.workspace.getConfiguration('backgroundImage');
        const current = config.get<string>('activeTheme', 'none');
        _localConfigChange = true;
        // Use Workspace target to isolate to current window/workspace if possible.
        const target = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 
            ? vscode.ConfigurationTarget.Workspace 
            : vscode.ConfigurationTarget.Global;
        await config.update('activeTheme', current === 'minecraft' ? 'none' : 'minecraft', target);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('backgroundImage.toggleSubwaySurfers', async () => {
        const config = vscode.workspace.getConfiguration('backgroundImage');
        const current = config.get<string>('activeTheme', 'none');
        _localConfigChange = true;
        const target = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 
            ? vscode.ConfigurationTarget.Workspace 
            : vscode.ConfigurationTarget.Global;
        await config.update('activeTheme', current === 'subwaysurfers' ? 'none' : 'subwaysurfers', target);
    }));

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (!e.affectsConfiguration(CONFIG_KEY) && !e.affectsConfiguration('backgroundImage.opacity')) { return; }
        const config = vscode.workspace.getConfiguration('backgroundImage');
        const theme = config.get<string>('activeTheme', 'none');
        updateMenuContext(theme === 'minecraft', theme === 'subwaysurfers');

        if (!_localConfigChange && e.affectsConfiguration(CONFIG_KEY)) { return; }
        _localConfigChange = false;

        await applyThemeForWindow(context, theme, false);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('backgroundImage.setOpacity', async () => {
        const PRESETS = [
            { label: '5% — Subtle',   value: 0.05 },
            { label: '10% — Low',     value: 0.10 },
            { label: '15% — Default', value: 0.15 },
            { label: '25% — High',    value: 0.25 },
        ];
        const config = vscode.workspace.getConfiguration('backgroundImage');
        const current = config.get<number>('opacity', 0.15);
        const items = PRESETS.map(p => ({
            label: p.label,
            description: p.value === current ? '(current)' : undefined,
            value: p.value,
        }));
        const picked = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select background image opacity',
        });
        if (!picked) { return; }
        _localConfigChange = true;
        await config.update('opacity', picked.value, vscode.ConfigurationTarget.Global);
    }));

    // Re-apply or remove theme on startup.
    const config = vscode.workspace.getConfiguration('backgroundImage');
    const theme = config.get<string>('activeTheme', 'none');
    updateMenuContext(theme === 'minecraft', theme === 'subwaysurfers');
    
    // Check if workbench.html already has an injection.
    // If we are in a window where theme is 'none' but workbench.html has an injection,
    // it means another window (Window A) enabled it globally. We should remove it 
    // for this window (Window B) to fix Bug 3.
    await applyThemeForWindow(context, theme, true);
}

export function deactivate(): void {
}