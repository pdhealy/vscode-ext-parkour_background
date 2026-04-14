import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as cp from 'child_process';

export async function writeFileElevated(filePath: string, content: string): Promise<void> {
    try {
        await fs.promises.writeFile(filePath, content, 'utf8');
    } catch (err: any) {
        if (err.code !== 'EACCES' && err.code !== 'EPERM') {
            throw err;
        }

        const tmpPath = path.join(os.tmpdir(), `vscode-elevated-${Date.now()}.tmp`);
        await fs.promises.writeFile(tmpPath, content, 'utf8');
        try {
            if (process.platform === 'darwin') {
                cp.execFileSync('osascript', [
                    '-e',
                    `do shell script "cp " & quoted form of "${tmpPath}" & " " & quoted form of "${filePath}" with administrator privileges`,
                ]);
            } else if (process.platform === 'linux') {
                cp.execFileSync('pkexec', ['cp', tmpPath, filePath]);
            } else if (process.platform === 'win32') {
                cp.execFileSync('powershell.exe', [
                    '-Command',
                    `Start-Process cmd -ArgumentList '/c copy /y ""${tmpPath}"" ""${filePath}""' -Verb RunAs -Wait -WindowStyle Hidden`
                ]);
            } else {
                throw err;
            }
        } finally {
            await fs.promises.unlink(tmpPath).catch(() => {});
        }
    }
}