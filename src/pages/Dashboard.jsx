import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getBandForFkgl, BAND_CONFIG } from '@/lib/parseReadabilityResult';

const TRUST_ITEMS = [
    { icon: '✓', text: 'Mapped to AQF levels 1–10' },
    { icon: '✓', text: 'Every requirement covered' },
    { icon: '✓', text: 'Exports as Word document' },
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

            <div className="mx-auto px-6 py-12 space-y-10" style={{ maxWidth: '600px' }}>

                {/* Hero */}
                <div className="space-y-4">
                    <h1 style={{ color: '#0d2444', fontSize: '32px', fontWeight: 600, lineHeight: 1.25 }}>
                        Build audit-ready assessments in minutes
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: 1.7 }}>
                        Upload your Unit of Competency and we'll generate a complete, compliant assessment instrument — tailored to your learner cohort and reading level.
                    </p>

                    {/* CTA button */}
                    <button
                        onClick={() => navigate('/build')}
                        style={{
                            marginTop: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '14px 28px',
                            backgroundColor: '#c9a84c',
                            color: '#0d2444',
                            borderRadius: '10px',
                            border: 'none',
                            fontSize: '15px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Upload your UoC and get started →
                    </button>
                </div>

                {/* Readability scale */}
                <div>
                    <p className="text-xs font-medium mb-2" style={{ color: '#374151' }}>Readability scale — your assessment will be written to the right level for your learners</p>
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

                {/* Trust indicators */}
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {TRUST_ITEMS.map(item => (
                        <div key={item.text} className="flex items-center gap-2">
                            <span style={{ color: '#c9a84c', fontWeight: 700, fontSize: '14px' }}>{item.icon}</span>
                            <span style={{ color: '#6b7280', fontSize: '13px' }}>{item.text}</span>
                        </div>
                    ))}
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
                                                {item.task_type}{band ? ` · ${band.name}` : ''}{item.fkgl != null ? ` · FKGL ${item.fkgl.toFixed(1)}` : ''}
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