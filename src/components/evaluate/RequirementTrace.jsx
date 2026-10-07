import { KIND_STYLE, countKinds } from '@/lib/evaluateTrace';

const LABEL = { color: '#9ca3af', fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '2px' };
const BODY = { color: '#374151', fontSize: '13px', lineHeight: 1.5, marginBottom: '10px' };

function Row({ r }) {
    const k = KIND_STYLE[r.kind];
    return (
        <details style={{ borderBottom: '1px solid #f3f4f6' }}>
            <summary style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '8px 4px', cursor: 'pointer', listStyle: 'none' }}>
                <span style={{ color: '#0d2444', fontSize: '12px', fontWeight: 700, minWidth: '56px' }}>{r.label}</span>
                <span style={{ backgroundColor: k.bg, color: k.color, fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap' }}>{k.label}</span>
                <span style={{ color: '#6b7280', fontSize: '12px', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.source}</span>
            </summary>
            <div style={{ padding: '6px 8px 8px 66px' }}>
                <p style={LABEL}>{r.official ? 'Official requirement (training.gov.au)' : 'Requirement text (training.gov.au)'}</p>
                <p style={BODY}>{r.source}{r.detail ? <span style={{ color: '#9ca3af' }}> ({r.detail})</span> : null}</p>
                <p style={LABEL}>Evidence from the assessment</p>
                {r.evidence && r.kind !== 'missing' && r.kind !== 'unevaluated' ? (
                    <p style={{ ...BODY, fontStyle: 'italic' }}>
                        "{r.evidence}"
                        {r.evidenceVerified === false && <span style={{ color: '#A32D2D', fontStyle: 'normal' }}> (quote could not be matched to the text, check manually)</span>}
                    </p>
                ) : (
                    <p style={{ ...BODY, color: '#6b7280' }}>
                        {r.kind === 'unevaluated' ? 'No valid result was produced for this requirement.' : 'No matching text was found in the assessment.'}
                    </p>
                )}
                {(r.reason || r.gap) && (<><p style={LABEL}>Why this result</p><p style={BODY}>{[r.reason, r.gap].filter(Boolean).join(' ')}</p></>)}
                {r.fix && (<><p style={LABEL}>Suggested change (AI suggestion, not a TGA requirement)</p><p style={BODY}>{r.fix}</p></>)}
            </div>
        </details>
    );
}

export default function RequirementTrace({ groups }) {
    return (
        <div style={{ marginTop: '8px' }}>
            <p style={{ ...LABEL, marginBottom: '8px' }}>Evidence trace</p>
            {groups.map(g => {
                const c = countKinds(g.items);
                return (
                    <details key={g.title} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '8px', padding: '0 12px' }}>
                        <summary style={{ cursor: 'pointer', padding: '10px 0', color: '#0d2444', fontSize: '13px', fontWeight: 500 }}>
                            {g.title} · {g.items.length} requirement{g.items.length !== 1 ? 's' : ''}
                            <span style={{ color: '#6b7280', fontWeight: 400, fontSize: '12px' }}>
                                {' '}({c.covered} covered, {c.partial} partial, {c.missing} not covered{c.unevaluated ? `, ${c.unevaluated} not evaluated` : ''})
                            </span>
                        </summary>
                        <p style={{ color: '#9ca3af', fontSize: '11px', fontStyle: 'italic', marginBottom: '6px' }}>{g.note}</p>
                        {g.items.map(r => <Row key={r.id || r.label} r={r} />)}
                    </details>
                );
            })}
        </div>
    );
}