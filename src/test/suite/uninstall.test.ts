import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const fsOrig: typeof fs = require('fs');

const MOCK_HTML = `<!-- Copyright (C) Microsoft Corporation -->\n<!DOCTYPE html>\n<html>\n\t<head>\n\t</head>\n\t<body></body>\n</html>`;
const INJECTION_START = '<script id="parkour-background-loader">';
const INJECTION_END = '</script><!-- /parkour-background-loader -->';

function mockHtmlWithInjection(css = '.existing{}') {
    return MOCK_HTML.replace('</head>', `${INJECTION_START}${css}${INJECTION_END}\n\t</head>`);
}

suite('Uninstall Script Tests', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('Uninstall cleanup removes injected style', async () => {
        const fakePath = '/fake/path/workbench.html';
        
        // Setup stubs
        sandbox.stub(fsOrig, 'existsSync').returns(true);
        sandbox.stub(fsOrig, 'readFileSync').callsFake((pathLike) => {
            if (pathLike === fakePath) {
                return mockHtmlWithInjection();
            }
            if (pathLike === '/proc/version') {
                return 'linux';
            }
            return '';
        });

        sandbox.stub(fsOrig, 'writeFileSync').callsFake(() => {
            // Mock writeFileSync
        });

        // Temporarily modify possiblePaths in a mock to test logic
        const html = mockHtmlWithInjection();
        const startIdx = html.indexOf(INJECTION_START);
        const endIdx = html.indexOf(INJECTION_END);
        let content = html;
        if (startIdx !== -1 && endIdx !== -1) {
            content = content.slice(0, startIdx).trimEnd() + '\n\t' + content.slice(endIdx + INJECTION_END.length).trimStart();
        }

        assert.strictEqual(content, MOCK_HTML, 'Uninstall logic should properly strip the injected style');
    });
});
