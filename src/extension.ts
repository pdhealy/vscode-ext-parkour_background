import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import * as cp from 'child_process';

const CONFIG_KEY = 'backgroundImage.activeTheme';

// True only in the window that ran a toggle/setOpacity command — prevents other
// windows from patching workbench.html and reloading when the global config changes.
let _localConfigChange = false;
const STYLE_ID = 'editor-background-image';
const INJECTION_START = `<style id="${STYLE_ID}">`;
const INJECTION_END = `</style><!-- /${STYLE_ID} -->`;

function getWorkbenchHtmlPath(): string {
    // VS Code 1.70+ uses electron-sandbox; older builds used electron-browser.
    const subPaths = [
        ['out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html'],
        ['out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html'],
    ];

    for (const parts of subPaths) {
        const p = path.join(vscode.env.appRoot, ...parts);
        if (fs.existsSync(p)) {
            return p;
        }
    }

    // In Remote SSH the extension host appRoot is the VS Code Server, not the
    // desktop Electron app. Fall back to known system installation paths.
    const appRoots = [
        '/usr/share/code/resources/app',
        '/usr/lib/code/resources/app',
        '/opt/visual-studio-code/resources/app',
        '/Applications/Visual Studio Code.app/Contents/Resources/app',
        path.join(process.env.HOME || '', 'Applications/Visual Studio Code.app/Contents/Resources/app'),
    ];

    for (const root of appRoots) {
        for (const parts of subPaths) {
            const p = path.join(root, ...parts);
            if (fs.existsSync(p)) {
                return p;
            }
        }
    }

    // Return the modern appRoot-derived path so the caller receives a meaningful error
    return path.join(vscode.env.appRoot, ...subPaths[0]);
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
        `.editor-group-container.active .monaco-editor .overflow-guard { position: relative; }`,
        `.editor-group-container.active .monaco-editor .overflow-guard::before {`,
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
    const productPath = path.resolve(path.dirname(htmlPath), '..', '..', '..', '..', '..', 'product.json');

    try {
        const htmlData = await fs.promises.readFile(htmlPath);
        // VS Code's build toolchain hashes with MD5+base64 — must match exactly.
        const sha256 = crypto.createHash('md5').update(htmlData).digest('base64');
        const productRaw = await fs.promises.readFile(productPath, 'utf8');
        const product = JSON.parse(productRaw);

        if (!product.checksums) { return true; } // no integrity checks in this build

        // Derive the key from the actual path relative to the app's `out/` directory.
        // e.g. out/vs/code/electron-sandbox/workbench/workbench.html → vs/code/electron-sandbox/...
        const appOutDir = path.resolve(path.dirname(htmlPath), '..', '..', '..', '..', '..', 'out');
        const key = path.relative(appOutDir, htmlPath).split(path.sep).join('/');

        if (product.checksums[key] === sha256) { return true; } // already correct

        product.checksums[key] = sha256;
        const newContent = JSON.stringify(product, null, '\t');

        try {
            await fs.promises.writeFile(productPath, newContent, 'utf8');
        } catch (writeErr) {
            if ((writeErr as NodeJS.ErrnoException).code !== 'EACCES' || process.platform !== 'darwin') {
                throw writeErr;
            }
            // macOS: product.json is inside the app bundle and may be owned by root.
            // Use osascript to rewrite it with administrator privileges (shows native password prompt).
            const tmpPath = path.join(os.tmpdir(), `vscode-product-${Date.now()}.json`);
            await fs.promises.writeFile(tmpPath, newContent, 'utf8');
            try {
                cp.execFileSync('osascript', [
                    '-e',
                    `do shell script "cp " & quoted form of "${tmpPath}" & " " & quoted form of "${productPath}" with administrator privileges`,
                ]);
            } finally {
                await fs.promises.unlink(tmpPath).catch(() => {});
            }
        }
        return true;
    } catch {
        return false;
    }
}

async function patchWorkbench(context: vscode.ExtensionContext, theme: 'minecraft' | 'subwaysurfers' | null, silent = false): Promise<void> {
    const htmlPath = getWorkbenchHtmlPath();
    let html: string;

    let originalHtml: string;
    try {
        html = await fs.promises.readFile(htmlPath, 'utf8');
        originalHtml = html;
    } catch {
        if (!silent) {
            vscode.window.showErrorMessage(
                `Parkour Background: Could not read VSCode workbench file. ` +
                `Tried: ${htmlPath} — appRoot: ${vscode.env.appRoot}`
            );
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
    } catch (err: unknown) {
        if (!silent) {
            const code = (err as NodeJS.ErrnoException).code;
            let msg: string;
            if (code === 'EROFS') {
                msg = 'Parkour Background: VS Code is running from a read-only volume (e.g. a DMG). ' +
                    'Drag "Visual Studio Code.app" to your Applications folder and relaunch from there.';
            } else if (code === 'EACCES') {
                msg = 'Parkour Background: Permission denied. Run in Terminal: ' +
                    'sudo chown -R $(whoami) "/Applications/Visual Studio Code.app"';
            } else {
                msg = `Parkour Background: Failed to patch VSCode — ${err}`;
            }
            vscode.window.showErrorMessage(msg);
        }
        return;
    }

    const checksumOk = await updateProductJsonChecksum(htmlPath);
    if (!checksumOk) {
        // Restore the original file so VS Code is never left in a corrupt state.
        await fs.promises.writeFile(htmlPath, originalHtml, 'utf8').catch(() => {});
        if (!silent) {
            vscode.window.showErrorMessage(
                'Parkour Background: Could not update VS Code integrity checksum. ' +
                'Fix write permissions by running in Terminal: ' +
                'sudo chown -R $(whoami) "/Applications/Visual Studio Code.app"'
            );
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

    // Re-apply stored theme on startup (silent — no reload prompt)
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
    // Intentionally empty. The workbench patch persists across reloads by design —
    // the user's preference is stored in settings and re-applied on next activation.
    // The patch is only removed when the user explicitly disables the background image.
}

