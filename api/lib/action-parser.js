/**
 * action-parser.js
 * Extrai e remove blocos JSON de ação ({ "action": ... }) de respostas da IA.
 * Port server-side de src/pages/TarefasPage.jsx (funções auxiliares).
 */

function _findActionJsonSpans(text) {
    const spans = [];
    const marker = /\{\s*"action"\s*:/g;
    let match;
    while ((match = marker.exec(text)) !== null) {
        const start = match.index;
        let depth = 0, j = start;
        while (j < text.length) {
            if (text[j] === '{') depth++;
            else if (text[j] === '}') {
                depth--;
                if (depth === 0) { spans.push([start, j + 1]); break; }
            }
            j++;
        }
    }
    return spans;
}

export function extractActionJsons(text) {
    return _findActionJsonSpans(text).map(([s, e]) => {
        try { return JSON.parse(text.slice(s, e)); } catch { return null; }
    }).filter(Boolean);
}

export function removeActionJsons(text) {
    const spans = _findActionJsonSpans(text);
    if (!spans.length) return text;
    let result = '';
    let last = 0;
    for (const [s, e] of spans) {
        result += text.slice(last, s);
        last = e;
    }
    return (result + text.slice(last)).replace(/\n{3,}/g, '\n\n').trim();
}
