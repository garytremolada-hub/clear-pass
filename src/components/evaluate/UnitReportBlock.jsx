import { CheckCircle } from 'lucide-react';
import CoverageBar from './CoverageBar';
import GapCard from './GapCard';
import RequirementTrace from './RequirementTrace';
import { flattenRequirements, countKinds } from '@/lib/evaluateTrace';

const VERDICT_COLOR = { ADEQUATE: '#639922', 'REQUIRES DEVELOPMENT': '#BA7517', 'AUDIT INCOMPLETE': '#6b7280' };

export default function UnitReportBlock({ unit }) {
    const { unitCode, unitTitle, releaseNumber, gaps = [], unitVerdict = 'REQUIRES DEVELOPMENT' } = unit;
    const groups = flattenRequirements(unit);
    const labels = (items, kind) => items.filter(i => i.kind === kind).map(i => i.label.replace(/^PC /, '')).join(', ');

    return (
        <div style={{ marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#0d2444', borderRadius: '8px 8px 0 0', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <p style={{ color: '#c9a84c', fontSize: '15px', fontWeight: 600 }}>{unitCode}{releaseNumber ? ` · release ${releaseNumber}` : ''}</p>
                    <p style={{ color: '#ffffff', fontSize: '12px', opacity: 0.8 }}>{unitTitle}</p>
                </div>
                <span style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, backgroundColor: VERDICT_COLOR[unitVerdict] || '#BA7517', color: '#ffffff' }}>
                    {unitVerdict}
                </span>
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '20px' }}>
                {groups.map(g => {
                    const c = countKinds(g.items);
                    return (
                        <CoverageBar
                            key={g.title}
                            label={g.title}
                            covered={c.covered} partial={c.partial} notCovered={c.missing} unevaluated={c.unevaluated} total={g.items.length}
                            coveredLabel={`Covered: ${labels(g.items, 'covered')}`}
                            partialLabel={`Partial: ${labels(g.items, 'partial')}`}
                            notLabel={`Missing: ${labels(g.items, 'missing')}`}
                        />
                    );
                })}

                {gaps.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                        <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Gaps to fix</p>
                        <p style={{ color: '#9ca3af', fontSize: '11px', fontStyle: 'italic', marginBottom: '12px' }}>Requirement text comes from training.gov.au. Recommendations and examples are AI suggestions, not official requirements.</p>
                        {gaps.map((g, i) => <GapCard key={i} gap={g} />)}
                    </div>
                )}
                {gaps.length === 0 && (
                    <div style={{ border: '1px solid #639922', borderRadius: '8px', padding: '14px 16px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CheckCircle style={{ color: '#639922', width: '18px', height: '18px', flexShrink: 0 }} />
                        <p style={{ color: '#3B6D11', fontSize: '13px', fontWeight: 500 }}>No gaps identified for this unit.</p>
                    </div>
                )}

                <RequirementTrace groups={groups} />
            </div>
        </div>
    );
}