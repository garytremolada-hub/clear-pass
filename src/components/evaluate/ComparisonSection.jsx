function statusRank(status) {
    const s = (status || '').toUpperCase();
    if (s === 'COVERED' || s === 'MAPPED') return 2;
    if (s.includes('PARTIAL')) return 1;
    return 0;
}

function ChangeArrow({ prev, curr }) {
    const pRank = statusRank(prev), cRank = statusRank(curr);
    if (cRank > pRank) return <span style={{ color: '#639922', fontWeight: 700 }}>&#8593;</span>;
    if (cRank < pRank) return <span style={{ color: '#A32D2D', fontWeight: 700 }}>&#8595;</span>;
    return <span style={{ color: '#9ca3af' }}>&#8212;</span>;
}

function statusStyle(status) {
    const s = (status || '').toUpperCase();
    if (s === 'COVERED' || s === 'MAPPED') return { color: '#3B6D11', fontWeight: 500 };
    if (s.includes('PARTIAL')) return { color: '#854F0B', fontWeight: 500 };
    if (s === 'NO DATA') return { color: '#9ca3af' };
    return { color: '#A32D2D', fontWeight: 500 };
}

function changeCard(label, prevVal, currVal, total) {
    const diff = currVal - prevVal;
    const color = diff > 0 ? '#639922' : diff < 0 ? '#A32D2D' : '#6b7280';
    const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '';
    return (
        <div key={label} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', flex: 1, minWidth: 0 }}>
            <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</p>
            <p style={{ color, fontSize: '15px', fontWeight: 700, marginBottom: '2px' }}>
                {prevVal}/{total} {arrow} {currVal}/{total}
            </p>
            <p style={{ color: '#9ca3af', fontSize: '11px' }}>{diff === 0 ? 'No change' : diff > 0 ? `${diff} improved` : `${Math.abs(diff)} regressed`}</p>
        </div>
    );
}

function UnitComparison({ prevUnit, currUnit }) {
    const prevDate = prevUnit.savedAt ? new Date(prevUnit.savedAt).toLocaleDateString('en-AU') : 'Previous';

    const prevPE = prevUnit.pe || {};
    const prevKE = prevUnit.ke || {};
    const prevPC = prevUnit.pc || {};

    const rows = [];
    (currUnit.keResults || []).forEach((r, i) => {
        const prevItem = (prevKE.items || [])[i];
        rows.push({ req: `KE${i + 1}: ${(r.requirement || '').slice(0, 60)}`, prev: prevItem?.status || 'NO DATA', curr: r.status });
    });
    (currUnit.peResults || []).forEach((r, i) => {
        const prevItem = (prevPE.items || [])[i];
        rows.push({ req: `PE${i + 1}: ${(r.requirement || '').slice(0, 60)}`, prev: prevItem?.status || 'NO DATA', curr: r.status });
    });
    const allPCs = (currUnit.elementsResults || []).flatMap(e => e.performanceCriteria || []);
    allPCs.forEach((r) => {
        const prevItem = (prevPC.items || []).find(p => p.ref === r.ref);
        rows.push({ req: `${r.ref}: ${(r.text || '').slice(0, 60)}`, prev: prevItem?.status || 'NO DATA', curr: r.status });
    });

    return (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: '#0d2444', fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>
                {currUnit.unitCode} — {currUnit.unitTitle}
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {changeCard('Knowledge Evidence', prevKE.covered || 0, (currUnit.keResults || []).filter(r => r.status === 'COVERED').length, (currUnit.keResults || []).length)}
                {changeCard('Performance Evidence', prevPE.covered || 0, (currUnit.peResults || []).filter(r => r.status === 'COVERED').length, (currUnit.peResults || []).length)}
                {changeCard('Performance Criteria', prevPC.mapped || 0, allPCs.filter(r => r.status === 'MAPPED').length, allPCs.length)}
            </div>
            {rows.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#0d2444' }}>
                                {['Requirement', 'Previous', 'Current', 'Change'].map(h => (
                                    <th key={h} style={{ padding: '8px 10px', color: '#ffffff', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                                    <td style={{ padding: '7px 10px', color: '#374151', maxWidth: '280px' }}>{r.req}</td>
                                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap', ...statusStyle(r.prev) }}>{r.prev || 'No data'}</td>
                                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap', ...statusStyle(r.curr) }}>{r.curr}</td>
                                    <td style={{ padding: '7px 10px', textAlign: 'center' }}><ChangeArrow prev={r.prev} curr={r.curr} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <p style={{ color: '#9ca3af', fontSize: '11px', marginTop: '8px' }}>Previous evaluation: {prevDate}</p>
        </div>
    );
}

export default function ComparisonSection({ previous, currentResults }) {
    const prevUnits = previous.units || [];
    const prevUnitMap = new Map(prevUnits.map(u => [u.unitCode, u]));
    const currUnits = currentResults.units || [];

    return (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
            <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>Changes since previous evaluation</p>
            {currUnits.map(currUnit => {
                const prevUnit = prevUnitMap.get(currUnit.unitCode);
                if (!prevUnit) {
                    return (
                        <div key={currUnit.unitCode} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px 16px', marginBottom: '12px', backgroundColor: '#f9fafb' }}>
                            <p style={{ color: '#0d2444', fontSize: '13px', fontWeight: 600 }}>{currUnit.unitCode}</p>
                            <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>No previous data for this unit.</p>
                        </div>
                    );
                }
                return <UnitComparison key={currUnit.unitCode} prevUnit={prevUnit} currUnit={currUnit} />;
            })}
        </div>
    );
}