import * as assert from 'assert';
import * as path from 'path';
import { getProductJsonPath, getAppOutDir } from '../../utils/paths';

suite('Paths Test Suite', () => {
    test('getProductJsonPath should return path to product.json', () => {
        const appRoot = '/fake/root';
        const expected = path.join(appRoot, 'product.json');
        assert.strictEqual(getProductJsonPath(appRoot), expected);
    });

    test('getAppOutDir should return path to out directory', () => {
        const appRoot = '/fake/root';
        const expected = path.join(appRoot, 'out');
        assert.strictEqual(getAppOutDir(appRoot), expected);
    });
});
