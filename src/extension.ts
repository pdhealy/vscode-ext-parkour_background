import * as vscode from 'vscode';
import { patchWorkbench } from './core/patcher';

const CONFIG_KEY = 'backgroundImage.activeTheme';

// True only in the window that ran a toggle command — prevents other windows
// from patching workbench.html and reloading when the global config changes.
export let _localConfigChange = false;

// For testing purposes
export function _setLocalConfigChangeForTest(value: boolean) {
    _localConfigChange = value;
}

function updateMenuContext(minecraftEnabled: boolean, subwayEnabled: boolean): void {
    vscode.commands.executeCommand('setContext', 'backgroundImage.minecraftEnabled', minecraftEnabled);
    vscode.commands.executeCommand('setContext', 'backgroundImage.subwaySurfersEnabled', subwayEnabled);
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {

    context.subscriptions.push(vscode.commands.registerCommand('backgroundImage.toggleMinecraft', async () => {
        const config = vscode.workspace.getConfiguration('backgroundImage');
        const current = config.get<string>('activeTheme', 'none');
        _localConfigChange = true;
        await config.update('activeTheme', current === 'minecraft' ? 'none' : 'minecraft', vscode.ConfigurationTarget.Global);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('backgroundImage.toggleSubwaySurfers', async () => {
        const config = vscode.workspace.getConfiguration('backgroundImage');
        const current = config.get<string>('activeTheme', 'none');
        _localConfigChange = true;
        await config.update('activeTheme', current === 'subwaysurfers' ? 'none' : 'subwaysurfers', vscode.ConfigurationTarget.Global);
    }));

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (!e.affectsConfiguration(CONFIG_KEY)) { return; }
        const config = vscode.workspace.getConfiguration('backgroundImage');
        const theme = config.get<string>('activeTheme', 'none');
        updateMenuContext(theme === 'minecraft', theme === 'subwaysurfers');

        // Only the window that ran the command patches the file and reloads.
        // Other windows just updated their context menus above and stop here.
        if (!_localConfigChange) { return; }
        _localConfigChange = false;

        if (theme === 'minecraft') {
            await patchWorkbench(context, 'minecraft');
        } else if (theme === 'subwaysurfers') {
            await patchWorkbench(context, 'subwaysurfers');
        } else {
            await patchWorkbench(context, null);
        }
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
            await patchWorkbench(context, theme);
        }
    }));

    // Re-apply the saved theme on startup without prompting for a reload.
    const config = vscode.workspace.getConfiguration('backgroundImage');
    const theme = config.get<string>('activeTheme', 'none');
    updateMenuContext(theme === 'minecraft', theme === 'subwaysurfers');
    if (theme === 'minecraft') {
        await patchWorkbench(context, 'minecraft', true);
    } else if (theme === 'subwaysurfers') {
        await patchWorkbench(context, 'subwaysurfers', true);
    } else {
        await patchWorkbench(context, null, true);
    }
}

export function deactivate(): void {
    // Intentionally empty — the workbench patch persists by design.
    // It is only removed when the user explicitly disables the background.
}
