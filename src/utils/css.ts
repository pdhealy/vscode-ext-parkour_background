import * as fs from 'fs';
import * as path from 'path';

export const STYLE_ID = 'editor-background-image';
export const INJECTION_START = `<style id="${STYLE_ID}">`;
export const INJECTION_END = `</style><!-- /${STYLE_ID} -->`;

export async function buildCss(imagePath: string, opacity: number): Promise<string> {
    const imageData = await fs.promises.readFile(imagePath);
    const base64 = imageData.toString('base64');
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.webp' ? 'image/webp' : 'image/png';
    const dataUri = `data:${mimeType};base64,${base64}`;
    return [
        INJECTION_START,
        `.editor-group-container.active .monaco-editor .overflow-guard { position: relative; }`,
        `.editor-group-container.active .monaco-editor .overflow-guard::before {`,
        `  content: '';`,
        `  position: absolute;`,
        `  top: 0; left: 0; right: 0; bottom: 0;`,
        `  background-image: url("${dataUri}");`,
        `  background-position: center;`,
        `  background-repeat: no-repeat;`,
        `  background-size: cover;`,
        `  opacity: ${opacity};`,
        `  pointer-events: none;`,
        `  z-index: 50;`,
        `}`,
        INJECTION_END,
    ].join('\n');
}