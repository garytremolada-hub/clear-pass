import { Info } from 'lucide-react';

export default function AuditNotes({ diagnostics }) {
    const warnings = [...(diagnostics?.extraction || []), ...(diagnostics?.audit || [])];
    const notes = diagnostics?.notes || [];
    if (warnings.length === 0 && notes.length === 0) return null;
    return (
        <div style={{ border: `1px solid ${warnings.length ? '#f59e0b' : '#e5e7eb'}`, backgroundColor: warnings.length ? '#fffbeb' : '#f9fafb', borderRadius: '8px', padding: '14px 16px', marginBottom: '24px' }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0d2444', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                <Info style={{ width: '15px', height: '15px' }} /> Audit notes and limitations
            </p>
            <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {warnings.map((w, i) => <li key={`w${i}`} style={{ color: '#92400e', fontSize: '12px', lineHeight: 1.6 }}>{w}</li>)}
                {notes.map((n, i) => <li key={`n${i}`} style={{ color: '#6b7280', fontSize: '12px', lineHeight: 1.6 }}>{n}</li>)}
            </ul>
            <p style={{ color: '#9ca3af', fontSize: '11px', marginTop: '6px' }}>
                Results are checked against the text read from your document. Suggested changes are AI suggestions, not official requirements.
            </p>
        </div>
    );
}