export default function CoverageBar({ label, covered, partial, notCovered, unevaluated = 0, total, coveredLabel, partialLabel, notLabel }) {
    if (total === 0) return null;
    const pct = (n) => parseFloat((n / total * 100).toFixed(1));
    const covPct = pct(covered);
    const parPct = pct(partial);
    const unevPct = pct(unevaluated);
    const notPct = Math.max(0, parseFloat((100 - covPct - parPct - unevPct).toFixed(1)));
    const summaryParts = [];
    if (covered > 0) summaryParts.push(`${covered} covered`);
    if (partial > 0) summaryParts.push(`${partial} partial`);
    if (notCovered > 0) summaryParts.push(`${notCovered} missing`);
    if (unevaluated > 0) summaryParts.push(`${unevaluated} not evaluated`);
    return (
        <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                <span style={{ color: '#0d2444', fontSize: '13px', fontWeight: 500 }}>{label}</span>
                <span style={{ color: '#6b7280', fontSize: '12px' }}>{summaryParts.join(' · ')}</span>
            </div>
            <div style={{ display: 'flex', height: '20px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#e5e7eb' }}>
                {covPct > 0 && <div style={{ width: `${covPct}%`, background: '#639922' }} title={`Covered: ${covPct}%`} />}
                {parPct > 0 && <div style={{ width: `${parPct}%`, background: '#BA7517' }} title={`Partial: ${parPct}%`} />}
                {notPct > 0 && notCovered > 0 && <div style={{ width: `${notPct}%`, background: '#A32D2D' }} title={`Not covered: ${notPct}%`} />}
                {unevPct > 0 && <div style={{ width: `${unevPct}%`, background: '#9ca3af' }} title={`Could not be evaluated: ${unevPct}%`} />}
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
                {covered > 0 && coveredLabel && <span style={{ fontSize: '11px', color: '#639922' }}>{coveredLabel}</span>}
                {partial > 0 && partialLabel && <span style={{ fontSize: '11px', color: '#BA7517' }}>{partialLabel}</span>}
                {notCovered > 0 && notLabel && <span style={{ fontSize: '11px', color: '#A32D2D' }}>{notLabel}</span>}
            </div>
        </div>
    );
}