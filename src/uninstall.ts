import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const STYLE_ID = 'editor-background-image';
const INJECTION_START = `<style id="${STYLE_ID}">`;
const INJECTION_END = `</style><!-- /${STYLE_ID} -->`;

function cleanup() {
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
      const release = fs.readFileSync('/proc/version', 'utf8').toLowerCase();
      if (release.includes('microsoft') || release.includes('wsl')) {
        const usersDir = '/mnt/c/Users';
        if (fs.existsSync(usersDir)) {
          const users = fs.readdirSync(usersDir).filter(u => !['Public', 'Default', 'Default User', 'All Users'].includes(u) && !u.startsWith('.'));
          for (const user of users) {
            possiblePaths.push(
              `/mnt/c/Users/${user}/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html`,
              `/mnt/c/Users/${user}/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/code/electron-browser/workbench/workbench.html`
            );
          }
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
      if (fs.existsSync(htmlPath)) {
        let content = fs.readFileSync(htmlPath, 'utf8');
        const startIdx = content.indexOf(INJECTION_START);
        const endIdx = content.indexOf(INJECTION_END);
        
        if (startIdx !== -1 && endIdx !== -1) {
          content = content.slice(0, startIdx).trimEnd() + '\n\t' + content.slice(endIdx + INJECTION_END.length).trimStart();
          fs.writeFileSync(htmlPath, content, 'utf8');
          console.log(`Parkour Background removed from: ${htmlPath}`);
        }
      }
    } catch (err) {
      // Ignore errors for individual paths
    }
  }
}

cleanup();
