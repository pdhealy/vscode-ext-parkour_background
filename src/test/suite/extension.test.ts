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

    test('extension activates and registers toggle commands', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('backgroundImage.toggleMinecraft'), 'backgroundImage.toggleMinecraft command should be registered');
        assert.ok(commands.includes('backgroundImage.toggleSubwaySurfers'), 'backgroundImage.toggleSubwaySurfers command should be registered');
    });

    test('backgroundImage.activeTheme configuration property exists with default none', () => {
        const config = vscode.workspace.getConfiguration('backgroundImage');
        const value = config.get<string>('activeTheme');
        assert.strictEqual(value, 'none', 'Default value should be none');
    });

    // ── Workbench patching ────────────────────────────────────────────────────

    test('patchWorkbench injects style block into workbench HTML when minecraft theme enabled', async () => {
        const readStub = sandbox.stub(fs.promises, 'readFile').resolves(MOCK_HTML as unknown as Buffer);
        const writeStub = sandbox.stub(fs.promises, 'writeFile').resolves();
        sandbox.stub(fs, 'readdirSync').returns(['000.webp'] as unknown as ReturnType<typeof fs.readdirSync>);
        sandbox.stub(fs, 'readFileSync').returns(Buffer.from(''));

        const config = vscode.workspace.getConfiguration('backgroundImage');
        await config.update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);

        await new Promise(resolve => setTimeout(resolve, 200));

        if (writeStub.called) {
            const written = writeStub.firstCall.args[1] as string;
            assert.ok(written.includes('<style id="editor-background-image">'), 'Should inject style block');
            assert.ok(written.includes('overflow-guard::before'), 'Should target ::before pseudo-element');
        }

        await config.update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
        readStub.restore();
        writeStub.restore();
    });

    test('patchWorkbench removes style block from workbench HTML when theme set to none', async () => {
        const htmlWithInjection = MOCK_HTML.replace(
            '</head>',
            '<style id="editor-background-image">.test{}</style><!-- /editor-background-image -->\n\t</head>'
        );
        const readStub = sandbox.stub(fs.promises, 'readFile').resolves(htmlWithInjection as unknown as Buffer);
        const writeStub = sandbox.stub(fs.promises, 'writeFile').resolves();

        const config = vscode.workspace.getConfiguration('backgroundImage');
        await config.update('activeTheme', 'none', vscode.ConfigurationTarget.Global);

        await new Promise(resolve => setTimeout(resolve, 200));

        if (writeStub.called) {
            const written = writeStub.firstCall.args[1] as string;
            assert.ok(!written.includes('<style id="editor-background-image">'), 'Should remove style block');
        }

        readStub.restore();
        writeStub.restore();
    });

    test('shows error when no images found in assets folder', async () => {
        sandbox.stub(fs.promises, 'readFile').resolves(MOCK_HTML as unknown as Buffer);
        sandbox.stub(fs.promises, 'writeFile').resolves();
        sandbox.stub(fs, 'readdirSync').throws(new Error('ENOENT'));

        const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        const config = vscode.workspace.getConfiguration('backgroundImage');
        await config.update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 200));

        if (showErrorStub.called) {
            const msg = showErrorStub.firstCall.args[0] as string;
            assert.ok(msg.includes('Failed to load'), 'Should show failed to load error');
        }

        await config.update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
    });

    test('shows permission error when workbench HTML is not writable', async () => {
        sandbox.stub(fs.promises, 'readFile').resolves(MOCK_HTML as unknown as Buffer);
        sandbox.stub(fs, 'readdirSync').returns(['000.webp'] as unknown as ReturnType<typeof fs.readdirSync>);
        sandbox.stub(fs, 'readFileSync').returns(Buffer.from(''));
        const err = Object.assign(new Error('EACCES'), { code: 'EACCES' });
        sandbox.stub(fs.promises, 'writeFile').rejects(err);

        const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

        const config = vscode.workspace.getConfiguration('backgroundImage');
        await config.update('activeTheme', 'minecraft', vscode.ConfigurationTarget.Global);
        await new Promise(resolve => setTimeout(resolve, 200));

        if (showErrorStub.called) {
            const msg = showErrorStub.firstCall.args[0] as string;
            assert.ok(msg.toLowerCase().includes('permission'), 'Should show permission denied error');
        }

        await config.update('activeTheme', 'none', vscode.ConfigurationTarget.Global);
    });
});
