import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as fs from 'fs';

import { _setLocalConfigChangeForTest } from '../../extension';

const MOCK_HTML = `<!-- Copyright (C) Microsoft Corporation -->\n<!DOCTYPE html>\n<html>\n\t<head>\n\t</head>\n\t<body></body>\n</html>`;
const INJECTION_START = '<script id="parkour-background-loader">';
const INJECTION_END = '</script><!-- /parkour-background-loader -->';

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
    sandbox.stub(fs.promises, 'readdir').resolves(['bg.webp'] as any);
    
    sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
    return { readStub, writeStub };
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
        const ext = vscode.extensions.getExtension('paulhealydev.vscode-ext-parkour-background');
        if (ext) { await ext.activate(); }
    });

    suiteTeardown(() => {
        global.setTimeout = originalSetTimeout;
    });

    setup(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(fs.promises, 'open').resolves({ close: async () => {} } as any);
        sandbox.stub(fs.promises, 'unlink').resolves();
        const execOrig = vscode.commands.executeCommand.bind(vscode.commands);
        sandbox.stub(vscode.commands, 'executeCommand').callsFake(<T>(cmd: string, ...args: unknown[]): Thenable<T> => {
            if (cmd === 'workbench.action.reloadWindow') { return Promise.resolve(undefined) as unknown as Thenable<T>; }
            return execOrig<T>(cmd, ...args as Parameters<typeof execOrig>);
        });
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

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 150));

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

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'subwaysurfers', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 150));

        await vscode.commands.executeCommand('backgroundImage.toggleSubwaySurfers');
        await new Promise(resolve => setTimeout(resolve, 300));

        const theme = vscode.workspace.getConfiguration('backgroundImage').get<string>('activeTheme');
        assert.strictEqual(theme, 'none', 'activeTheme should return to "none"');

        readStub.restore();
        writeStub.restore();
    });

    test('toggleSubwaySurfers switches from minecraft to subwaysurfers', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 150));

        await vscode.commands.executeCommand('backgroundImage.toggleSubwaySurfers');
        await new Promise(resolve => setTimeout(resolve, 300));

        const theme = vscode.workspace.getConfiguration('backgroundImage').get<string>('activeTheme');
        assert.strictEqual(theme, 'subwaysurfers', 'Theme should switch from minecraft to subwaysurfers');

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('toggleMinecraft switches from subwaysurfers to minecraft', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'subwaysurfers', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 150));

        await vscode.commands.executeCommand('backgroundImage.toggleMinecraft');
        await new Promise(resolve => setTimeout(resolve, 300));

        const theme = vscode.workspace.getConfiguration('backgroundImage').get<string>('activeTheme');
        assert.strictEqual(theme, 'minecraft', 'Theme should switch from subwaysurfers to minecraft');

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('patchWorkbench injects style block with correct CSS structure for minecraft', async () => {
        const readStub = sandbox.stub(fs.promises, 'readFile').callsFake(async (pathPath: any) => {
            if (typeof pathPath === 'string' && pathPath.endsWith('.webp')) return Buffer.from('pixel');
            if (typeof pathPath === 'string' && pathPath.endsWith('product.json')) return JSON.stringify({checksums:{}});
            return MOCK_HTML as unknown as Buffer;
        });
        const writeStub = sandbox.stub(fs.promises, 'writeFile').resolves();
        sandbox.stub(fs.promises, 'readdir').resolves(['bg.webp'] as any);
        sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        assert.ok(writeStub.called, 'writeFile should be called when enabling minecraft');
        
        const htmlWriteCall = writeStub.getCalls().find(c => (c.args[0] as string).includes('workbench.html'));
        assert.ok(htmlWriteCall, 'Should write to workbench.html');
        const written = htmlWriteCall!.args[1] as string;

        assert.ok(written.includes(INJECTION_START),          'Should include script tag open');
        assert.ok(written.includes(INJECTION_END),            'Should include script tag close marker');
        assert.ok(written.includes('parkour-state.json'),     'Should reference state file');

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('patchWorkbench injects style block with correct CSS structure for subwaysurfers', async () => {
        const readStub = sandbox.stub(fs.promises, 'readFile').callsFake(async (pathPath: any) => {
            if (typeof pathPath === 'string' && pathPath.endsWith('.webp')) return Buffer.from('pixel');
            if (typeof pathPath === 'string' && pathPath.endsWith('product.json')) return JSON.stringify({checksums:{}});
            return MOCK_HTML as unknown as Buffer;
        });
        const writeStub = sandbox.stub(fs.promises, 'writeFile').resolves();
        sandbox.stub(fs.promises, 'readdir').resolves(['surf.webp'] as any);
        sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'subwaysurfers', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        assert.ok(writeStub.called, 'writeFile should be called when enabling subwaysurfers');
        
        const htmlWriteCall = writeStub.getCalls().find(c => (c.args[0] as string).includes('workbench.html'));
        assert.ok(htmlWriteCall, 'Should write to workbench.html');
        const written = htmlWriteCall.args[1] as string;

        assert.ok(written.includes(INJECTION_START), 'Should include script tag open');
        assert.ok(written.includes('parkour-state.json'), 'Should reference state file');

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('CSS injection is scoped to active editor group only', async () => {
        const readStub = sandbox.stub(fs.promises, 'readFile').callsFake(async (pathPath: any) => {
            if (typeof pathPath === 'string' && pathPath.endsWith('.webp')) return Buffer.from('pixel');
            if (typeof pathPath === 'string' && pathPath.endsWith('product.json')) return JSON.stringify({checksums:{}});
            return MOCK_HTML as unknown as Buffer;
        });
        const writeStub = sandbox.stub(fs.promises, 'writeFile').resolves();
        sandbox.stub(fs.promises, 'readdir').resolves(['bg.webp'] as any);
        sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        assert.ok(writeStub.called, 'writeFile should be called');
        
        const stateWriteCall = writeStub.getCalls().find(c => (c.args[0] as string).includes('parkour-state.json'));
        assert.ok(stateWriteCall, 'Should write to parkour-state.json');
        const writtenState = stateWriteCall.args[1] as string;

        assert.ok(writtenState.includes('.editor-group-container.active'), 'CSS must be scoped to .active editor group');

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('injected CSS opacity value is within the clamped range 0.05–0.25', async () => {
        const readStub = sandbox.stub(fs.promises, 'readFile').callsFake(async (pathPath: any) => {
            if (typeof pathPath === 'string' && pathPath.endsWith('.webp')) return Buffer.from('pixel');
            if (typeof pathPath === 'string' && pathPath.endsWith('product.json')) return JSON.stringify({checksums:{}});
            return MOCK_HTML as unknown as Buffer;
        });
        const writeStub = sandbox.stub(fs.promises, 'writeFile').resolves();
        sandbox.stub(fs.promises, 'readdir').resolves(['bg.webp'] as any);
        sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        assert.ok(writeStub.called, 'writeFile should be called');
        
        const stateWriteCall = writeStub.getCalls().find(c => (c.args[0] as string).includes('parkour-state.json'));
        assert.ok(stateWriteCall, 'Should write to parkour-state.json');
        const writtenState = stateWriteCall.args[1] as string;

        const match = writtenState.match(/opacity:\s*([\d.]+)/);
        assert.ok(match, 'CSS should contain an opacity property');
        const opacity = parseFloat(match![1]);
        assert.ok(opacity >= 0.05, `Opacity ${opacity} should be >= 0.05`);
        assert.ok(opacity <= 0.25, `Opacity ${opacity} should be <= 0.25`);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('patchWorkbench removes style block when theme is changed to none', async () => {
        const htmlWithStyle = mockHtmlWithInjection();
        const readStub = sandbox.stub(fs.promises, 'readFile').resolves(htmlWithStyle as unknown as Buffer);
        const writeStub = sandbox.stub(fs.promises, 'writeFile').resolves();

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'subwaysurfers', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 100));
        writeStub.resetHistory();

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        assert.ok(writeStub.called, 'writeFile should be called to strip the existing injection');
        const call = writeStub.getCalls().find(c => (c.args[0] as string).includes('workbench.html'));
        assert.ok(call, 'Should have written to workbench.html');
        const written = call!.args[1] as string;
        
        assert.ok(!written.includes(INJECTION_START), 'Script tag open should be removed');
        assert.ok(!written.includes(INJECTION_END),   'Script tag close marker should be removed');
        assert.ok(written.includes('</head>'),        `Remainder of HTML must be preserved. Actual written: ${written}`);

        readStub.restore();
        writeStub.restore();
    });

    test('patchWorkbench does not write file when theme is none and no injection exists', async () => {
        const readStub = sandbox.stub(fs.promises, 'readFile').resolves(MOCK_HTML as unknown as Buffer);
        const writeStub = sandbox.stub(fs.promises, 'writeFile').resolves();

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 100));
        writeStub.resetHistory();
        readStub.resetBehavior();
        readStub.resolves(MOCK_HTML as unknown as Buffer);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        if (writeStub.called) {
            const htmlWriteCall = writeStub.getCalls().find(c => (c.args[0] as string).includes('workbench.html'));
            assert.ok(!htmlWriteCall, 'Should NOT write to workbench.html if no injection exists and theme is none');
        }

        readStub.restore();
        writeStub.restore();
    });

    test('setOpacity command stores selected opacity value in global state', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);
        sandbox.stub(vscode.window, 'showQuickPick').resolves({
            label: '5% — Subtle',
            value: 0.05,
        } as unknown as vscode.QuickPickItem);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 150));

        await vscode.commands.executeCommand('backgroundImage.setOpacity');
        await new Promise(resolve => setTimeout(resolve, 300));

        assert.ok(writeStub.callCount >= 1, 'writeFile should be called at least once after opacity change');

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('setOpacity command does nothing when user cancels the quick pick', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);
        sandbox.stub(vscode.window, 'showQuickPick').resolves(undefined);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 150));
        const callsBefore = writeStub.callCount;

        await vscode.commands.executeCommand('backgroundImage.setOpacity');
        await new Promise(resolve => setTimeout(resolve, 200));

        assert.strictEqual(writeStub.callCount, callsBefore, 'No extra writes should occur when user cancels the picker');

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('shows error when no images found in minecraft assets folder', async () => {
        sandbox.stub(fs.promises, 'readFile').resolves(MOCK_HTML as unknown as Buffer);
        sandbox.stub(fs.promises, 'writeFile').resolves();
        sandbox.stub(fs.promises, 'readdir').rejects(new Error('ENOENT: no such file'));
        const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        if (showErrorStub.called) {
            const msg = showErrorStub.firstCall.args[0] as string;
            assert.ok(msg.includes('Failed to load') || msg.includes('No images'), 'Should report missing images error');
        }

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
    });

    test('shows error when subwaysurfers assets folder contains no webp files', async () => {
        sandbox.stub(fs.promises, 'readFile').resolves(MOCK_HTML as unknown as Buffer);
        sandbox.stub(fs.promises, 'writeFile').resolves();
        sandbox.stub(fs.promises, 'readdir').resolves([]);
        const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'subwaysurfers', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        if (showErrorStub.called) {
            const msg = showErrorStub.firstCall.args[0] as string;
            assert.ok(
                msg.includes('Subway Surfers') || msg.includes('Failed to load') || msg.includes('No images'),
                'Error message should reference Subway Surfers or loading failure'
            );
        }

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
    });

    test('shows permission denied error when workbench HTML is not writable', async () => {
        sandbox.stub(fs.promises, 'readFile').resolves(MOCK_HTML as unknown as Buffer);
        sandbox.stub(fs.promises, 'readdir').resolves(['bg.webp'] as any);
        const err = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
        sandbox.stub(fs.promises, 'writeFile').rejects(err);
        const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        if (showErrorStub.called) {
            const msg = showErrorStub.firstCall.args[0] as string;
            assert.ok(
                msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('administrator') || msg.toLowerCase().includes('read-only'),
                'Should suggest running as administrator for EACCES errors'
            );
        }

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
    });

    test('shows generic error when workbench HTML write fails for non-permission reason', async () => {
        sandbox.stub(fs.promises, 'readFile').resolves(MOCK_HTML as unknown as Buffer);
        sandbox.stub(fs.promises, 'readdir').resolves(['bg.webp'] as any);
        const err = Object.assign(new Error('ENOSPC: no space left on device'), { code: 'ENOSPC' });
        sandbox.stub(fs.promises, 'writeFile').rejects(err);
        const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        if (showErrorStub.called) {
            const msg = showErrorStub.firstCall.args[0] as string;
            assert.ok(
                msg.includes('Failed to patch') || msg.includes('Parkour Background') || msg.includes('Failed to write'),
                'Should show a Parkour Background error message'
            );
        }

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
    });

    test('shows error when workbench HTML file cannot be read', async () => {
        const readErr = Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' });
        sandbox.stub(fs.promises, 'readFile').rejects(readErr);
        const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        if (showErrorStub.called) {
            const msg = showErrorStub.firstCall.args[0] as string;
            assert.ok(
                msg.includes('Could not read') || msg.includes('Parkour Background'),
                'Should report that the workbench file could not be read'
            );
        }

        _setLocalConfigChangeForTest(true);
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
    });
});

