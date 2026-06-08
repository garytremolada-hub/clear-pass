import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle } from 'lucide-react';

const CATEGORIES = [
    'Accuracy of results',
    'Ease of use',
    'Quality of output documents',
    'Missing features',
    'Other',
];

const RATINGS = ['Poor', 'Fair', 'Good', 'Excellent'];

const NAVY = '#0D2444';
const GOLD = '#C9A84C';

export default function FeedbackModal({ flow, unitCode, onClose }) {
    const [category, setCategory] = useState('');
    const [rating, setRating] = useState('');
    const [comments, setComments] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    // Auto-close after success
    useEffect(() => {
        if (success) {
            const t = setTimeout(onClose, 2000);
            return () => clearTimeout(t);
        }
    }, [success, onClose]);

    const handleSubmit = async () => {
        if (!category || !rating) return;
        setSubmitting(true);
        setError('');
        const now = new Date();
        const submittedAt = now.toLocaleDateString('en-AU', {
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
        try {
            await base44.entities.FeedbackSubmission.create({
                flow,
                unit_code: unitCode || '',
                category,
                rating,
                comments,
                submitted_at: submittedAt,
            });

            // Send email via SendEmail integration if feedbackEmail is set
            try {
                const users = await base44.entities.User.list();
                const admin = users.find(u => u.role === 'admin');
                const feedbackEmail = admin?.feedbackEmail;
                if (feedbackEmail) {
                    await base44.integrations.Core.SendEmail({
                        to: feedbackEmail,
                        subject: `Clearpass feedback: ${category} | ${rating} | ${flow}`,
                        body: `New feedback received in Clearpass\n\nFlow: ${flow}\nUnit code: ${unitCode || 'not recorded'}\nCategory: ${category}\nRating: ${rating}\nSubmitted: ${submittedAt}\n\nComments:\n${comments || 'No comments provided'}\n\n---\nThis feedback is private. No other user can see it.\nSent from Clearpass.`,
                    });
                }
            } catch (_) {
                // Email failure is non-blocking
            }

            setSuccess(true);
        } catch (err) {
            setError('Could not send feedback. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '460px', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                {success ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <CheckCircle style={{ color: '#22c55e', width: '48px', height: '48px', margin: '0 auto 16px' }} />
                        <p style={{ color: NAVY, fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Thank you</p>
                        <p style={{ color: '#6b7280', fontSize: '14px' }}>Your feedback has been received.</p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <p style={{ color: NAVY, fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>How did this go?</p>
                        <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '24px', lineHeight: 1.5 }}>
                            Your feedback goes directly to the Clearpass team. No other user can see it.
                        </p>

                        {/* Field 1: Category */}
                        <div style={{ marginBottom: '18px' }}>
                            <label style={{ display: 'block', color: NAVY, fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                                What is your feedback about? <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                style={{ width: '100%', height: '40px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0 10px', fontSize: '14px', backgroundColor: '#fff', outline: 'none', cursor: 'pointer' }}
                            >
                                <option value="" disabled>Select a category...</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {/* Field 2: Rating */}
                        <div style={{ marginBottom: '18px' }}>
                            <label style={{ display: 'block', color: NAVY, fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                                How would you rate this result? <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {RATINGS.map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setRating(r)}
                                        style={{
                                            flex: 1,
                                            padding: '8px 4px',
                                            borderRadius: '6px',
                                            border: `1px solid ${rating === r ? NAVY : '#d1d5db'}`,
                                            backgroundColor: rating === r ? NAVY : '#fff',
                                            color: rating === r ? '#fff' : '#374151',
                                            fontSize: '13px',
                                            fontWeight: rating === r ? 600 : 400,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Field 3: Comments */}
                        <div style={{ marginBottom: '22px' }}>
                            <label style={{ display: 'block', color: NAVY, fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                                Tell us more <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
                            </label>
                            <textarea
                                value={comments}
                                onChange={e => setComments(e.target.value.slice(0, 1000))}
                                rows={4}
                                placeholder="What worked well? What needs improving? What were you trying to do?"
                                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5 }}
                            />
                            <p style={{ color: '#9ca3af', fontSize: '11px', textAlign: 'right', margin: '2px 0 0' }}>{comments.length}/1000</p>
                        </div>

                        {/* Error */}
                        {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

                        {/* Submit */}
                        <button
                            onClick={handleSubmit}
                            disabled={!category || !rating || submitting}
                            style={{
                                width: '100%',
                                height: '44px',
                                backgroundColor: (!category || !rating || submitting) ? '#e5e7eb' : GOLD,
                                color: (!category || !rating || submitting) ? '#9ca3af' : NAVY,
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: (!category || !rating || submitting) ? 'not-allowed' : 'pointer',
                                marginBottom: '12px',
                            }}
                        >
                            {submitting ? 'Sending...' : 'Send feedback'}
                        </button>

                        {/* Cancel */}
                        <div style={{ textAlign: 'center' }}>
                            <button
                                onClick={onClose}
                                style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}