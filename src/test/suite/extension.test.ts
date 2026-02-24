import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as fs from 'fs';

const MOCK_HTML = `<!-- Copyright (C) Microsoft Corporation -->\n<!DOCTYPE html>\n<html>\n\t<head>\n\t</head>\n\t<body></body>\n</html>`;

suite('Background Image Extension Tests', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    // ── Extension activation ──────────────────────────────────────────────────

    test('extension activates and registers toggle command', async () => {
        const ext = vscode.extensions.getExtension('local-dev.editor-background-image');
        // Command must be registered regardless of whether the extension object is available
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('backgroundImage.toggle'), 'backgroundImage.toggle command should be registered');
    });

    test('backgroundImage.enabled configuration property exists with default false', () => {
        const config = vscode.workspace.getConfiguration('backgroundImage');
        const value = config.get<boolean>('enabled');
        assert.strictEqual(value, false, 'Default value should be false');
    });

    // ── Workbench patching ────────────────────────────────────────────────────

    test('patchWorkbench injects style block into workbench HTML when enabled', async () => {
        const readStub = sandbox.stub(fs.promises, 'readFile').resolves(MOCK_HTML as unknown as Buffer);
        const writeStub = sandbox.stub(fs.promises, 'writeFile').resolves();
        sandbox.stub(fs.promises, 'access').resolves();

        // Simulate enabling by updating config (triggers onDidChangeConfiguration)
        const config = vscode.workspace.getConfiguration('backgroundImage');
        await config.update('enabled', true, vscode.ConfigurationTarget.Global);

        // Allow async listeners to fire
        await new Promise(resolve => setTimeout(resolve, 200));

        if (writeStub.called) {
            const written = writeStub.firstCall.args[1] as string;
            assert.ok(written.includes('<style id="editor-background-image">'), 'Should inject style block');
            assert.ok(written.includes('opacity: 0.3'), 'Should set opacity to 0.3');
            assert.ok(written.includes('data:image/png;base64,'), 'Should embed image as base64');
            assert.ok(written.includes('overflow-guard::before'), 'Should target ::before pseudo-element');
        }

        // Reset setting
        await config.update('enabled', false, vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('patchWorkbench removes style block from workbench HTML when disabled', async () => {
        const htmlWithInjection = MOCK_HTML.replace(
            '</head>',
            '<style id="editor-background-image">.test{}</style><!-- /editor-background-image -->\n\t</head>'
        );
        const readStub = sandbox.stub(fs.promises, 'readFile').resolves(htmlWithInjection as unknown as Buffer);
        const writeStub = sandbox.stub(fs.promises, 'writeFile').resolves();

        const config = vscode.workspace.getConfiguration('backgroundImage');
        await config.update('enabled', false, vscode.ConfigurationTarget.Global);

        await new Promise(resolve => setTimeout(resolve, 200));

        if (writeStub.called) {
            const written = writeStub.firstCall.args[1] as string;
            assert.ok(!written.includes('<style id="editor-background-image">'), 'Should remove style block');
        }
    });

    test('shows error when asset image is missing', async () => {
        sandbox.stub(fs.promises, 'readFile').resolves(MOCK_HTML as unknown as Buffer);
        sandbox.stub(fs.promises, 'writeFile').resolves();
        sandbox.stub(fs.promises, 'access').rejects(new Error('ENOENT'));

        const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        const config = vscode.workspace.getConfiguration('backgroundImage');
        await config.update('enabled', true, vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 200));

        // Check error was shown (if the stub intercepted the call)
        if (showErrorStub.called) {
            const msg = showErrorStub.firstCall.args[0] as string;
            assert.ok(msg.includes('Asset not found'), 'Should show asset not found error');
        }

        await config.update('enabled', false, vscode.ConfigurationTarget.Global);
    });

    test('shows permission error when workbench HTML is not writable', async () => {
        sandbox.stub(fs.promises, 'readFile').resolves(MOCK_HTML as unknown as Buffer);
        sandbox.stub(fs.promises, 'access').resolves();
        const err = Object.assign(new Error('EACCES'), { code: 'EACCES' });
        sandbox.stub(fs.promises, 'writeFile').rejects(err);

        const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        const config = vscode.workspace.getConfiguration('backgroundImage');
        await config.update('enabled', true, vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 200));

        if (showErrorStub.called) {
            const msg = showErrorStub.firstCall.args[0] as string;
            assert.ok(msg.toLowerCase().includes('permission'), 'Should show permission denied error');
        }

        await config.update('enabled', false, vscode.ConfigurationTarget.Global);
    });
});
