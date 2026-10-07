// Helpers that keep the audit honest: evidence must exist in the assessment text,
// headings must not become standalone requirements, and verdicts fail closed.

export const UNEVALUATED = 'Could not be evaluated';

export function normText(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function buildTextIndex(text) {
    const norm = normText(text);
    const words = norm.split(' ');
    const tri = new Set();
    for (let i = 0; i <= words.length - 3; i++) tri.add(words.slice(i, i + 3).join(' '));
    return { norm, tri };
}

function partFound(part, index) {
    if (index.norm.includes(part)) return true;
    const w = part.split(' ');
    if (w.length < 4) return false;
    let hit = 0, total = 0;
    for (let i = 0; i <= w.length - 3; i++) {
        total++;
        if (index.tri.has(w.slice(i, i + 3).join(' '))) hit++;
    }
    return total > 0 && hit / total >= 0.7;
}

// True when the quoted evidence can be found in the extracted assessment text.
export function verifyEvidence(evidence, index) {
    const ev = String(evidence || '').trim();
    if (!ev || /^(none|n\/a)/i.test(ev)) return false;
    const parts = ev.split(/\s*(?:\.\.\.|…|\||\n)\s*/).map(normText).filter(p => p.length >= 8);
    if (!parts.length) return false;
    const found = parts.filter(p => partFound(p, index)).length;
    return found >= Math.ceil(parts.length / 2);
}

// Joins "This includes access to:" style headings with their child items so the
// heading is never audited as a requirement on its own.
export function normalizeAC(list) {
    const out = [];
    let parent = null;
    for (const raw of list || []) {
        const t = String(raw || '').trim();
        if (!t) continue;
        const endsColon = t.endsWith(':');
        const looksChild = parent && !endsColon && (/^[a-z]/.test(t) || (t.length <= 80 && !t.endsWith('.')));
        if (looksChild) {
            parent.children.push(t.replace(/[;,.]$/, ''));
            continue;
        }
        parent = { text: t, children: [] };
        out.push(parent);
        if (!endsColon) parent = null;
    }
    return out.map(o => (o.children.length ? `${o.text} ${o.children.join('; ')}` : o.text));
}

const OK = new Set(['COVERED', 'MAPPED']);

export function allRequirementResults(unit) {
    return [
        ...(unit.peResults || []),
        ...(unit.keResults || []),
        ...(unit.acResults || []),
        ...(unit.elementsResults || []).flatMap(e => e.performanceCriteria || []),
    ];
}

export function computeUnitVerdict(unit) {
    const all = allRequirementResults(unit);
    if (all.some(r => !OK.has(r.status) && r.status !== UNEVALUATED)) return 'REQUIRES DEVELOPMENT';
    if (all.some(r => r.status === UNEVALUATED)) return 'AUDIT INCOMPLETE';
    return 'ADEQUATE';
}