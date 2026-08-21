import { XCircle, TriangleAlert, Info } from 'lucide-react';

export default function GapCard({ gap }) {
    const type = (gap.gapType || '').toUpperCase();
    const isNotCovered = type === 'NOT COVERED' || type === 'NOT MAPPED';
    const isPartial = type === 'PARTIALLY COVERED' || type === 'PARTIALLY MAPPED';
    const borderColor = isNotCovered ? '#A32D2D' : isPartial ? '#BA7517' : '#9ca3af';
    const bgColor = isNotCovered ? '#FCEBEB' : isPartial ? '#FAEEDA' : '#f9fafb';
    const IconComp = isNotCovered ? XCircle : isPartial ? TriangleAlert : Info;
    const iconColor = isNotCovered ? '#A32D2D' : isPartial ? '#BA7517' : '#6b7280';
    return (
        <div style={{ borderLeft: `3px solid ${borderColor}`, backgroundColor: bgColor, borderRadius: '6px', padding: '12px 14px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <IconComp style={{ color: iconColor, width: '16px', height: '16px', flexShrink: 0, marginTop: '1px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    {gap.unitCode && (
                        <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '3px' }}>
                            {gap.unitCode}
                        </p>
                    )}
                    <p style={{ color: '#0d2444', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{gap.requirement}</p>
                    <p style={{ color: '#374151', fontSize: '13px', lineHeight: 1.5 }}>{gap.recommendation}</p>
                    {gap.exampleContent && (
                        <details style={{ marginTop: '8px' }}>
                            <summary style={{ fontSize: '12px', color: '#185FA5', cursor: 'pointer', fontWeight: 500 }}>
                                Show example question or activity
                            </summary>
                            <div style={{
                                marginTop: '8px', padding: '12px',
                                background: '#EFF6FF', borderLeft: '3px solid #185FA5',
                                borderRadius: '4px', fontSize: '13px', whiteSpace: 'pre-wrap',
                                color: '#1e3a5f', lineHeight: 1.6, fontFamily: 'var(--font-mono)',
                            }}>
                                {gap.exampleContent}
                            </div>
                        </details>
                    )}
                </div>
            </div>
        </div>
    );
}