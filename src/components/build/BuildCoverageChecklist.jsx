import { CheckCircle, TriangleAlert, XCircle } from 'lucide-react';

const OK = ['COVERED', 'MAPPED'];
const PARTIAL = ['PARTIALLY COVERED', 'PARTIALLY MAPPED'];

function StatusIcon({ status }) {
    const style = { width: '16px', height: '16px', flexShrink: 0, marginTop: '1px' };
    if (OK.includes(status)) return <CheckCircle style={{ ...style, color: '#639922' }} />;
    if (PARTIAL.includes(status)) return <TriangleAlert style={{ ...style, color: '#BA7517' }} />;
    return <XCircle style={{ ...style, color: '#A32D2D' }} />;
}

function Row({ label, text, status, evidence, gap, fix }) {
    const ok = OK.includes(status);
    return (
        <div style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
            <StatusIcon status={status} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#0d2444', fontSize: '12px', lineHeight: 1.5 }}><strong>{label}</strong> {text}</p>
                {evidence && evidence.toLowerCase() !== 'none found' && (
                    <p style={{ color: '#6b7280', fontSize: '11px', fontStyle: 'italic', marginTop: '2px' }}>Found in: {evidence}</p>
                )}
                {!ok && gap && <p style={{ color: '#92400e', fontSize: '11px', marginTop: '2px' }}>Missing: {gap}</p>}
                {!ok && fix && <p style={{ color: '#0d2444', fontSize: '11px', marginTop: '2px' }}><strong>Suggested fix:</strong> {fix}</p>}
                {!ok && status === 'Could not be evaluated' && <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>Could not be verified.</p>}
            </div>
        </div>
    );
}

function Group({ title, items }) {
    if (!items.length) return null;
    const done = items.filter(i => OK.includes(i.status)).length;
    return (
        <div style={{ marginBottom: '14px' }}>
            <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>
                {title} ({done}/{items.length})
            </p>
            {items.map(i => <Row key={i.key} {...i} />)}
        </div>
    );
}

function UnitChecklist({ unit }) {
    const evid = (list, prefix) => (list || []).map((r, i) => ({
        key: r.id, label: `${prefix}${i + 1}.`, text: r.requirement, status: r.status, evidence: r.coverage, gap: r.gap, fix: r.fix,
    }));
    const pcs = (unit.elementsResults || []).flatMap(e => (e.performanceCriteria || []).map(pc => ({
        key: `${unit.unitCode}-${pc.ref}`, label: `${pc.ref}`, text: pc.text, status: pc.status, evidence: pc.mappedTo, gap: pc.gap, fix: pc.fix,
    })));
    const clean = unit.gaps.length === 0;
    return (
        <details open={!clean} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '10px' }}>
            <summary style={{ cursor: 'pointer', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#0d2444', fontSize: '13px', fontWeight: 600 }}>{unit.unitCode} <span style={{ fontWeight: 400, color: '#6b7280' }}>{unit.unitTitle}</span></span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: clean ? '#3B6D11' : '#BA7517' }}>
                    {clean ? 'All requirements covered' : `${unit.gaps.length} to review`}
                </span>
            </summary>
            <div style={{ padding: '4px 14px 10px' }}>
                <Group title="Performance Evidence" items={evid(unit.peResults, 'PE')} />
                <Group title="Knowledge Evidence" items={evid(unit.keResults, 'KE')} />
                <Group title="Performance Criteria" items={pcs} />
                <Group title="Assessment Conditions" items={evid(unit.acResults, 'AC')} />
            </div>
        </details>
    );
}

export default function BuildCoverageChecklist({ coverage }) {
    if (!coverage) return null;
    if (coverage.error) {
        return (
            <div style={{ border: '1px solid #f59e0b', backgroundColor: '#fffbeb', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px' }}>
                <p style={{ color: '#92400e', fontSize: '13px' }}>The coverage check could not be completed, so coverage of the training.gov.au requirements is not verified. Review the assessment against the unit manually or rebuild.</p>
            </div>
        );
    }
    const allGood = coverage.totalGaps === 0;
    return (
        <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: '#0d2444', fontSize: '16px', fontWeight: 500, marginBottom: '4px' }}>Coverage checklist</h3>
            <p style={{ color: allGood ? '#3B6D11' : '#92400e', fontSize: '12px', marginBottom: '12px' }}>
                {allGood ? 'Every training.gov.au requirement was checked against the assessment and is covered.' : `${coverage.totalGaps} requirement${coverage.totalGaps !== 1 ? 's' : ''} still need attention after the automatic revision.`}
                {coverage.added > 0 && ` ${coverage.added} item${coverage.added !== 1 ? 's were' : ' was'} added automatically to close gaps.`}
            </p>
            {coverage.units.map(u => <UnitChecklist key={u.unitCode} unit={u} />)}
        </div>
    );
}