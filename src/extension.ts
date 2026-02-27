import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const CONFIG_KEY = 'backgroundImage.activeTheme';
const STYLE_ID = 'editor-background-image';
const INJECTION_START = `<style id="${STYLE_ID}">`;
const INJECTION_END = `</style><!-- /${STYLE_ID} -->`;

let _context: vscode.ExtensionContext | undefined;

function getWorkbenchHtmlPath(): string {
    const fromAppRoot = path.join(
        vscode.env.appRoot,
        'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html'
    );
    if (fs.existsSync(fromAppRoot)) {
        return fromAppRoot;
    }

    // In Remote SSH the extension host appRoot is the VS Code Server, not the
    // desktop Electron app. Fall back to known system installation paths.
    const systemPaths = [
        '/usr/share/code/resources/app/out/vs/code/electron-browser/workbench/workbench.html',
        '/usr/lib/code/resources/app/out/vs/code/electron-browser/workbench/workbench.html',
        '/opt/visual-studio-code/resources/app/out/vs/code/electron-browser/workbench/workbench.html',
        path.join(process.env.HOME || '', 'Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html'),
    ];

    for (const p of systemPaths) {
        if (fs.existsSync(p)) {
            return p;
        }
    }

    // Return the appRoot-derived path so the caller receives a meaningful error
    return fromAppRoot;
}

function getRandomWebpFromFolder(folderPath: string): string | null {
    try {
        const files = fs.readdirSync(folderPath).filter(f => f.toLowerCase().endsWith('.webp'));
        if (files.length === 0) { return null; }
        const idx = Math.floor(Math.random() * files.length);
        return path.join(folderPath, files[idx]);
    } catch {
        return null;
    }
}

function buildCss(imagePath: string, opacity: number): string {
    const imageData = fs.readFileSync(imagePath);
    const base64 = imageData.toString('base64');
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.webp' ? 'image/webp' : 'image/png';
    const dataUri = `data:${mimeType};base64,${base64}`;
    return [
        INJECTION_START,
        `.monaco-editor.focused .overflow-guard { position: relative; }`,
        `.monaco-editor.focused .overflow-guard::before {`,
        `  content: '';`,
        `  position: absolute;`,
        `  top: 0; left: 0; right: 0; bottom: 0;`,
        `  background-image: url("${dataUri}");`,
        `  background-position: center;`,
        `  background-repeat: no-repeat;`,
        `  background-size: cover;`,
        `  opacity: ${opacity};`,
        `  pointer-events: none;`,
        `  z-index: 50;`,
        `}`,
        INJECTION_END,
    ].join('\n');
}

async function updateProductJsonChecksum(htmlPath: string): Promise<boolean> {
    // product.json lives at the VSCode app root, 5 levels up from workbench.html
    // .../resources/app/out/vs/code/electron-browser/workbench/workbench.html
    //                  ^^^--- 5 `..` = app root
    const productPath = path.resolve(path.dirname(htmlPath), '..', '..', '..', '..', '..', 'product.json');

    try {
        const htmlData = await fs.promises.readFile(htmlPath);
        const sha256 = crypto.createHash('sha256').update(htmlData).digest('base64');
        const productRaw = await fs.promises.readFile(productPath, 'utf8');
        const product = JSON.parse(productRaw);
        const key = 'vs/code/electron-browser/workbench/workbench.html';
        if (product.checksums && product.checksums[key] !== sha256) {
            product.checksums[key] = sha256;
            await fs.promises.writeFile(productPath, JSON.stringify(product, null, '\t'), 'utf8');
        }
        return true;
    } catch {
        return false; // product.json not writable (requires elevated permissions)
    }
}

async function patchWorkbench(context: vscode.ExtensionContext, theme: 'minecraft' | 'subwaysurfers' | null, silent = false): Promise<void> {
    const htmlPath = getWorkbenchHtmlPath();
    let html: string;

    try {
        html = await fs.promises.readFile(htmlPath, 'utf8');
    } catch {
        if (!silent) {
            vscode.window.showErrorMessage('Parkour Background: Could not read VSCode workbench file.');
        }
        return;
    }

    // Strip any existing injection
    const startIdx = html.indexOf(INJECTION_START);
    const endIdx = html.indexOf(INJECTION_END);
    const alreadyInjected = startIdx !== -1 && endIdx !== -1;
    if (alreadyInjected) {
        html = html.slice(0, startIdx).trimEnd() + '\n\t' + html.slice(endIdx + INJECTION_END.length).trimStart();
    }

    if (theme !== null) {
        // Skip re-injection on startup if already injected (avoid redundant disk writes)
        if (alreadyInjected && silent) { return; }

        const folderName = theme === 'minecraft' ? 'minecraft' : 'subwaysurfers';
        const folderPath = path.join(context.extensionPath, 'assets', folderName);
        const imagePath = getRandomWebpFromFolder(folderPath);

        if (!imagePath) {
            if (!silent) {
                const themeLabel = theme === 'minecraft' ? 'Minecraft' : 'Subway Surfers';
                vscode.window.showErrorMessage(`Parkour Background: Failed to load ${themeLabel} background image. No images found in the assets folder.`);
            }
            return;
        }

        const opacity = context.globalState.get<number>('backgroundImage.opacity', 0.15);
        const injection = buildCss(imagePath, Math.min(0.25, Math.max(0.05, opacity)));
        html = html.replace('</head>', `${injection}\n\t</head>`);
    } else {
        // If nothing was injected, nothing to do
        if (!alreadyInjected) { return; }
    }

    try {
        await fs.promises.writeFile(htmlPath, html, 'utf8');
        await updateProductJsonChecksum(htmlPath);
    } catch (err: unknown) {
        if (!silent) {
            const msg = (err as NodeJS.ErrnoException).code === 'EACCES'
                ? 'Parkour Background: Permission denied writing to VSCode. Try running VSCode as administrator.'
                : `Parkour Background: Failed to patch VSCode — ${err}`;
            vscode.window.showErrorMessage(msg);
        }
        return;
    }

    if (!silent) {
        const state = theme !== null ? 'enabled' : 'disabled';
        vscode.window.showInformationMessage(`Parkour Background ${state}. Reloading VSCode...`);
        // Small delay so the notification is briefly visible before reload
        setTimeout(() => {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
        }, 1000);
    }
}

function updateMenuContext(minecraftEnabled: boolean, subwayEnabled: boolean): void {
    vscode.commands.executeCommand('setContext', 'backgroundImage.minecraftEnabled', minecraftEnabled);
    vscode.commands.executeCommand('setContext', 'backgroundImage.subwaySurfersEnabled', subwayEnabled);
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    _context = context;
    console.log(`[Parkour Background] appRoot: ${vscode.env.appRoot}`);
    console.log(`[Parkour Background] workbench path: ${getWorkbenchHtmlPath()}`);

    context.subscriptions.push(vscode.commands.registerCommand('backgroundImage.toggleMinecraft', async () => {
        const config = vscode.workspace.getConfiguration('backgroundImage');
        const current = config.get<string>('activeTheme', 'none');
        await config.update('activeTheme', current === 'minecraft' ? 'none' : 'minecraft', vscode.ConfigurationTarget.Global);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('backgroundImage.toggleSubwaySurfers', async () => {
        const config = vscode.workspace.getConfiguration('backgroundImage');
        const current = config.get<string>('activeTheme', 'none');
        await config.update('activeTheme', current === 'subwaysurfers' ? 'none' : 'subwaysurfers', vscode.ConfigurationTarget.Global);
    }));

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (e) => {
        const config = vscode.workspace.getConfiguration('backgroundImage');
        const theme = config.get<string>('activeTheme', 'none');
        if (e.affectsConfiguration(CONFIG_KEY)) {
            updateMenuContext(theme === 'minecraft', theme === 'subwaysurfers');
            if (theme === 'minecraft') {
                await patchWorkbench(context, 'minecraft');
            } else if (theme === 'subwaysurfers') {
                await patchWorkbench(context, 'subwaysurfers');
            } else {
                await patchWorkbench(context, null);
            }
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

    // On startup, always remove any background injection and reset menu context.
    // We do NOT update the config here to avoid firing onDidChangeConfiguration
    // and triggering an unwanted reload loop.
    updateMenuContext(false, false);
    await patchWorkbench(context, null, true);
}

export function deactivate(): void {
    // Intentionally empty. The workbench patch persists across reloads by design —
    // the user's preference is stored in settings and re-applied on next activation.
    // The patch is only removed when the user explicitly disables the background image.
}

