import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import { getWorkbenchHtmlPaths, getProductJsonPath, getAppOutDir } from '../utils/paths';
import { INJECTION_START, INJECTION_END } from '../utils/css';
import { writeFileElevated } from '../utils/fs';
import { removeInjection, injectCss } from '../utils/patcherUtils';

function permissionFixInstructions(): string {
    if (process.platform === 'win32') {
        return 'Ensure your user has write access or authorize the UAC prompt.';
    }
    if (process.platform === 'darwin') {
        return 'Authorize the password prompt or fix VS Code permissions.';
    }
    return 'Authorize the password prompt or ensure write access.';
}

async function updateProductJsonChecksum(htmlPath: string): Promise<boolean> {
    const appRoot = vscode.env.appRoot;
    const productPath = getProductJsonPath(appRoot);

    try {
        const htmlData = await fs.promises.readFile(htmlPath);
        const checksum = crypto.createHash('md5').update(htmlData).digest('base64');
        const product = JSON.parse(await fs.promises.readFile(productPath, 'utf8'));

        if (!product.checksums) { return true; }

        const appOutDir = getAppOutDir(appRoot);
        const key = path.relative(appOutDir, htmlPath).split(path.sep).join('/');

        if (product.checksums[key] === checksum) { return true; }

        product.checksums[key] = checksum;
        const newContent = JSON.stringify(product, null, '\t');

        await writeFileElevated(productPath, newContent);
        return true;
    } catch (err) {
        console.error('Parkour Background: Failed to update product.json checksum.', err);
        return false;
    }
}

const LOCK_FILE = path.join(os.tmpdir(), 'vscode-parkour-background.lock');
const LOCK_TIMEOUT_MS = 10000; // 10 seconds

async function acquireLock(timeoutMs = 5000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            // Check if lock file is stale
            try {
                const stats = await fs.promises.stat(LOCK_FILE);
                if (Date.now() - stats.mtimeMs > LOCK_TIMEOUT_MS) {
                    await fs.promises.unlink(LOCK_FILE);
                }
            } catch (err: any) {
                if (err.code !== 'ENOENT') { throw err; }
            }

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

export async function patchWorkbench(context: vscode.ExtensionContext, css: string | null, silent = false): Promise<void> {
    if (!(await acquireLock())) {
        if (!silent) {
            vscode.window.showErrorMessage('Parkour Background: Could not acquire lock to patch workbench. Try again.');
        }
        return;
    }

    try {
        await _patchWorkbenchInternal(context, css, silent);
    } finally {
        await releaseLock();
    }
}

async function _patchWorkbenchInternal(context: vscode.ExtensionContext, css: string | null, silent = false): Promise<void> {
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

    const alreadyInjected = html.indexOf(INJECTION_START) !== -1 && html.indexOf(INJECTION_END) !== -1;
    
    let newHtml: string;
    if (css !== null) {
        if (alreadyInjected && silent) { return; }
        newHtml = injectCss(html, css);
    } else {
        if (!alreadyInjected) { return; }
        newHtml = removeInjection(html);
    }

    try {
        await writeFileElevated(htmlPath, newHtml);
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
        const state = css !== null ? 'enabled' : 'disabled';
        vscode.window.showInformationMessage(`Parkour Background ${state}. Reloading VS Code...`);
        setTimeout(() => vscode.commands.executeCommand('workbench.action.reloadWindow'), 1000);
    }
}
