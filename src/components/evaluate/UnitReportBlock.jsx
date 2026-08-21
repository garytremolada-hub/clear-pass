import { CheckCircle } from 'lucide-react';
import CoverageBar from './CoverageBar';
import GapCard from './GapCard';

export default function UnitReportBlock({ unit }) {
    const { unitCode, unitTitle, peResults = [], keResults = [], elementsResults = [], gaps = [], unitVerdict = 'REQUIRES DEVELOPMENT' } = unit;
    const isAdequate = unitVerdict === 'ADEQUATE';

    const peCovered = peResults.filter(r => r.status === 'COVERED').length;
    const pePartial = peResults.filter(r => r.status === 'PARTIALLY COVERED').length;
    const peNotCovered = peResults.filter(r => r.status !== 'COVERED' && r.status !== 'PARTIALLY COVERED').length;
    const keCovered = keResults.filter(r => r.status === 'COVERED').length;
    const kePartial = keResults.filter(r => r.status === 'PARTIALLY COVERED').length;
    const keNotCovered = keResults.filter(r => r.status !== 'COVERED' && r.status !== 'PARTIALLY COVERED').length;
    const allPCs = elementsResults.flatMap(e => e.performanceCriteria || []);
    const pcMapped = allPCs.filter(pc => pc.status === 'MAPPED').length;
    const pcPartial = allPCs.filter(pc => pc.status === 'PARTIALLY MAPPED').length;
    const pcNotMapped = allPCs.filter(pc => pc.status !== 'MAPPED' && pc.status !== 'PARTIALLY MAPPED').length;

    const peRefs = (items, status) => items.filter(r => r.status === status).map((r, i) => `PE${i + 1}`).join(', ');
    const keRefs = (items, status) => items.filter(r => r.status === status).map((r, i) => `KE${i + 1}`).join(', ');
    const pcRefs = (pcs, status) => pcs.filter(pc => pc.status === status).map(pc => pc.ref).join(', ');

    return (
        <div style={{ marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#0d2444', borderRadius: '8px 8px 0 0', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <p style={{ color: '#c9a84c', fontSize: '15px', fontWeight: 600 }}>{unitCode}</p>
                    <p style={{ color: '#ffffff', fontSize: '12px', opacity: 0.8 }}>{unitTitle}</p>
                </div>
                <span style={{
                    padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                    backgroundColor: isAdequate ? '#639922' : '#BA7517', color: '#ffffff',
                }}>
                    {unitVerdict}
                </span>
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '20px' }}>
                <CoverageBar
                    label="Performance Evidence"
                    covered={peCovered} partial={pePartial} notCovered={peNotCovered} total={peResults.length}
                    coveredLabel={peRefs(peResults, 'COVERED') ? `Covered: ${peRefs(peResults, 'COVERED')}` : null}
                    partialLabel={peRefs(peResults, 'PARTIALLY COVERED') ? `Partial: ${peRefs(peResults, 'PARTIALLY COVERED')}` : null}
                    notLabel={peRefs(peResults, 'NOT COVERED') ? `Missing: ${peRefs(peResults, 'NOT COVERED')}` : null}
                />
                <CoverageBar
                    label="Knowledge Evidence"
                    covered={keCovered} partial={kePartial} notCovered={keNotCovered} total={keResults.length}
                    coveredLabel={keRefs(keResults, 'COVERED') ? `Covered: ${keRefs(keResults, 'COVERED')}` : null}
                    partialLabel={keRefs(keResults, 'PARTIALLY COVERED') ? `Partial: ${keRefs(keResults, 'PARTIALLY COVERED')}` : null}
                    notLabel={keRefs(keResults, 'NOT COVERED') ? `Missing: ${keRefs(keResults, 'NOT COVERED')}` : null}
                />
                <CoverageBar
                    label="Performance Criteria"
                    covered={pcMapped} partial={pcPartial} notCovered={pcNotMapped} total={allPCs.length}
                    coveredLabel={pcRefs(allPCs, 'MAPPED') ? `Mapped: ${pcRefs(allPCs, 'MAPPED').split(', ').slice(0, 6).join(', ')}${allPCs.filter(p => p.status === 'MAPPED').length > 6 ? '...' : ''}` : null}
                    partialLabel={pcRefs(allPCs, 'PARTIALLY MAPPED') ? `Partial: ${pcRefs(allPCs, 'PARTIALLY MAPPED')}` : null}
                    notLabel={pcRefs(allPCs, 'NOT MAPPED') ? `Missing: ${pcRefs(allPCs, 'NOT MAPPED')}` : null}
                />

                {gaps.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                        <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>Gaps to fix</p>
                        {gaps.map((g, i) => <GapCard key={i} gap={g} />)}
                    </div>
                )}
                {gaps.length === 0 && (
                    <div style={{ border: '1px solid #639922', borderRadius: '8px', padding: '14px 16px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CheckCircle style={{ color: '#639922', width: '18px', height: '18px', flexShrink: 0 }} />
                        <p style={{ color: '#3B6D11', fontSize: '13px', fontWeight: 500 }}>No gaps identified for this unit.</p>
                    </div>
                )}
            </div>
        </div>
    );
}