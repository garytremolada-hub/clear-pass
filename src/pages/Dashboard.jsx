import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getBandForFkgl, BAND_CONFIG } from '@/lib/parseReadabilityResult';

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
                <span style={{ color: '#c9a84c', letterSpacing: '2px', fontSize: '13px', fontWeight: 500, marginRight: '24px' }}>
                    CLEARPASS
                </span>
                <h1 className="text-base font-medium" style={{ color: '#ffffff' }}>Dashboard</h1>
            </div>

            <div className="mx-auto px-6 py-10 space-y-10" style={{ maxWidth: '680px' }}>

                {/* Hero */}
                <div className="space-y-2">
                    <h2 style={{ color: '#0d2444', fontSize: '26px', fontWeight: 500, lineHeight: 1.3 }}>
                        Assessment readability tools
                    </h2>
                    <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.6 }}>
                        Check, rewrite, and build audit-ready assessments aligned to AQF levels.
                    </p>
                </div>

                {/* Band scale */}
                <div>
                    <p className="text-xs font-medium mb-2" style={{ color: '#374151' }}>Readability scale</p>
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

                {/* Task cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Level Check */}
                    <button
                        onClick={() => navigate('/level-check')}
                        className="text-left rounded-xl p-5 transition-shadow hover:shadow-md"
                        style={{ border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}
                    >
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#0d2444' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                            </svg>
                        </div>
                        <h3 className="text-sm font-medium mb-1" style={{ color: '#0d2444' }}>Level Check</h3>
                        <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>
                            Upload a document and instantly see where it sits on the readability scale. Rewrite to a different level in one click.
                        </p>
                    </button>

                    {/* Build */}
                    <button
                        onClick={() => navigate('/build')}
                        className="text-left rounded-xl p-5 transition-shadow hover:shadow-md"
                        style={{ border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}
                    >
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#0d2444' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                            </svg>
                        </div>
                        <h3 className="text-sm font-medium mb-1" style={{ color: '#0d2444' }}>Build Assessment</h3>
                        <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>
                            Upload a Unit of Competency and generate a complete, audit-ready assessment tailored to your learner cohort.
                        </p>
                    </button>
                </div>

                {/* Recent work */}
                <div>
                    <p className="text-xs font-medium mb-3" style={{ color: '#374151' }}>Recent work</p>
                    {loading ? (
                        <div className="flex items-center gap-2 py-4">
                            <div className="h-4 w-4 border-2 border-gray-200 border-t-[#c9a84c] rounded-full animate-spin" />
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>Loading…</span>
                        </div>
                    ) : recentItems.length === 0 ? (
                        <p style={{ fontSize: '13px', color: '#9ca3af' }}>No saved items yet. Results you save will appear here.</p>
                    ) : (
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
                                                {item.task_type} {band ? `· ${band.name}` : ''} {item.fkgl != null ? `· FKGL ${item.fkgl.toFixed(1)}` : ''}
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
                    )}
                </div>

            </div>
        </div>
    );
}