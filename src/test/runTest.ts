import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');

		// The path to the extension test script
		// Passed to --extensionTestsPath
		const extensionTestsPath = path.resolve(__dirname, './suite/index');

		// Use system-installed VS Code if provided via env var, otherwise download
		const vscodeExecutablePath = process.env.VSCODE_EXECUTABLE_PATH;
		const testOptions: any = { extensionDevelopmentPath, extensionTestsPath };
		if (vscodeExecutablePath) {
			testOptions.vscodeExecutablePath = vscodeExecutablePath;
		}
		await runTests(testOptions);
	} catch (err) {
		console.error('Failed to run tests');
		process.exit(1);
	}
}

main();
