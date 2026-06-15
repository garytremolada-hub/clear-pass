import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

export default function ThumbsRating({ flow, unitCode, context }) {
    const [voted, setVoted] = useState(null); // 'up' | 'down'
    const [showComment, setShowComment] = useState(false);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleVote = async (vote) => {
        setVoted(vote);
        setShowComment(vote === 'down');
        if (vote === 'up') {
            try {
                await base44.entities.FeedbackSubmission.create({
                    flow,
                    unit_code: unitCode || '',
                    category: context || 'Quick rating',
                    rating: 'Good',
                    comments: '👍',
                    submitted_at: new Date().toLocaleDateString('en-AU'),
                });
            } catch (_) {
                // non-blocking — still show thank you
            }
            setSubmitted(true);
        }
    };

    const handleSubmitComment = async () => {
        try {
            await base44.entities.FeedbackSubmission.create({
                flow,
                unit_code: unitCode || '',
                category: context || 'Quick rating',
                rating: 'Poor',
                comments: comment || '👎',
                submitted_at: new Date().toLocaleDateString('en-AU'),
            });
        } catch (_) {
            // non-blocking — still show thank you
        }
        setSubmitted(true);
        setShowComment(false);
    };

    if (submitted) {
        return (
            <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '12px', margin: '8px 0' }}>
                Thanks for your feedback!
            </p>
        );
    }

    return (
        <div style={{ textAlign: 'center', margin: '8px 0' }}>
            {!voted && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>Was this result helpful?</span>
                    <button
                        onClick={() => handleVote('up')}
                        style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280', fontSize: '12px' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.color = '#22c55e'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; }}
                    >
                        <ThumbsUp style={{ width: '13px', height: '13px' }} /> Yes
                    </button>
                    <button
                        onClick={() => handleVote('down')}
                        style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280', fontSize: '12px' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; }}
                    >
                        <ThumbsDown style={{ width: '13px', height: '13px' }} /> No
                    </button>
                </div>
            )}

            {showComment && (
                <div style={{ marginTop: '10px', maxWidth: '360px', margin: '10px auto 0' }}>
                    <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="What could be improved? (optional)"
                        rows={2}
                        style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '6px' }}>
                        <button
                            onClick={handleSubmitComment}
                            style={{ padding: '5px 14px', backgroundColor: '#0d2444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                        >
                            Send
                        </button>
                        <button
                            onClick={() => { setShowComment(false); setVoted(null); }}
                            style={{ padding: '5px 14px', background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', color: '#6b7280', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}