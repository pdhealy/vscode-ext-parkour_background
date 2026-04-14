import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const STYLE_ID = 'editor-background-image';
const INJECTION_START = `<style id="${STYLE_ID}">`;
const INJECTION_END = `</style><!-- /${STYLE_ID} -->`;

async function cleanup() {
  const possiblePaths: string[] = [];

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFiles86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    const winRoots = [
        path.join(localAppData, 'Programs', 'Microsoft VS Code', 'resources', 'app'),
        path.join(programFiles, 'Microsoft VS Code', 'resources', 'app'),
        path.join(programFiles86, 'Microsoft VS Code', 'resources', 'app')
    ];
    for (const root of winRoots) {
        possiblePaths.push(
            path.join(root, 'out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html'),
            path.join(root, 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html')
        );
    }
  } else if (process.platform === 'linux') {
    try {
      const release = await fs.promises.readFile('/proc/version', 'utf8');
      if (release.toLowerCase().includes('microsoft') || release.toLowerCase().includes('wsl')) {
        const usersDir = '/mnt/c/Users';
        try {
          const users = (await fs.promises.readdir(usersDir)).filter(u => !['Public', 'Default', 'Default User', 'All Users'].includes(u) && !u.startsWith('.'));
          for (const user of users) {
            possiblePaths.push(
              `/mnt/c/Users/${user}/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html`,
              `/mnt/c/Users/${user}/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html`
            );
          }
        } catch {
          // Ignore directory read errors
        }
        possiblePaths.push(
            '/mnt/c/Program Files/Microsoft VS Code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html',
            '/mnt/c/Program Files/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html'
        );
      }
    } catch {
      // Ignore
    }

    const linuxRoots = ['/usr/share/code/resources/app', '/usr/lib/code/resources/app', '/opt/visual-studio-code/resources/app', path.join(os.homedir(), '.vscode', 'resources', 'app')];
    for (const root of linuxRoots) {
        possiblePaths.push(path.join(root, 'out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html'), path.join(root, 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html'));
    }
  } else if (process.platform === 'darwin') {
    const macRoots = ['/Applications/Visual Studio Code.app/Contents/Resources/app', path.join(os.homedir(), 'Applications', 'Visual Studio Code.app', 'Contents', 'Resources', 'app')];
    for (const root of macRoots) {
        possiblePaths.push(path.join(root, 'out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html'), path.join(root, 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html'));
    }
  }

  for (const htmlPath of possiblePaths) {
    try {
      try {
        await fs.promises.access(htmlPath, fs.constants.F_OK);
      } catch {
        continue;
      }
      let content = await fs.promises.readFile(htmlPath, 'utf8');
      const startIdx = content.indexOf(INJECTION_START);
      const endIdx = content.indexOf(INJECTION_END);
      
      if (startIdx !== -1 && endIdx !== -1) {
        content = content.slice(0, startIdx).trimEnd() + '\n\t' + content.slice(endIdx + INJECTION_END.length).trimStart();
        await fs.promises.writeFile(htmlPath, content, 'utf8');
        console.log(`Parkour Background removed from: ${htmlPath}`);
      }
    } catch (err: any) {
      console.error(`Failed to remove Parkour Background from: ${htmlPath} - ${err.message}`);
    }
  }
}

cleanup();
