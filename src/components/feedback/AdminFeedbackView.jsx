import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const CATEGORIES = ['Accuracy of results', 'Ease of use', 'Quality of output documents', 'Missing features', 'Other'];
const FLOWS = ['Build', 'Evaluate', 'Level Check'];
const RATINGS = ['Poor', 'Fair', 'Good', 'Excellent'];

const RATING_BG = {
    Poor:      '#FECACA',
    Fair:      '#FEF3C7',
    Good:      '#EAF3DE',
    Excellent: '#D1FAE5',
};

export default function AdminFeedbackView() {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterFlow, setFilterFlow] = useState('All');
    const [filterRating, setFilterRating] = useState('All');
    const [filterCategory, setFilterCategory] = useState('All');

    useEffect(() => {
        base44.entities.FeedbackSubmission.list('-created_date', 200)
            .then(data => setSubmissions(data || []))
            .catch(() => setSubmissions([]))
            .finally(() => setLoading(false));
    }, []);

    const filtered = submissions.filter(s => {
        if (filterFlow !== 'All' && s.flow !== filterFlow) return false;
        if (filterRating !== 'All' && s.rating !== filterRating) return false;
        if (filterCategory !== 'All' && s.category !== filterCategory) return false;
        return true;
    });

    const selectStyle = {
        height: '32px', border: '1px solid #e5e7eb', borderRadius: '6px',
        padding: '0 8px', fontSize: '12px', backgroundColor: '#fff', cursor: 'pointer', outline: 'none',
    };

    return (
        <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="font-semibold text-[#1e3a5f] mb-4">Feedback submissions</h2>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
                <select style={selectStyle} value={filterFlow} onChange={e => setFilterFlow(e.target.value)}>
                    <option value="All">All flows</option>
                    {FLOWS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <select style={selectStyle} value={filterRating} onChange={e => setFilterRating(e.target.value)}>
                    <option value="All">All ratings</option>
                    {RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select style={selectStyle} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                    <option value="All">All categories</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '4px' }}>
                    {filtered.length} submission{filtered.length !== 1 ? 's' : ''}
                </span>
            </div>

            {loading ? (
                <p style={{ color: '#9ca3af', fontSize: '13px' }}>Loading...</p>
            ) : filtered.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '13px' }}>No feedback submissions yet.</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#0d2444', color: '#fff' }}>
                                {['Date', 'Flow', 'Unit code', 'Category', 'Rating', 'Comments'].map(h => (
                                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((s, i) => (
                                <tr key={s.id || i} style={{ backgroundColor: RATING_BG[s.rating] || '#fff' }}>
                                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{s.submitted_at || '—'}</td>
                                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{s.flow}</td>
                                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{s.unit_code || '—'}</td>
                                    <td style={{ padding: '8px 10px', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{s.category}</td>
                                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', fontWeight: 600, color: '#0d2444', borderBottom: '1px solid #e5e7eb' }}>{s.rating}</td>
                                    <td style={{ padding: '8px 10px', color: '#374151', maxWidth: '260px', borderBottom: '1px solid #e5e7eb', lineHeight: 1.4 }}>{s.comments || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}