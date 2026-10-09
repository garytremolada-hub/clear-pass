import { useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';

const OUTPUT_OPTIONS = [
    { key: 'assessment', label: 'Assessment and student booklet' },
    { key: 'mapping', label: 'Competency mapping' },
    { key: 'validation', label: 'Validation record' },
];

const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px 10px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' };

export default function RegeneratePanel({ coverage, onRegenerate, running, progress, message, error }) {
    const [open, setOpen] = useState(false);
    const [overall, setOverall] = useState('');
    const [notes, setNotes] = useState({});
    const [outputs, setOutputs] = useState({ assessment: true, mapping: true, validation: true });

    if (!coverage || coverage.error || coverage.totalGaps === 0) return null;
    const gaps = coverage.units.flatMap(u => u.gaps);
    const anySelected = Object.values(outputs).some(Boolean);

    const submit = () => {
        const cleanNotes = Object.fromEntries(Object.entries(notes).filter(([, v]) => v.trim()));
        onRegenerate({ overall: overall.trim(), notes: cleanNotes, outputs });
    };

    return (
        <div style={{ border: '1px solid #c9a84c', backgroundColor: '#fefce8', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                    <p style={{ color: '#0d2444', fontSize: '14px', fontWeight: 600 }}>{gaps.length} requirement{gaps.length !== 1 ? 's' : ''} still need attention</p>
                    <p style={{ color: '#6b7280', fontSize: '12px' }}>Tell us what to add, then regenerate the assessment and documents.</p>
                </div>
                {!open && (
                    <button onClick={() => setOpen(true)} style={{ padding: '8px 14px', border: 'none', borderRadius: '6px', backgroundColor: '#c9a84c', color: '#0d2444', fontSize: '13px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                        Add input and regenerate
                    </button>
                )}
            </div>

            {open && (
                <div style={{ marginTop: '14px' }}>
                    <label style={{ color: '#0d2444', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Overall instructions (optional)</label>
                    <textarea value={overall} onChange={e => setOverall(e.target.value)} disabled={running} rows={3}
                        placeholder="e.g. Use a retail workplace scenario. Include a question on our complaint handling policy."
                        style={{ ...fieldStyle, resize: 'vertical', marginBottom: '14px' }} />

                    <p style={{ color: '#0d2444', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Notes for individual gaps (optional)</p>
                    <div style={{ maxHeight: '320px', overflowY: 'auto', marginBottom: '14px' }}>
                        {gaps.map(g => (
                            <div key={g.id} style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px', marginBottom: '8px' }}>
                                <p style={{ color: '#0d2444', fontSize: '12px', lineHeight: 1.5, marginBottom: '2px' }}><strong>{g.unitCode} {g.label}</strong> {g.requirement}</p>
                                {g.reason && <p style={{ color: '#92400e', fontSize: '11px', marginBottom: '6px' }}>Missing: {g.reason}</p>}
                                <input type="text" value={notes[g.id] || ''} disabled={running}
                                    onChange={e => setNotes(n => ({ ...n, [g.id]: e.target.value }))}
                                    placeholder="What should be added for this requirement?" style={fieldStyle} />
                            </div>
                        ))}
                    </div>

                    <p style={{ color: '#0d2444', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Regenerate</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '14px' }}>
                        {OUTPUT_OPTIONS.map(o => (
                            <label key={o.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#0d2444', cursor: 'pointer' }}>
                                <input type="checkbox" checked={outputs[o.key]} disabled={running} style={{ accentColor: '#c9a84c' }}
                                    onChange={e => setOutputs(s => ({ ...s, [o.key]: e.target.checked }))} />
                                {o.label}
                            </label>
                        ))}
                    </div>
                    {outputs.assessment && (!outputs.mapping || !outputs.validation) && (
                        <p style={{ color: '#92400e', fontSize: '11px', marginBottom: '10px' }}>Documents you leave unticked will not match the revised assessment.</p>
                    )}

                    {running ? (
                        <div>
                            <div style={{ width: '100%', height: '8px', borderRadius: '4px', backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${progress}%`, backgroundColor: '#c9a84c', transition: 'width 0.6s ease' }} />
                            </div>
                            <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> {message || 'Working...'}
                            </p>
                            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                        </div>
                    ) : (
                        <button onClick={submit} disabled={!anySelected}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', border: 'none', borderRadius: '6px', backgroundColor: anySelected ? '#c9a84c' : '#e5e7eb', color: anySelected ? '#0d2444' : '#9ca3af', fontSize: '13px', fontWeight: 600, cursor: anySelected ? 'pointer' : 'not-allowed' }}>
                            <RefreshCw style={{ width: '14px', height: '14px' }} /> Regenerate with my input
                        </button>
                    )}
                    {error && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '8px' }}>{error} Your previous results are unchanged.</p>}
                </div>
            )}
        </div>
    );
}