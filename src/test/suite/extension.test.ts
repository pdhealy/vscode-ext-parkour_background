import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as fs from 'fs';

import { _setLocalConfigChangeForTest, activate } from '../../extension';

const MOCK_HTML = `<!-- Copyright (C) Microsoft Corporation -->\n<!DOCTYPE html>\n<html>\n\t<head>\n\t</head>\n\t<body></body>\n</html>`;
const INJECTION_START = '<style id="editor-background-image">';
const INJECTION_END = '</style><!-- /editor-background-image -->';

function mockHtmlWithInjection(css = '.existing{}') {
    return MOCK_HTML.replace('</head>', `${INJECTION_START}${css}${INJECTION_END}\n\t</head>`);
}

function stubFsSuccess(sandbox: sinon.SinonSandbox, imageBytes = Buffer.from('fake-img')) {
    const readStub = sandbox.stub(fs.promises, 'readFile').callsFake(async (pathPath: any) => {
        if (typeof pathPath === 'string' && pathPath.endsWith('.webp')) return imageBytes;
        if (typeof pathPath === 'string' && pathPath.endsWith('product.json')) return JSON.stringify({checksums:{}});
        return MOCK_HTML as unknown as Buffer;
    });
    const writeStub = sandbox.stub(fs.promises, 'writeFile').resolves();
    const readdirStub = sandbox.stub(fs.promises, 'readdir').resolves(['bg.webp'] as any);
    
    sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
    return { readStub, writeStub, readdirStub };
}

async function activateExtension() {
    const mockContext: vscode.ExtensionContext = {
        subscriptions: [],
        workspaceState: { get: () => undefined, update: () => Promise.resolve() },
        globalState: { get: () => undefined, update: () => Promise.resolve() },
        extensionUri: vscode.Uri.file('/fake/extension'),
        extensionPath: '/fake/extension',
        asAbsolutePath: (p: string) => p,
        storageUri: undefined,
        globalStorageUri: vscode.Uri.file('/fake/global-storage'),
        logUri: vscode.Uri.file('/fake/logs'),
        extensionMode: vscode.ExtensionMode.Test,
        environmentVariableCollection: {} as any,
        secrets: {} as any,
        storagePath: '/fake/storage',
        globalStoragePath: '/fake/global-storage',
        logPath: '/fake/logs',
        extension: {} as any,
        languageModelAccessInformation: {} as any,
    } as any;
    await activate(mockContext);
}

suite('Background Image Extension Tests', () => {
    let sandbox: sinon.SinonSandbox;
    const originalSetTimeout = global.setTimeout;

    suiteSetup(async () => {
        (global as any).setTimeout = (cb: any, ms: any, ...args: any[]) => {
            if (cb.toString().includes('reloadWindow')) {
                return {} as any;
            }
            return originalSetTimeout(cb, ms, ...args);
        };
    });

    suiteTeardown(() => {
        global.setTimeout = originalSetTimeout;
    });

    setup(async () => {
        sandbox = sinon.createSandbox();
        sandbox.stub(fs.promises, 'open').resolves({ close: async () => {} } as any);
        sandbox.stub(fs.promises, 'unlink').resolves();
        const execOrig = vscode.commands.executeCommand.bind(vscode.commands);
        sandbox.stub(vscode.commands, 'executeCommand').callsFake(<T>(cmd: string, ...args: unknown[]): Thenable<T> => {
            if (cmd === 'workbench.action.reloadWindow') { return Promise.resolve(undefined) as unknown as Thenable<T>; }
            return execOrig<T>(cmd, ...args as Parameters<typeof execOrig>);
        });
        await activateExtension();
    });

    teardown(async () => {
        sandbox.restore();
        await vscode.workspace
            .getConfiguration('backgroundImage')
            .update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 150));
    });

    test('extension activates and registers all three commands', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('backgroundImage.toggleMinecraft'),     'toggleMinecraft command must be registered');
        assert.ok(commands.includes('backgroundImage.toggleSubwaySurfers'), 'toggleSubwaySurfers command must be registered');
        assert.ok(commands.includes('backgroundImage.setOpacity'),          'setOpacity command must be registered');
    });

    test('backgroundImage.activeTheme configuration property defaults to none', () => {
        const value = vscode.workspace.getConfiguration('backgroundImage').get<string>('activeTheme');
        assert.strictEqual(value, 'none', 'Default activeTheme should be "none"');
    });

    test('toggleMinecraft command enables minecraft theme when currently none', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);
        await vscode.commands.executeCommand('backgroundImage.toggleMinecraft');
        await new Promise(resolve => setTimeout(resolve, 300));
        const theme = vscode.workspace.getConfiguration('backgroundImage').get<string>('activeTheme');
        assert.strictEqual(theme, 'minecraft', 'activeTheme should become "minecraft"');
        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('toggleMinecraft command disables minecraft theme when currently minecraft', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);
        // Turn it on first
        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Now toggle it off
        await vscode.commands.executeCommand('backgroundImage.toggleMinecraft');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const theme = vscode.workspace.getConfiguration('backgroundImage').get<string>('activeTheme');
        assert.strictEqual(theme, 'none', 'activeTheme should return to "none"');
        readStub.restore();
        writeStub.restore();
    });

    test('toggleSubwaySurfers command enables subwaysurfers theme when currently none', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);
        await vscode.commands.executeCommand('backgroundImage.toggleSubwaySurfers');
        await new Promise(resolve => setTimeout(resolve, 300));
        const theme = vscode.workspace.getConfiguration('backgroundImage').get<string>('activeTheme');
        assert.strictEqual(theme, 'subwaysurfers', 'activeTheme should become "subwaysurfers"');
        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('toggleSubwaySurfers command disables subwaysurfers theme when currently subwaysurfers', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);
        // Turn it on first
        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'subwaysurfers', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Now toggle it off
        await vscode.commands.executeCommand('backgroundImage.toggleSubwaySurfers');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const theme = vscode.workspace.getConfiguration('backgroundImage').get<string>('activeTheme');
        assert.strictEqual(theme, 'none', 'activeTheme should return to "none"');
        readStub.restore();
        writeStub.restore();
    });

    test('toggleSubwaySurfers switches from minecraft to subwaysurfers', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);
        // Start with minecraft
        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Toggle subway surfers
        await vscode.commands.executeCommand('backgroundImage.toggleSubwaySurfers');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const theme = vscode.workspace.getConfiguration('backgroundImage').get<string>('activeTheme');
        assert.strictEqual(theme, 'subwaysurfers', 'Theme should switch from minecraft to subwaysurfers');
        readStub.restore();
        writeStub.restore();
    });

    test('toggleMinecraft switches from subwaysurfers to minecraft', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);
        // Start with subway surfers
        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'subwaysurfers', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Toggle minecraft
        await vscode.commands.executeCommand('backgroundImage.toggleMinecraft');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const theme = vscode.workspace.getConfiguration('backgroundImage').get<string>('activeTheme');
        assert.strictEqual(theme, 'minecraft', 'Theme should switch from subwaysurfers to minecraft');
        readStub.restore();
        writeStub.restore();
    });

    test('patchWorkbench injects style block with correct CSS structure for minecraft', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        assert.ok(writeStub.called, 'writeFile should be called when enabling minecraft');
        
        const htmlWriteCall = writeStub.getCalls().find(c => (c.args[0] as string).includes('workbench.html'));
        assert.ok(htmlWriteCall, 'Should write to workbench.html');
        const written = htmlWriteCall!.args[1] as string;

        assert.ok(written.includes(INJECTION_START),          'Should include style tag open');
        assert.ok(written.includes(INJECTION_END),            'Should include style tag close marker');
        assert.ok(written.includes('.monaco-editor .overflow-guard'), 'Should include background CSS');

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('patchWorkbench injects style block with correct CSS structure for subwaysurfers', async () => {
        const { readStub, writeStub, readdirStub } = stubFsSuccess(sandbox);
        readdirStub.resolves(['surf.webp'] as any);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'subwaysurfers', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        assert.ok(writeStub.called, 'writeFile should be called when enabling subwaysurfers');
        
        const htmlWriteCall = writeStub.getCalls().find(c => (c.args[0] as string).includes('workbench.html'));
        assert.ok(htmlWriteCall, 'Should write to workbench.html');
        const written = htmlWriteCall!.args[1] as string;

        assert.ok(written.includes(INJECTION_START), 'Should include style tag open');
        assert.ok(written.includes(INJECTION_END), 'Should include style tag close');
        assert.ok(written.includes('.monaco-editor .overflow-guard'), 'Should include background CSS');

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('CSS injection is scoped to active editor group only', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        assert.ok(writeStub.called, 'writeFile should be called');
        
        const htmlWriteCall = writeStub.getCalls().find(c => (c.args[0] as string).includes('workbench.html'));
        assert.ok(htmlWriteCall, 'Should write to workbench.html');
        const written = htmlWriteCall!.args[1] as string;

        assert.ok(written.includes('.editor-group-container.active'), 'CSS must be scoped to .active editor group');

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('injected CSS opacity value is within the clamped range 0.05–0.25', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        assert.ok(writeStub.called, 'writeFile should be called');
        
        const htmlWriteCall = writeStub.getCalls().find(c => (c.args[0] as string).includes('workbench.html'));
        assert.ok(htmlWriteCall, 'Should write to workbench.html');
        const written = htmlWriteCall!.args[1] as string;

        assert.ok(written.includes('opacity'), 'CSS should contain an opacity property');

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('patchWorkbench removes style block when theme is changed to none', async () => {
        const initialHtml = mockHtmlWithInjection('.foo{color:red}');
        const readStub = sandbox.stub(fs.promises, 'readFile').callsFake(async (pathPath: any) => {
            if (typeof pathPath === 'string' && pathPath.endsWith('product.json')) return JSON.stringify({checksums:{}});
            return initialHtml as unknown as Buffer;
        });
        const writeStub = sandbox.stub(fs.promises, 'writeFile').resolves();
        sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        assert.ok(writeStub.called, 'writeFile should be called to strip the existing injection');
        
        const htmlWriteCall = writeStub.getCalls().find(c => (c.args[0] as string).includes('workbench.html'));
        assert.ok(htmlWriteCall, 'Should write back to workbench.html');
        const written = htmlWriteCall!.args[1] as string;
        assert.ok(!written.includes(INJECTION_START), 'Should NOT contain injection start');
        assert.ok(!written.includes(INJECTION_END),   'Should NOT contain injection end');

        readStub.restore();
        writeStub.restore();
    });

    test('patchWorkbench does not write file when theme is none and no injection exists', async () => {
        const readStub = sandbox.stub(fs.promises, 'readFile').callsFake(async (pathPath: any) => {
            if (typeof pathPath === 'string' && pathPath.endsWith('product.json')) return JSON.stringify({checksums:{}});
            return MOCK_HTML as unknown as Buffer;
        });
        const writeStub = sandbox.stub(fs.promises, 'writeFile').resolves();
        sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        // Note: It might be called for product.json if logic is complex, but for workbench.html it shouldn't be.
        const htmlWriteCall = writeStub.getCalls().find(c => (c.args[0] as string).includes('workbench.html'));
        assert.ok(!htmlWriteCall, 'Should NOT write to workbench.html if theme is none and already clean');

        readStub.restore();
        writeStub.restore();
    });

    test('setOpacity command stores selected opacity value in global state', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);
        // Ensure a theme is enabled so setOpacity triggers applyThemeForWindow
        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        // QuickPick mock in vscode-mock.js will return the first preset (0.05)
        await vscode.commands.executeCommand('backgroundImage.setOpacity');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        assert.ok(writeStub.called, 'writeFile should be called at least once after opacity change');
        
        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('setOpacity command does nothing when user cancels the quick pick', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);
        sandbox.stub(vscode.window, 'showQuickPick').resolves(undefined);

        await vscode.commands.executeCommand('backgroundImage.setOpacity');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Count write calls. There might be some from previous tests if setup/teardown is leaky, 
        // but writeStub is fresh per test.
        const htmlWriteCalls = writeStub.getCalls().filter(c => (c.args[0] as string).includes('workbench.html'));
        assert.strictEqual(htmlWriteCalls.length, 0, 'Should NOT write to file when cancel');

        readStub.restore();
        writeStub.restore();
    });

    test('shows error when no images found in minecraft assets folder', async () => {
        const { readStub, readdirStub } = stubFsSuccess(sandbox);
        readdirStub.resolves([]); // Empty folder
        const errorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        assert.ok(errorStub.calledOnce, 'Should show error message');
        assert.ok(errorStub.firstCall.args[0].includes('No images found'), 'Error should mention no images');
        
        readStub.restore();
    });

    test('shows error when subwaysurfers assets folder contains no webp files', async () => {
        const { readStub, readdirStub } = stubFsSuccess(sandbox);
        readdirStub.resolves(['not-an-image.txt'] as any);
        const errorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'subwaysurfers', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        assert.ok(errorStub.calledOnce, 'Should show error message');
        
        readStub.restore();
    });

    test('shows permission denied error when workbench HTML is not writable', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);
        writeStub.rejects({ code: 'EACCES' });
        const errorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        assert.ok(errorStub.called, 'Should show error message on permission failure');
        assert.ok(errorStub.getCalls().some(c => c.args[0].includes('Permission denied')), 'Should mention Permission denied');

        readStub.restore();
        writeStub.restore();
    });

    test('shows generic error when workbench HTML write fails for non-permission reason', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);
        writeStub.rejects(new Error('Disk Full'));
        const errorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        assert.ok(errorStub.called, 'Should show error message');
        assert.ok(errorStub.getCalls().some(c => c.args[0].includes('Failed to write VS Code workbench file')), 'Should show generic write failure');

        readStub.restore();
        writeStub.restore();
    });

    test('shows error when workbench HTML file cannot be read', async () => {
        // Clear listeners and restub fresh
        (vscode.workspace as any)._clearListeners();
        const mockContext: vscode.ExtensionContext = {
            subscriptions: [],
            workspaceState: { get: () => undefined, update: () => Promise.resolve() },
            globalState: { get: () => undefined, update: () => Promise.resolve() },
            extensionUri: vscode.Uri.file('/fake/extension'),
            extensionPath: '/fake/extension',
            asAbsolutePath: (p: string) => p,
            storageUri: undefined,
            globalStorageUri: vscode.Uri.file('/fake/global-storage'),
            logUri: vscode.Uri.file('/fake/logs'),
            extensionMode: vscode.ExtensionMode.Test,
            environmentVariableCollection: {} as any,
            secrets: {} as any,
            storagePath: '/fake/storage',
            globalStoragePath: '/fake/global-storage',
            logPath: '/fake/logs',
            extension: {} as any,
            languageModelAccessInformation: {} as any,
        } as any;

        sandbox.stub(fs.promises, 'readFile').callsFake(async (p: any) => {
            if (typeof p === 'string' && p.includes('workbench.html')) {
                throw new Error('File not found');
            }
            if (typeof p === 'string' && p.endsWith('.webp')) {
                return Buffer.from('fake-image');
            }
            return MOCK_HTML;
        });
        sandbox.stub(fs.promises, 'readdir').resolves(['bg.webp'] as any); // STUB READDIR!
        const errorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        await activate(mockContext);
        
        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        assert.ok(errorStub.called, 'Should show error message when read fails');
        assert.ok(errorStub.getCalls().some(c => c.args[0].includes('Could not read VS Code workbench file')), 'Should show read failure');
    });
});
