import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const CONFIG_KEY = 'backgroundImage.enabled';
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

function buildCss(imagePath: string): string {
    const imageData = fs.readFileSync(imagePath);
    const base64 = imageData.toString('base64');
    const dataUri = `data:image/png;base64,${base64}`;
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
        `  opacity: 0.1;`,
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

async function patchWorkbench(context: vscode.ExtensionContext, enable: boolean, silent = false): Promise<void> {
    const htmlPath = getWorkbenchHtmlPath();
    let html: string;

    try {
        html = await fs.promises.readFile(htmlPath, 'utf8');
    } catch {
        if (!silent) {
            vscode.window.showErrorMessage('Background Image: Could not read VSCode workbench file.');
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

    if (enable) {
        const imagePath = path.join(context.extensionPath, 'assets', 'image.png');
        const imageExists = await fs.promises.access(imagePath).then(() => true).catch(() => false);
        if (!imageExists) {
            vscode.window.showErrorMessage('Background Image: Asset not found. Please reinstall the extension.');
            return;
        }
        const injection = buildCss(imagePath);
        // Skip writing if already correctly injected (avoid redundant disk writes on startup)
        if (alreadyInjected && silent) { return; }
        html = html.replace('</head>', `${injection}\n\t</head>`);
    } else {
        // If nothing was injected, nothing to do
        if (!alreadyInjected) { return; }
    }

    try {
        await fs.promises.writeFile(htmlPath, html, 'utf8');
        const checksumUpdated = await updateProductJsonChecksum(htmlPath);
        if (!checksumUpdated && !silent) {
            // Show how to suppress the "corrupt" warning with a terminal command
            vscode.window.showInformationMessage(
                'Background Image: To suppress the "Installation appears corrupt" warning, run in a terminal:',
                'Copy Command'
            ).then(sel => {
                if (sel === 'Copy Command') {
                    vscode.env.clipboard.writeText(
                        `sudo python3 -c "import hashlib,base64,json; ` +
                        `h=open('${htmlPath}','rb').read(); ` +
                        `sha=base64.b64encode(hashlib.sha256(h).digest()).decode(); ` +
                        `p=json.load(open('${path.resolve(path.dirname(htmlPath), '..', '..', '..', '..', '..', 'product.json')}')); ` +
                        `p['checksums']['vs/code/electron-browser/workbench/workbench.html']=sha; ` +
                        `json.dump(p,open('${path.resolve(path.dirname(htmlPath), '..', '..', '..', '..', '..', 'product.json')}','w'),indent=chr(9))"`
                    );
                }
            });
        }
    } catch (err: unknown) {
        if (!silent) {
            const msg = (err as NodeJS.ErrnoException).code === 'EACCES'
                ? 'Background Image: Permission denied writing to VSCode. Try running VSCode as administrator.'
                : `Background Image: Failed to patch VSCode — ${err}`;
            vscode.window.showErrorMessage(msg);
        }
        return;
    }

    if (!silent) {
        const state = enable ? 'enabled' : 'disabled';
        vscode.window.showInformationMessage(
            `Background image ${state}. VSCode may show an "installation appears corrupt" warning — this is expected and safe to dismiss.`,
            'Reload Now'
        ).then(selection => {
            if (selection === 'Reload Now') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        });
    }
}

function updateMenuContext(enabled: boolean): void {
    vscode.commands.executeCommand('setContext', 'backgroundImage.enabled', enabled);
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    _context = context;
    console.log(`[Background Image] appRoot: ${vscode.env.appRoot}`);
    console.log(`[Background Image] workbench path: ${getWorkbenchHtmlPath()}`);
    const disposable = vscode.commands.registerCommand('backgroundImage.toggle', async () => {
        const config = vscode.workspace.getConfiguration('backgroundImage');
        const current = config.get<boolean>('enabled', false);
        await config.update('enabled', !current, vscode.ConfigurationTarget.Global);
    });
    context.subscriptions.push(disposable);

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration(CONFIG_KEY)) {
            const config = vscode.workspace.getConfiguration('backgroundImage');
            const enabled = config.get<boolean>('enabled', false);
            updateMenuContext(enabled);
            await patchWorkbench(context, enabled);
        }
    }));

    // Apply stored state on startup
    const config = vscode.workspace.getConfiguration('backgroundImage');
    const initialEnabled = config.get<boolean>('enabled', false);
    updateMenuContext(initialEnabled);
    // Sync workbench patch with stored setting on every startup (silent — no reload prompt)
    await patchWorkbench(context, initialEnabled, true);
}

export function deactivate(): void {
    // Intentionally empty. The workbench patch persists across reloads by design —
    // the user's preference is stored in settings and re-applied on next activation.
    // The patch is only removed when the user explicitly disables the background image.
}

