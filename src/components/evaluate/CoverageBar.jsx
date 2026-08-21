export default function CoverageBar({ label, covered, partial, notCovered, total, coveredLabel, partialLabel, notLabel }) {
    if (total === 0) return null;
    const covPct = parseFloat((covered / total * 100).toFixed(1));
    const parPct = parseFloat((partial / total * 100).toFixed(1));
    const notPct = parseFloat((100 - covPct - parPct).toFixed(1));
    const summaryParts = [];
    if (covered > 0) summaryParts.push(`${covered} covered`);
    if (partial > 0) summaryParts.push(`${partial} partial`);
    if (notCovered > 0) summaryParts.push(`${notCovered} missing`);
    return (
        <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                <span style={{ color: '#0d2444', fontSize: '13px', fontWeight: 500 }}>{label}</span>
                <span style={{ color: '#6b7280', fontSize: '12px' }}>{summaryParts.join(' · ')}</span>
            </div>
            <div style={{ display: 'flex', height: '20px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#e5e7eb' }}>
                {covPct > 0 && <div style={{ width: `${covPct}%`, background: '#639922' }} title={`Covered: ${covPct}%`} />}
                {parPct > 0 && <div style={{ width: `${parPct}%`, background: '#BA7517' }} title={`Partial: ${parPct}%`} />}
                {notPct > 0 && <div style={{ width: `${notPct}%`, background: '#A32D2D' }} title={`Not covered: ${notPct}%`} />}
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
                {covered > 0 && coveredLabel && <span style={{ fontSize: '11px', color: '#639922' }}>{coveredLabel}</span>}
                {partial > 0 && partialLabel && <span style={{ fontSize: '11px', color: '#BA7517' }}>{partialLabel}</span>}
                {notCovered > 0 && notLabel && <span style={{ fontSize: '11px', color: '#A32D2D' }}>{notLabel}</span>}
            </div>
        </div>
    );
}