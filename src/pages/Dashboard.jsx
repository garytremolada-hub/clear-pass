import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getBandForFkgl, BAND_CONFIG } from '@/lib/parseReadabilityResult';

const TRUST_ITEMS = [
    { icon: '✓', text: 'All UoC requirements covered' },
    { icon: '✓', text: 'Written to your learners reading level' },
    { icon: '✓', text: 'Downloads as Word document' },
];

export default function Dashboard() {
    const navigate = useNavigate();
    const [recentItems, setRecentItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        base44.entities.WorkLibraryItem.list('-created_date', 5)
            .then(items => setRecentItems(items || []))
            .catch(() => setRecentItems([]))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            {/* Header */}
            <div className="flex items-center px-6 py-4" style={{ backgroundColor: '#0d2444', borderBottom: '1px solid #162d50' }}>
                <span style={{ color: '#c9a84c', letterSpacing: '2px', fontSize: '13px', fontWeight: 500 }}>
                    ASSESSMENT COMPLIANCE TOOL
                </span>
            </div>

            <div className="mx-auto px-8 py-12 space-y-10" style={{ maxWidth: '900px' }}>

                {/* Hero */}
                <div className="space-y-4">
                    <h1 style={{ color: '#0d2444', fontSize: '32px', fontWeight: 600, lineHeight: 1.25 }}>
                        Compliant assessments, written for your learners
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: 1.7 }}>
                        Search for a unit, tell us who your learners are, and get a complete audit-ready assessment instrument in about three minutes.
                    </p>

                    {/* Trust indicators */}
                    <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
                        {TRUST_ITEMS.map(item => (
                            <div key={item.text} className="flex items-center gap-2">
                                <span style={{ color: '#c9a84c', fontWeight: 700, fontSize: '14px' }}>{item.icon}</span>
                                <span style={{ color: '#6b7280', fontSize: '13px' }}>{item.text}</span>
                            </div>
                        ))}
                    </div>

                    {/* Tool cards — Build leads as primary action */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '8px' }}>
                        {[
                            {
                                path: '/build',
                                icon: '✏️',
                                title: 'Build Assessment',
                                desc: 'Generate a complete, compliant assessment from any unit code',
                                primary: true,
                            },
                            {
                                path: '/level-check',
                                icon: '📐',
                                title: 'Level Check',
                                desc: 'Upload a document and see if the reading level fits your cohort',
                                primary: false,
                            },
                            {
                                path: '/evaluate',
                                icon: '✅',
                                title: 'Evaluate',
                                desc: 'Audit an existing assessment for coverage gaps',
                                primary: false,
                            },
                        ].map(tool => (
                            <button
                                key={tool.path}
                                onClick={() => navigate(tool.path)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    gap: '10px',
                                    padding: '24px 20px',
                                    backgroundColor: '#0d2444',
                                    border: tool.primary ? '2px solid #c9a84c' : '2px solid #0d2444',
                                    borderRadius: '14px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'background-color 0.15s, box-shadow 0.15s, transform 0.1s',
                                    boxShadow: tool.primary ? '0 4px 14px rgba(201,168,76,0.25)' : '0 4px 14px rgba(13,36,68,0.18)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#162d50'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(13,36,68,0.25)'; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0d2444'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = tool.primary ? '0 4px 14px rgba(201,168,76,0.25)' : '0 4px 14px rgba(13,36,68,0.18)'; }}
                            >
                                <span style={{ fontSize: '28px' }}>{tool.icon}</span>
                                <span style={{ color: '#c9a84c', fontSize: '15px', fontWeight: 700 }}>{tool.title}</span>
                                <span style={{ color: '#8ba4c4', fontSize: '12px', lineHeight: 1.5 }}>{tool.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Readability scale */}
                <div>
                    <p className="text-xs font-medium mb-2" style={{ color: '#374151' }}>Readability scale: your assessment will be written to the right level for your learners</p>
                    <div className="flex rounded-lg overflow-hidden h-3 w-full">
                        {BAND_CONFIG.map(b => (
                            <div key={b.name} className="flex-1" style={{ backgroundColor: b.color }} title={b.name} />
                        ))}
                    </div>
                    <div className="flex w-full mt-1">
                        {BAND_CONFIG.map(b => (
                            <div key={b.name} className="flex-1 text-center" style={{ fontSize: '9px', color: '#6b7280' }}>
                                {b.name.split(' ·')[0]}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent work — only shown when there are items */}
                {!loading && recentItems.length > 0 && (
                    <div>
                        <p className="text-xs font-medium mb-3" style={{ color: '#374151' }}>Recent work</p>
                        <div className="space-y-2">
                            {recentItems.map(item => {
                                const band = getBandForFkgl(item.fkgl);
                                return (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between px-4 py-3 rounded-lg"
                                        style={{ border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate" style={{ color: '#0d2444' }}>{item.title}</p>
                                            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                                                {item.task_type}{band ? ` · ${band.name}` : ''}
                                            </p>
                                        </div>
                                        {band && (
                                            <div
                                                className="ml-3 px-2 py-0.5 rounded text-xs font-medium flex-shrink-0"
                                                style={{ backgroundColor: band.color, color: '#0d2444' }}
                                            >
                                                {band.name.split(' ·')[0]}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <button
                                onClick={() => navigate('/library')}
                                style={{ fontSize: '12px', color: '#c9a84c', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
                            >
                                View all in library →
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}