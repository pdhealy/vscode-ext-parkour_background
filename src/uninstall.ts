import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import { getWorkbenchHtmlPaths, getProductJsonPath, getAppOutDir } from './utils/paths';
import { INJECTION_START, INJECTION_END } from './utils/css';
import { writeFileElevated } from './utils/fs';
import { removeInjection } from './utils/patcherUtils';

async function updateProductJsonChecksum(htmlPath: string, content: string): Promise<void> {
    const appRoot = path.resolve(path.dirname(htmlPath), '..', '..', '..', '..', '..', '..');
    const productPath = getProductJsonPath(appRoot);
    const appOutDir = getAppOutDir(appRoot);

    try {
        if (!fs.existsSync(productPath)) { return; }
        
        const checksum = crypto.createHash('md5').update(content).digest('base64');
        const product = JSON.parse(await fs.promises.readFile(productPath, 'utf8'));

        if (!product.checksums) { return; }

        const key = path.relative(appOutDir, htmlPath).split(path.sep).join('/');

        if (product.checksums[key] === checksum) { return; }

        product.checksums[key] = checksum;
        const newContent = JSON.stringify(product, null, '\t');

        await writeFileElevated(productPath, newContent);
    } catch (err) {
        console.error('Parkour Background: Failed to update product.json checksum during uninstall.', err);
    }
}

async function cleanup() {
  console.log('Parkour Background: Starting cleanup...');

  // 1. Try to find app-root.txt in the same directory as the script (out/uninstall.js)
  // or one level up (extension root)
  const pathsToTry = [
    path.join(__dirname, 'app-root.txt'),
    path.join(__dirname, '..', 'app-root.txt'),
    path.join(process.cwd(), 'app-root.txt')
  ];

  let appRoot: string | undefined;
  for (const p of pathsToTry) {
    if (fs.existsSync(p)) {
      try {
        appRoot = fs.readFileSync(p, 'utf8').trim();
        console.log(`Parkour Background: Found appRoot in ${p}: ${appRoot}`);
        break;
      } catch (err) {
        console.error(`Parkour Background: Failed to read ${p}`, err);
      }
    }
  }

  const possiblePaths = getWorkbenchHtmlPaths(appRoot);
  console.log(`Parkour Background: Searching in ${possiblePaths.length} possible workbench paths.`);

  for (const htmlPath of possiblePaths) {
    try {
      if (!fs.existsSync(htmlPath)) { continue; }
      
      const content = await fs.promises.readFile(htmlPath, 'utf8');
      
      if (content.indexOf(INJECTION_START) !== -1 && content.indexOf(INJECTION_END) !== -1) {
        console.log(`Parkour Background: Found injection in ${htmlPath}. Removing...`);
        const newContent = removeInjection(content);
        await writeFileElevated(htmlPath, newContent);
        console.log(`Parkour Background: Removed from: ${htmlPath}`);
        
        await updateProductJsonChecksum(htmlPath, newContent);
      } else {
        console.log(`Parkour Background: No injection found in ${htmlPath}`);
      }
    } catch (err: any) {
      console.error(`Parkour Background: Failed to modify ${htmlPath} - ${err.message}`);
    }
  }
  console.log('Parkour Background: Cleanup finished. PLEASE RESTART ALL VS CODE WINDOWS.');
}

cleanup().catch(err => {
    console.error(err);
    process.exit(1);
});
