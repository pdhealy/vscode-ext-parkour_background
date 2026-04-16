"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
// This script runs when the extension is uninstalled
// It does NOT have access to VS Code API
function cleanup() {
    const possiblePaths = [];
    if (process.platform === 'win32') {
        // Native Windows
        const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
        possiblePaths.push(path.join(localAppData, 'Programs', 'Microsoft VS Code', 'resources', 'app', 'out', 'vs', 'workbench', 'workbench.desktop.main.js'), 'C:\\Program Files\\Microsoft VS Code\\resources\\app\\out\\vs\\workbench\\workbench.desktop.main.js');
    }
    else if (process.platform === 'linux') {
        // Linux or WSL
        // Check if running in WSL
        try {
            const release = fs.readFileSync('/proc/version', 'utf8').toLowerCase();
            if (release.includes('microsoft') || release.includes('wsl')) {
                // WSL - check Windows paths
                const usersDir = '/mnt/c/Users';
                if (fs.existsSync(usersDir)) {
                    const users = fs.readdirSync(usersDir).filter(u => !['Public', 'Default', 'Default User', 'All Users'].includes(u) &&
                        !u.startsWith('.'));
                    for (const user of users) {
                        possiblePaths.push(`/mnt/c/Users/${user}/AppData/Local/Programs/Microsoft VS Code/resources/app/out/vs/workbench/workbench.desktop.main.js`);
                    }
                }
                possiblePaths.push('/mnt/c/Program Files/Microsoft VS Code/resources/app/out/vs/workbench/workbench.desktop.main.js');
            }
        }
        catch { }
        // Native Linux paths
        possiblePaths.push('/usr/share/code/resources/app/out/vs/workbench/workbench.desktop.main.js', path.join(os.homedir(), '.vscode', 'resources', 'app', 'out', 'vs', 'workbench', 'workbench.desktop.main.js'));
    }
    else if (process.platform === 'darwin') {
        // macOS
        possiblePaths.push('/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js');
    }
    for (const jsPath of possiblePaths) {
        try {
            if (fs.existsSync(jsPath)) {
                let content = fs.readFileSync(jsPath, 'utf8');
                if (content.includes('SNOW-BACKGROUND-START')) {
                    content = content.replace(/\/\* SNOW-BACKGROUND-START \*\/[\s\S]*?\/\* SNOW-BACKGROUND-END \*\//g, '');
                    fs.writeFileSync(jsPath, content, 'utf8');
                    console.log(`Snow background removed from: ${jsPath}`);
                }
            }
        }
        catch (err) {
            // Continue trying other paths
        }
    }
}
cleanup();
//# sourceMappingURL=uninstall.js.map