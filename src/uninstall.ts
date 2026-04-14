import * as fs from 'fs';
import { getWorkbenchHtmlPaths } from './utils/paths';
import { INJECTION_START, INJECTION_END } from './utils/css';
import { writeFileElevated } from './utils/fs';

async function cleanup() {
  const possiblePaths = getWorkbenchHtmlPaths();

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
        await writeFileElevated(htmlPath, content);
        console.log(`Parkour Background removed from: ${htmlPath}`);
      }
    } catch (err: any) {
      console.error(`Failed to remove Parkour Background from: ${htmlPath} - ${err.message}`);
      throw new Error(`Uninstallation failed to modify ${htmlPath}: ${err.message}. Please fix permissions and try again.`);
    }
  }
}

cleanup().catch(err => {
    console.error(err);
    process.exit(1);
});
