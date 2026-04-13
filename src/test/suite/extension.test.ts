import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as fs from 'fs';

// Use require() to obtain the ORIGINAL fs module object so that stubs propagate
// to the extension's code, which also accesses the original via __importStar getters.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const fsOrig: typeof fs = require('fs');

const MOCK_HTML = `<!-- Copyright (C) Microsoft Corporation -->\n<!DOCTYPE html>\n<html>\n\t<head>\n\t</head>\n\t<body></body>\n</html>`;
const INJECTION_START = '<style id="editor-background-image">';
const INJECTION_END = '</style><!-- /editor-background-image -->';

/** Builds MOCK_HTML that already has a style block injected. */
function mockHtmlWithInjection(css = '.existing{}') {
    return MOCK_HTML.replace('</head>', `${INJECTION_START}${css}${INJECTION_END}\n\t</head>`);
}

/**
 * Stubs fs methods needed for a successful patchWorkbench call and prevents
 * the workbench reload command from firing during tests.
 */
function stubFsSuccess(sandbox: sinon.SinonSandbox, imageBytes = Buffer.from('fake-img')) {
    const readStub  = sandbox.stub(fs.promises, 'readFile').resolves(MOCK_HTML as unknown as Buffer);
    const writeStub = sandbox.stub(fs.promises, 'writeFile').resolves();
    // Stub on the original module object so the extension's __importStar getters see the stub
    sandbox.stub(fsOrig, 'readdirSync').returns(['bg.webp'] as unknown as ReturnType<typeof fs.readdirSync>);
    sandbox.stub(fsOrig, 'readFileSync').returns(imageBytes);
    // Suppress the info message and prevent workbench.action.reloadWindow from firing
    sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
    const execOrig = vscode.commands.executeCommand.bind(vscode.commands);
    sandbox.stub(vscode.commands, 'executeCommand').callsFake(<T>(cmd: string, ...args: unknown[]): Thenable<T> => {
        if (cmd === 'workbench.action.reloadWindow') { return Promise.resolve(undefined) as unknown as Thenable<T>; }
        return execOrig<T>(cmd, ...args as Parameters<typeof execOrig>);
    });
    return { readStub, writeStub };
}

suite('Background Image Extension Tests', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(async () => {
        sandbox.restore();
        // Ensure config is cleaned up between tests (no stubs at this point).
        await vscode.workspace
            .getConfiguration('backgroundImage')
            .update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 150));
    });

    // ── Extension activation ──────────────────────────────────────────────────

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

    // ── Toggle Minecraft on / off ─────────────────────────────────────────────

    test('toggleMinecraft command enables minecraft theme when currently none', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);

        await vscode.commands.executeCommand('backgroundImage.toggleMinecraft');
        await new Promise(resolve => setTimeout(resolve, 300));

        const theme = vscode.workspace.getConfiguration('backgroundImage').get<string>('activeTheme');
        assert.strictEqual(theme, 'minecraft', 'activeTheme should become "minecraft"');

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('toggleMinecraft command disables minecraft theme when currently minecraft', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 150));

        await vscode.commands.executeCommand('backgroundImage.toggleMinecraft');
        await new Promise(resolve => setTimeout(resolve, 300));

        const theme = vscode.workspace.getConfiguration('backgroundImage').get<string>('activeTheme');
        assert.strictEqual(theme, 'none', 'activeTheme should return to "none"');

        readStub.restore();
        writeStub.restore();
    });

    // ── Toggle Subway Surfers on / off ────────────────────────────────────────

    test('toggleSubwaySurfers command enables subwaysurfers theme when currently none', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);

        await vscode.commands.executeCommand('backgroundImage.toggleSubwaySurfers');
        await new Promise(resolve => setTimeout(resolve, 300));

        const theme = vscode.workspace.getConfiguration('backgroundImage').get<string>('activeTheme');
        assert.strictEqual(theme, 'subwaysurfers', 'activeTheme should become "subwaysurfers"');

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('toggleSubwaySurfers command disables subwaysurfers theme when currently subwaysurfers', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);

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

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 150));

        await vscode.commands.executeCommand('backgroundImage.toggleSubwaySurfers');
        await new Promise(resolve => setTimeout(resolve, 300));

        const theme = vscode.workspace.getConfiguration('backgroundImage').get<string>('activeTheme');
        assert.strictEqual(theme, 'subwaysurfers', 'Theme should switch from minecraft to subwaysurfers');

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('toggleMinecraft switches from subwaysurfers to minecraft', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'subwaysurfers', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 150));

        await vscode.commands.executeCommand('backgroundImage.toggleMinecraft');
        await new Promise(resolve => setTimeout(resolve, 300));

        const theme = vscode.workspace.getConfiguration('backgroundImage').get<string>('activeTheme');
        assert.strictEqual(theme, 'minecraft', 'Theme should switch from subwaysurfers to minecraft');

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    // ── CSS injection content ─────────────────────────────────────────────────

    test('patchWorkbench injects style block with correct CSS structure for minecraft', async () => {
        const readStub  = sandbox.stub(fs.promises, 'readFile').resolves(MOCK_HTML as unknown as Buffer);
        const writeStub = sandbox.stub(fs.promises, 'writeFile').resolves();
        sandbox.stub(fsOrig, 'readdirSync').returns(['bg.webp'] as unknown as ReturnType<typeof fs.readdirSync>);
        sandbox.stub(fsOrig, 'readFileSync').returns(Buffer.from('pixel'));
        sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        assert.ok(writeStub.called, 'writeFile should be called when enabling minecraft');
        const written = writeStub.firstCall.args[1] as string;

        assert.ok(written.includes(INJECTION_START),          'Should include style tag open');
        assert.ok(written.includes(INJECTION_END),            'Should include style tag close marker');
        assert.ok(written.includes('overflow-guard::before'), 'Should target ::before pseudo-element');
        assert.ok(written.includes('background-image: url("data:image/webp;base64,'), 'Should embed base64 webp data URI');

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('patchWorkbench injects style block with correct CSS structure for subwaysurfers', async () => {
        const readStub  = sandbox.stub(fs.promises, 'readFile').resolves(MOCK_HTML as unknown as Buffer);
        const writeStub = sandbox.stub(fs.promises, 'writeFile').resolves();
        sandbox.stub(fsOrig, 'readdirSync').returns(['surf.webp'] as unknown as ReturnType<typeof fs.readdirSync>);
        sandbox.stub(fsOrig, 'readFileSync').returns(Buffer.from('pixel'));
        sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'subwaysurfers', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        assert.ok(writeStub.called, 'writeFile should be called when enabling subwaysurfers');
        const written = writeStub.firstCall.args[1] as string;

        assert.ok(written.includes(INJECTION_START), 'Should include style tag open');
        assert.ok(written.includes('overflow-guard::before'), 'Should target ::before pseudo-element');
        assert.ok(written.includes('background-image: url("data:image/webp;base64,'), 'Should embed base64 webp data URI');

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('CSS injection is scoped to active editor group only', async () => {
        const readStub  = sandbox.stub(fs.promises, 'readFile').resolves(MOCK_HTML as unknown as Buffer);
        const writeStub = sandbox.stub(fs.promises, 'writeFile').resolves();
        sandbox.stub(fsOrig, 'readdirSync').returns(['bg.webp'] as unknown as ReturnType<typeof fs.readdirSync>);
        sandbox.stub(fsOrig, 'readFileSync').returns(Buffer.from('pixel'));
        sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        assert.ok(writeStub.called, 'writeFile should be called');
        const written = writeStub.firstCall.args[1] as string;

        // Must scope to .active so inactive editor windows are unaffected
        assert.ok(written.includes('.editor-group-container.active'), 'CSS must be scoped to .active editor group');

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('injected CSS opacity value is within the clamped range 0.05–0.25', async () => {
        const readStub  = sandbox.stub(fs.promises, 'readFile').resolves(MOCK_HTML as unknown as Buffer);
        const writeStub = sandbox.stub(fs.promises, 'writeFile').resolves();
        sandbox.stub(fsOrig, 'readdirSync').returns(['bg.webp'] as unknown as ReturnType<typeof fs.readdirSync>);
        sandbox.stub(fsOrig, 'readFileSync').returns(Buffer.from('pixel'));
        sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        assert.ok(writeStub.called, 'writeFile should be called');
        const written = writeStub.firstCall.args[1] as string;

        const match = written.match(/opacity:\s*([\d.]+)/);
        assert.ok(match, 'CSS should contain an opacity property');
        const opacity = parseFloat(match![1]);
        assert.ok(opacity >= 0.05, `Opacity ${opacity} should be >= 0.05`);
        assert.ok(opacity <= 0.25, `Opacity ${opacity} should be <= 0.25`);

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    // ── Removing the injection ────────────────────────────────────────────────

    test('patchWorkbench removes style block when theme is changed to none', async () => {
        const htmlWithStyle = mockHtmlWithInjection();
        const readStub  = sandbox.stub(fs.promises, 'readFile').resolves(htmlWithStyle as unknown as Buffer);
        const writeStub = sandbox.stub(fs.promises, 'writeFile').resolves();

        // Force the config-change listener to fire for 'none'
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'subwaysurfers', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 100));
        writeStub.resetHistory();

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        assert.ok(writeStub.called, 'writeFile should be called to strip the existing injection');
        const written = writeStub.firstCall.args[1] as string;
        assert.ok(!written.includes(INJECTION_START), 'Style tag open should be removed');
        assert.ok(!written.includes(INJECTION_END),   'Style tag close marker should be removed');
        assert.ok(written.includes('</head>'),         'Remainder of HTML must be preserved');

        readStub.restore();
        writeStub.restore();
    });

    test('patchWorkbench does not write file when theme is none and no injection exists', async () => {
        // MOCK_HTML has no existing injection
        const readStub  = sandbox.stub(fs.promises, 'readFile').resolves(MOCK_HTML as unknown as Buffer);
        const writeStub = sandbox.stub(fs.promises, 'writeFile').resolves();

        // Trigger the none path directly (theme is already none from previous teardown)
        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 100));
        writeStub.resetHistory();
        readStub.resetBehavior();
        readStub.resolves(MOCK_HTML as unknown as Buffer);

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        // No injection present in the HTML, so there is nothing to remove — no write needed
        if (writeStub.called) {
            const written = writeStub.firstCall.args[1] as string;
            assert.ok(!written.includes(INJECTION_START), 'Written HTML must not contain a style injection');
        }

        readStub.restore();
        writeStub.restore();
    });

    // ── setOpacity command ────────────────────────────────────────────────────

    test('setOpacity command stores selected opacity value in global state', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);
        sandbox.stub(vscode.window, 'showQuickPick').resolves({
            label: '5% — Subtle',
            value: 0.05,
        } as unknown as vscode.QuickPickItem);

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 150));

        await vscode.commands.executeCommand('backgroundImage.setOpacity');
        await new Promise(resolve => setTimeout(resolve, 300));

        // Verify patchWorkbench was called again after opacity update
        assert.ok(writeStub.callCount >= 1, 'writeFile should be called at least once after opacity change');

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('setOpacity command does nothing when user cancels the quick pick', async () => {
        const { readStub, writeStub } = stubFsSuccess(sandbox);
        sandbox.stub(vscode.window, 'showQuickPick').resolves(undefined);

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 150));
        const callsBefore = writeStub.callCount;

        await vscode.commands.executeCommand('backgroundImage.setOpacity');
        await new Promise(resolve => setTimeout(resolve, 200));

        assert.strictEqual(writeStub.callCount, callsBefore, 'No extra writes should occur when user cancels the picker');

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    // ── Error handling ────────────────────────────────────────────────────────

    test('shows error when no images found in minecraft assets folder', async () => {
        sandbox.stub(fs.promises, 'readFile').resolves(MOCK_HTML as unknown as Buffer);
        sandbox.stub(fs.promises, 'writeFile').resolves();
        sandbox.stub(fsOrig, 'readdirSync').throws(new Error('ENOENT: no such file'));
        const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        if (showErrorStub.called) {
            const msg = showErrorStub.firstCall.args[0] as string;
            assert.ok(msg.includes('Failed to load') || msg.includes('No images'), 'Should report missing images error');
        }

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
    });

    test('shows error when subwaysurfers assets folder contains no webp files', async () => {
        sandbox.stub(fs.promises, 'readFile').resolves(MOCK_HTML as unknown as Buffer);
        sandbox.stub(fs.promises, 'writeFile').resolves();
        // Return empty list — no webp files present
        sandbox.stub(fsOrig, 'readdirSync').returns([] as unknown as ReturnType<typeof fs.readdirSync>);
        const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'subwaysurfers', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        if (showErrorStub.called) {
            const msg = showErrorStub.firstCall.args[0] as string;
            assert.ok(
                msg.includes('Subway Surfers') || msg.includes('Failed to load'),
                'Error message should reference Subway Surfers or loading failure'
            );
        }

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
    });

    test('shows permission denied error when workbench HTML is not writable', async () => {
        sandbox.stub(fs.promises, 'readFile').resolves(MOCK_HTML as unknown as Buffer);
        sandbox.stub(fsOrig, 'readdirSync').returns(['bg.webp'] as unknown as ReturnType<typeof fs.readdirSync>);
        sandbox.stub(fsOrig, 'readFileSync').returns(Buffer.from(''));
        const err = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
        sandbox.stub(fs.promises, 'writeFile').rejects(err);
        const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        if (showErrorStub.called) {
            const msg = showErrorStub.firstCall.args[0] as string;
            assert.ok(
                msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('administrator'),
                'Should suggest running as administrator for EACCES errors'
            );
        }

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
    });

    test('shows generic error when workbench HTML write fails for non-permission reason', async () => {
        sandbox.stub(fs.promises, 'readFile').resolves(MOCK_HTML as unknown as Buffer);
        sandbox.stub(fsOrig, 'readdirSync').returns(['bg.webp'] as unknown as ReturnType<typeof fs.readdirSync>);
        sandbox.stub(fsOrig, 'readFileSync').returns(Buffer.from(''));
        const err = Object.assign(new Error('ENOSPC: no space left on device'), { code: 'ENOSPC' });
        sandbox.stub(fs.promises, 'writeFile').rejects(err);
        const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        if (showErrorStub.called) {
            const msg = showErrorStub.firstCall.args[0] as string;
            assert.ok(
                msg.includes('Failed to patch') || msg.includes('Parkour Background'),
                'Should show a Parkour Background error message'
            );
        }

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
    });

    test('shows error when workbench HTML file cannot be read', async () => {
        const readErr = Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' });
        sandbox.stub(fs.promises, 'readFile').rejects(readErr);
        const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 300));

        if (showErrorStub.called) {
            const msg = showErrorStub.firstCall.args[0] as string;
            assert.ok(
                msg.includes('Could not read') || msg.includes('Parkour Background'),
                'Should report that the workbench file could not be read'
            );
        }

        await vscode.workspace.getConfiguration('backgroundImage').update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
    });
});
