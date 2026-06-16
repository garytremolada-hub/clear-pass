import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { MessageSquarePlus, Star, X, CheckCircle } from 'lucide-react';

const ISSUE_TYPES = ['Bug', 'UX', 'Feature Request'];
const NAVY = '#0d2444';
const GOLD = '#c9a84c';

export default function BetaFeedbackWidget() {
    const [open, setOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [issueType, setIssueType] = useState('');
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [user, setUser] = useState(null);
    const location = useLocation();

    useEffect(() => {
        base44.auth.me().then(u => setUser(u)).catch(() => {});
    }, []);

    const reset = () => {
        setRating(0);
        setHoverRating(0);
        setIssueType('');
        setComment('');
        setSuccess(false);
    };

    const handleOpen = () => { reset(); setOpen(true); };
    const handleClose = () => { setOpen(false); reset(); };

    const handleSubmit = async () => {
        if (!rating || !issueType) return;
        setSubmitting(true);
        try {
            await base44.entities.BetaFeedback.create({
                rating,
                issue_type: issueType,
                comment: comment.trim() || '',
                page_path: location.pathname,
                user_name: user?.full_name || '',
                user_email: user?.email || '',
            });
            setSuccess(true);
            setTimeout(() => { setOpen(false); reset(); }, 2000);
        } catch (_) {
            setSuccess(true); // still show thank you
            setTimeout(() => { setOpen(false); reset(); }, 2000);
        } finally {
            setSubmitting(false);
        }
    };

    const displayRating = hoverRating || rating;

    return (
        <>
            {/* Floating button */}
            <button
                onClick={handleOpen}
                title="Give beta feedback"
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    zIndex: 9000,
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: NAVY,
                    border: `2px solid ${GOLD}`,
                    color: GOLD,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(13,36,68,0.25)',
                    transition: 'transform 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
                <MessageSquarePlus style={{ width: '20px', height: '20px' }} />
            </button>

            {/* Modal overlay */}
            {open && (
                <div
                    style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 9100, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: '80px 24px 24px' }}
                    onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
                >
                    <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '360px', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', position: 'relative' }}>
                        {/* Close */}
                        <button
                            onClick={handleClose}
                            style={{ position: 'absolute', top: '14px', right: '14px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}
                        >
                            <X style={{ width: '16px', height: '16px' }} />
                        </button>

                        {success ? (
                            <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                <CheckCircle style={{ color: '#22c55e', width: '40px', height: '40px', margin: '0 auto 12px' }} />
                                <p style={{ color: NAVY, fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>Thanks for the feedback!</p>
                                <p style={{ color: '#6b7280', fontSize: '13px' }}>It helps us improve Clearpass.</p>
                            </div>
                        ) : (
                            <>
                                <p style={{ color: NAVY, fontWeight: 700, fontSize: '16px', marginBottom: '2px' }}>Beta feedback</p>
                                <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '20px' }}>
                                    Page: <span style={{ fontFamily: 'monospace' }}>{location.pathname}</span>
                                </p>

                                {/* Star rating */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: NAVY, marginBottom: '8px' }}>
                                        Overall rating <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <button
                                                key={n}
                                                onClick={() => setRating(n)}
                                                onMouseEnter={() => setHoverRating(n)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                                            >
                                                <Star
                                                    style={{
                                                        width: '26px', height: '26px',
                                                        fill: n <= displayRating ? GOLD : 'none',
                                                        color: n <= displayRating ? GOLD : '#d1d5db',
                                                        transition: 'all 0.1s',
                                                    }}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Issue type */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: NAVY, marginBottom: '8px' }}>
                                        Type <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {ISSUE_TYPES.map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setIssueType(t)}
                                                style={{
                                                    flex: 1,
                                                    padding: '7px 4px',
                                                    borderRadius: '6px',
                                                    border: `1px solid ${issueType === t ? NAVY : '#e5e7eb'}`,
                                                    backgroundColor: issueType === t ? NAVY : '#fff',
                                                    color: issueType === t ? '#fff' : '#374151',
                                                    fontSize: '12px',
                                                    fontWeight: issueType === t ? 600 : 400,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Comment */}
                                <div style={{ marginBottom: '18px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: NAVY, marginBottom: '6px' }}>
                                        Comment <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
                                    </label>
                                    <textarea
                                        value={comment}
                                        onChange={e => setComment(e.target.value.slice(0, 800))}
                                        placeholder="What happened? What did you expect?"
                                        rows={3}
                                        style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                        onFocus={e => e.target.style.borderColor = GOLD}
                                        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                                    />
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={!rating || !issueType || submitting}
                                    style={{
                                        width: '100%',
                                        height: '40px',
                                        backgroundColor: (!rating || !issueType || submitting) ? '#e5e7eb' : GOLD,
                                        color: (!rating || !issueType || submitting) ? '#9ca3af' : NAVY,
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: (!rating || !issueType || submitting) ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {submitting ? 'Sending…' : 'Send feedback'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}