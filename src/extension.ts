import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import * as cp from 'child_process';

const CONFIG_KEY = 'backgroundImage.activeTheme';
const STYLE_ID = 'editor-background-image';
const INJECTION_START = `<style id="${STYLE_ID}">`;
const INJECTION_END = `</style><!-- /${STYLE_ID} -->`;

// True only in the window that ran a toggle command — prevents other windows
// from patching workbench.html and reloading when the global config changes.
let _localConfigChange = false;

function getWorkbenchHtmlPath(): string {
    // VS Code 1.70+ uses electron-sandbox; older builds used electron-browser.
    const subPaths = [
        ['out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html'],
        ['out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html'],
    ];

    for (const parts of subPaths) {
        const p = path.join(vscode.env.appRoot, ...parts);
        if (fs.existsSync(p)) { return p; }
    }

    // When running in a remote context, appRoot points to VS Code Server.
    // Fall back to known local installation paths per platform.
    const appRoots: string[] = [
        // Linux
        '/usr/share/code/resources/app',
        '/usr/lib/code/resources/app',
        '/opt/visual-studio-code/resources/app',
        // macOS
        '/Applications/Visual Studio Code.app/Contents/Resources/app',
        path.join(process.env.HOME ?? '', 'Applications', 'Visual Studio Code.app', 'Contents', 'Resources', 'app'),
        // Windows
        path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Microsoft VS Code', 'resources', 'app'),
        path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Microsoft VS Code', 'resources', 'app'),
        path.join(process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)', 'Microsoft VS Code', 'resources', 'app'),
    ];

    for (const root of appRoots) {
        for (const parts of subPaths) {
            const p = path.join(root, ...parts);
            if (fs.existsSync(p)) { return p; }
        }
    }

    return path.join(vscode.env.appRoot, ...subPaths[0]);
}

function permissionFixInstructions(): string {
    if (process.platform === 'win32') {
        return 'Close VS Code and relaunch as Administrator (right-click the shortcut → "Run as administrator").';
    }
    if (process.platform === 'darwin') {
        return 'Run in Terminal: sudo chown -R $(whoami) "/Applications/Visual Studio Code.app"';
    }
    return 'Run in Terminal: sudo chown -R $(whoami) /usr/share/code (adjust path to match your installation).';
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
    // product.json is at the app root, 5 directory levels above workbench.html.
    const productPath = path.resolve(path.dirname(htmlPath), '..', '..', '..', '..', '..', 'product.json');

    try {
        const htmlData = await fs.promises.readFile(htmlPath);
        // VS Code's build toolchain hashes files with MD5+base64.
        const checksum = crypto.createHash('md5').update(htmlData).digest('base64');
        const product = JSON.parse(await fs.promises.readFile(productPath, 'utf8'));

        if (!product.checksums) { return true; }

        // Key is the file path relative to the app's out/ directory.
        const appOutDir = path.resolve(path.dirname(htmlPath), '..', '..', '..', '..', '..', 'out');
        const key = path.relative(appOutDir, htmlPath).split(path.sep).join('/');

        if (product.checksums[key] === checksum) { return true; }

        product.checksums[key] = checksum;
        const newContent = JSON.stringify(product, null, '\t');

        try {
            await fs.promises.writeFile(productPath, newContent, 'utf8');
        } catch (writeErr) {
            if ((writeErr as NodeJS.ErrnoException).code !== 'EACCES' || process.platform !== 'darwin') {
                throw writeErr;
            }
            // macOS: product.json inside the app bundle may be root-owned.
            // Prompt for administrator credentials via the native macOS dialog.
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
        originalHtml = html = await fs.promises.readFile(htmlPath, 'utf8');
    } catch {
        if (!silent) {
            vscode.window.showErrorMessage(
                `Parkour Background: Could not read VS Code workbench file. ` +
                `Tried: ${htmlPath} — appRoot: ${vscode.env.appRoot}`
            );
        }
        return;
    }

    const startIdx = html.indexOf(INJECTION_START);
    const endIdx = html.indexOf(INJECTION_END);
    const alreadyInjected = startIdx !== -1 && endIdx !== -1;
    if (alreadyInjected) {
        html = html.slice(0, startIdx).trimEnd() + '\n\t' + html.slice(endIdx + INJECTION_END.length).trimStart();
    }

    if (theme !== null) {
        // Skip re-injection on startup if the injection is already present.
        if (alreadyInjected && silent) { return; }

        const folderPath = path.join(context.extensionPath, 'assets', theme === 'minecraft' ? 'minecraft' : 'subwaysurfers');
        const imagePath = getRandomWebpFromFolder(folderPath);

        if (!imagePath) {
            if (!silent) {
                const label = theme === 'minecraft' ? 'Minecraft' : 'Subway Surfers';
                vscode.window.showErrorMessage(`Parkour Background: No images found for the ${label} theme.`);
            }
            return;
        }

        const opacity = context.globalState.get<number>('backgroundImage.opacity', 0.15);
        html = html.replace('</head>', `${buildCss(imagePath, Math.min(0.25, Math.max(0.05, opacity)))}\n\t</head>`);
    } else {
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
            } else if (code === 'EACCES' || code === 'EPERM') {
                msg = `Parkour Background: Permission denied — ${permissionFixInstructions()}`;
            } else {
                msg = `Parkour Background: Failed to write VS Code workbench file — ${err}`;
            }
            vscode.window.showErrorMessage(msg);
        }
        return;
    }

    const checksumOk = await updateProductJsonChecksum(htmlPath);
    if (!checksumOk) {
        // Restore the original to prevent VS Code being left in a corrupt state.
        await fs.promises.writeFile(htmlPath, originalHtml, 'utf8').catch(() => {});
        if (!silent) {
            vscode.window.showErrorMessage(
                `Parkour Background: Could not update VS Code integrity checksum — ${permissionFixInstructions()}`
            );
        }
        return;
    }

    if (!silent) {
        const state = theme !== null ? 'enabled' : 'disabled';
        vscode.window.showInformationMessage(`Parkour Background ${state}. Reloading VS Code...`);
        setTimeout(() => vscode.commands.executeCommand('workbench.action.reloadWindow'), 1000);
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

