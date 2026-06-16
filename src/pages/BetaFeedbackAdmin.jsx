import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Star } from 'lucide-react';

const NAVY = '#0d2444';
const GOLD = '#c9a84c';
const TYPE_COLORS = {
    'Bug': { bg: '#fef2f2', color: '#dc2626' },
    'UX': { bg: '#eff6ff', color: '#2563eb' },
    'Feature Request': { bg: '#f0fdf4', color: '#16a34a' },
};

function StarDisplay({ rating }) {
    return (
        <span style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map(n => (
                <Star
                    key={n}
                    style={{ width: '13px', height: '13px', fill: n <= rating ? GOLD : 'none', color: n <= rating ? GOLD : '#d1d5db' }}
                />
            ))}
        </span>
    );
}

export default function BetaFeedbackAdmin() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('');
    const [filterPage, setFilterPage] = useState('');
    const [user, setUser] = useState(null);

    useEffect(() => {
        base44.auth.me().then(u => setUser(u)).catch(() => {});
        base44.entities.BetaFeedback.list('-created_date', 500).then(data => {
            setItems(data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    // Derived
    const allPages = [...new Set(items.map(i => i.page_path).filter(Boolean))].sort();
    const filtered = items.filter(i =>
        (!filterType || i.issue_type === filterType) &&
        (!filterPage || i.page_path === filterPage)
    );

    const totalCount = items.length;
    const avgRating = totalCount > 0 ? (items.reduce((s, i) => s + (i.rating || 0), 0) / totalCount).toFixed(1) : '—';
    const countByType = { Bug: 0, UX: 0, 'Feature Request': 0 };
    items.forEach(i => { if (i.issue_type) countByType[i.issue_type] = (countByType[i.issue_type] || 0) + 1; });

    if (user && user.role !== 'admin') {
        return <div style={{ padding: '40px', color: '#6b7280' }}>Access restricted to admins.</div>;
    }

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#f6f8fb' }}>
            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px' }}>
                {/* Header */}
                <div style={{ marginBottom: '28px' }}>
                    <h1 style={{ color: NAVY, fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Beta Feedback</h1>
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>All submissions from beta testers</p>
                </div>

                {/* Summary stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
                    {[
                        { label: 'Total', value: totalCount },
                        { label: 'Avg rating', value: avgRating },
                        { label: 'Bugs', value: countByType['Bug'] },
                        { label: 'UX issues', value: countByType['UX'] },
                        { label: 'Feature requests', value: countByType['Feature Request'] },
                    ].map(stat => (
                        <div key={stat.label} style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px 16px' }}>
                            <p style={{ color: '#6b7280', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{stat.label}</p>
                            <p style={{ color: NAVY, fontSize: '22px', fontWeight: 700 }}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        style={{ height: '36px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0 10px', fontSize: '13px', backgroundColor: '#fff', outline: 'none', cursor: 'pointer' }}
                    >
                        <option value="">All types</option>
                        {['Bug', 'UX', 'Feature Request'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select
                        value={filterPage}
                        onChange={e => setFilterPage(e.target.value)}
                        style={{ height: '36px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0 10px', fontSize: '13px', backgroundColor: '#fff', outline: 'none', cursor: 'pointer', maxWidth: '220px' }}
                    >
                        <option value="">All pages</option>
                        {allPages.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {(filterType || filterPage) && (
                        <button
                            onClick={() => { setFilterType(''); setFilterPage(''); }}
                            style={{ height: '36px', padding: '0 12px', background: 'none', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', color: '#6b7280', cursor: 'pointer' }}
                        >
                            Clear filters
                        </button>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#9ca3af', lineHeight: '36px' }}>
                        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Table */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>Loading…</div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>No feedback yet.</div>
                ) : (
                    <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                    {['Date', 'User', 'Page', 'Type', 'Rating', 'Comment'].map(h => (
                                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '12px', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((item, idx) => {
                                    const tc = TYPE_COLORS[item.issue_type] || { bg: '#f9fafb', color: '#374151' };
                                    const date = item.created_date ? new Date(item.created_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                                    return (
                                        <tr key={item.id || idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={{ padding: '10px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>{date}</td>
                                            <td style={{ padding: '10px 14px', color: NAVY, maxWidth: '160px' }}>
                                                <div style={{ fontWeight: 500 }}>{item.user_name || '—'}</div>
                                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>{item.user_email || ''}</div>
                                            </td>
                                            <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '11px', color: '#6b7280', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {item.page_path || '—'}
                                            </td>
                                            <td style={{ padding: '10px 14px' }}>
                                                <span style={{ backgroundColor: tc.bg, color: tc.color, borderRadius: '5px', padding: '2px 8px', fontWeight: 600, fontSize: '11px', whiteSpace: 'nowrap' }}>
                                                    {item.issue_type}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 14px' }}>
                                                <StarDisplay rating={item.rating || 0} />
                                            </td>
                                            <td style={{ padding: '10px 14px', color: '#374151', maxWidth: '260px' }}>
                                                <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {item.comment || <span style={{ color: '#d1d5db' }}>No comment</span>}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}