import * as assert from 'assert';
import { removeInjection, injectCss } from '../../utils/patcherUtils';
import { INJECTION_START, INJECTION_END } from '../../utils/css';

suite('PatcherUtils Test Suite', () => {
    test('removeInjection should remove injected CSS', () => {
        const html = `<html><head>${INJECTION_START}body{} ${INJECTION_END}</head><body></body></html>`;
        const expected = `<html><head>\n\t</head><body></body></html>`;
        assert.strictEqual(removeInjection(html), expected);
    });

    test('removeInjection should return same html if no injection', () => {
        const html = `<html><head></head><body></body></html>`;
        assert.strictEqual(removeInjection(html), html);
    });

    test('injectCss should inject CSS and remove old one', () => {
        const oldCss = `${INJECTION_START}old{} ${INJECTION_END}`;
        const newCss = `${INJECTION_START}new{} ${INJECTION_END}`;
        const html = `<html><head>${oldCss}</head><body></body></html>`;
        const result = injectCss(html, newCss);
        
        assert.ok(result.includes(newCss));
        assert.ok(!result.includes('old{}'));
    });
});
