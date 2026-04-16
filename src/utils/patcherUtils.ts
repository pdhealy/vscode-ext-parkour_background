import { INJECTION_START, INJECTION_END } from './css';

export function removeInjection(html: string): string {
    const startIdx = html.indexOf(INJECTION_START);
    const endIdx = html.indexOf(INJECTION_END);
    if (startIdx !== -1 && endIdx !== -1) {
        return html.slice(0, startIdx).trimEnd() + '\n\t' + html.slice(endIdx + INJECTION_END.length).trimStart();
    }
    return html;
}

export function injectCss(html: string, css: string): string {
    const cleanHtml = removeInjection(html);
    return cleanHtml.replace('</head>', `${css}\n\t</head>`);
}
