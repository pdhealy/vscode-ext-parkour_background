import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import { getWorkbenchHtmlPaths } from '../utils/paths';
import { INJECTION_START, INJECTION_END, buildCss } from '../utils/css';
import { writeFileElevated } from '../utils/fs';

function permissionFixInstructions(): string {
    if (process.platform === 'win32') {
        return 'Ensure your user has write access or authorize the UAC prompt.';
    }
    if (process.platform === 'darwin') {
        return 'Authorize the password prompt or fix VS Code permissions.';
    }
    return 'Authorize the password prompt or ensure write access.';
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

async function updateProductJsonChecksum(htmlPath: string): Promise<boolean> {
    const productPath = path.resolve(path.dirname(htmlPath), '..', '..', '..', '..', '..', 'product.json');

    try {
        const htmlData = await fs.promises.readFile(htmlPath);
        const checksum = crypto.createHash('md5').update(htmlData).digest('base64');
        const product = JSON.parse(await fs.promises.readFile(productPath, 'utf8'));

        if (!product.checksums) { return true; }

        const appOutDir = path.resolve(path.dirname(htmlPath), '..', '..', '..', '..', '..', 'out');
        const key = path.relative(appOutDir, htmlPath).split(path.sep).join('/');

        if (product.checksums[key] === checksum) { return true; }

        product.checksums[key] = checksum;
        const newContent = JSON.stringify(product, null, '\t');

        await writeFileElevated(productPath, newContent);
        return true;
    } catch {
        return false;
    }
}

const LOCK_FILE = path.join(os.tmpdir(), 'vscode-parkour-background.lock');

async function acquireLock(timeoutMs = 5000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const fd = await fs.promises.open(LOCK_FILE, 'wx');
            await fd.close();
            return true;
        } catch (err: any) {
            if (err.code !== 'EEXIST') {
                return false;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    return false;
}

async function releaseLock(): Promise<void> {
    try {
        await fs.promises.unlink(LOCK_FILE);
    } catch {
        // Ignore
    }
}

export async function patchWorkbench(context: vscode.ExtensionContext, theme: 'minecraft' | 'subwaysurfers' | null, silent = false): Promise<void> {
    if (!(await acquireLock())) {
        if (!silent) {
            vscode.window.showErrorMessage('Parkour Background: Could not acquire lock to patch workbench. Try again.');
        }
        return;
    }

    try {
        await _patchWorkbenchInternal(context, theme, silent);
    } finally {
        await releaseLock();
    }
}

async function _patchWorkbenchInternal(context: vscode.ExtensionContext, theme: 'minecraft' | 'subwaysurfers' | null, silent = false): Promise<void> {
    const paths = getWorkbenchHtmlPaths(vscode.env.appRoot);
    if (paths.length === 0) {
        if (!silent) {
            vscode.window.showErrorMessage('Parkour Background: Could not locate VS Code workbench file.');
        }
        return;
    }
    const htmlPath = paths[0];
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
        if (alreadyInjected && silent) { return; }

        const folderPath = path.join(context.extensionPath, 'assets', theme === 'minecraft' ? 'minecraft' : 'subwaysurfers');
        const imagePath = await getRandomWebpFromFolder(folderPath);

        if (!imagePath) {
            if (!silent) {
                const label = theme === 'minecraft' ? 'Minecraft' : 'Subway Surfers';
                vscode.window.showErrorMessage(`Parkour Background: No images found for the ${label} theme.`);
            }
            return;
        }

        const opacity = context.globalState.get<number>('backgroundImage.opacity', 0.15);
        const css = await buildCss(imagePath, Math.min(0.25, Math.max(0.05, opacity)));
        html = html.replace('</head>', `${css}\n\t</head>`);
    } else {
        if (!alreadyInjected) { return; }
    }

    try {
        await writeFileElevated(htmlPath, html);
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
        try {
            await writeFileElevated(htmlPath, originalHtml);
        } catch (rollbackErr) {
            console.error('Parkour Background: Failed to rollback workbench.html after checksum update failure.', rollbackErr);
            if (!silent) {
                vscode.window.showErrorMessage('Parkour Background: Critical error. Rollback failed. Your VS Code installation might be corrupt.');
            }
        }
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