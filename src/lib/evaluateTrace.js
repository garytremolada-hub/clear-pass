// Single source of truth for how audit results are shown, so the in-app report
// and the downloaded report always agree.

export const KIND_STYLE = {
    covered: { label: 'Covered', color: '#3B6D11', bg: '#EAF3DE' },
    partial: { label: 'Partially covered', color: '#854F0B', bg: '#FAEEDA' },
    missing: { label: 'Not covered', color: '#A32D2D', bg: '#FCEBEB' },
    unevaluated: { label: 'Could not be evaluated', color: '#4b5563', bg: '#f3f4f6' },
};

export function statusKind(status) {
    const s = (status || '').toUpperCase();
    if (s === 'COVERED' || s === 'MAPPED') return 'covered';
    if (s.includes('PARTIAL')) return 'partial';
    if (s === 'NOT COVERED' || s === 'NOT MAPPED') return 'missing';
    return 'unevaluated';
}

function item(r, extra) {
    return {
        id: r.id,
        kind: statusKind(r.status),
        status: r.status,
        evidence: r.evidence || r.coverage || '',
        evidenceVerified: r.evidenceVerified,
        reason: r.rationale || '',
        gap: r.gap || '',
        fix: r.fix || '',
        ...extra,
    };
}

export function flattenRequirements(unit) {
    const pcs = (unit.elementsResults || []).flatMap(el =>
        (el.performanceCriteria || []).map(pc => item(
            { ...pc, id: pc.id || `${unit.unitCode}-${pc.ref}`, evidence: pc.evidence },
            { label: `PC ${pc.ref}`, source: pc.text, detail: `Element ${el.number}: ${el.title}`, official: true }
        ))
    );
    const mk = (list, prefix) => (list || []).map((r, i) => item(r, { label: r.label || `${prefix}${i + 1}`, source: r.requirement, official: false }));
    return [
        { title: 'Performance Criteria', note: 'References match the official unit (for example PC 3.3).', items: pcs },
        { title: 'Performance Evidence', note: 'PE numbers are internal IDs for this report, in the order listed in the unit.', items: mk(unit.peResults, 'PE') },
        { title: 'Knowledge Evidence', note: 'KE numbers are internal IDs for this report, in the order listed in the unit.', items: mk(unit.keResults, 'KE') },
        { title: 'Assessment Conditions', note: 'AC numbers are internal IDs for this report, in the order listed in the unit.', items: mk(unit.acResults, 'AC') },
    ].filter(g => g.items.length > 0);
}

export function countKinds(items) {
    const c = { covered: 0, partial: 0, missing: 0, unevaluated: 0 };
    items.forEach(i => { c[i.kind]++; });
    return c;
}