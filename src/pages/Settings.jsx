import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import AdminFeedbackView from '@/components/feedback/AdminFeedbackView';

export default function Settings() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [feedbackEmail, setFeedbackEmail] = useState('');
    const [emailSaved, setEmailSaved] = useState(false);

    useEffect(() => {
        base44.auth.me().then(u => {
            setUser(u);
            setFeedbackEmail(u?.feedbackEmail || '');
        }).catch(() => {});
    }, []);

    const handleLogout = () => {
        base44.auth.logout('/');
    };

    const handleSaveEmail = async () => {
        try {
            await base44.auth.updateMe({ feedbackEmail });
            setEmailSaved(true);
            setTimeout(() => setEmailSaved(false), 2000);
        } catch (_) {}
    };

    const isAdmin = user?.role === 'admin';

    return (
        <div className="flex-1 overflow-y-auto bg-[#f6f8fb]">
            <div className="max-w-xl mx-auto px-5 py-10 space-y-6">
                <h1 className="text-2xl font-bold text-[#1e3a5f]">Settings</h1>

                <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
                    <h2 className="font-semibold text-[#1e3a5f]">Account</h2>
                    <Button variant="outline" onClick={() => navigate('/pricing')}>
                        Manage subscription
                    </Button>
                    <div className="pt-2 border-t">
                        <Button variant="destructive" size="sm" onClick={handleLogout}>
                            Sign out
                        </Button>
                    </div>
                </div>

                {/* Feedback email — admin only */}
                {isAdmin && (
                    <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-3">
                        <h2 className="font-semibold text-[#1e3a5f]">Feedback email address</h2>
                        <p className="text-xs text-muted-foreground">
                            User feedback from Build, Evaluate, and Level Check will be sent to this address. Only you can see it.
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="email"
                                value={feedbackEmail}
                                onChange={e => setFeedbackEmail(e.target.value)}
                                placeholder="your@email.com"
                                style={{
                                    flex: 1, height: '40px',
                                    border: '1px solid #e5e7eb', borderRadius: '8px',
                                    padding: '0 12px', fontSize: '14px', outline: 'none',
                                }}
                                onFocus={e => e.target.style.borderColor = '#c9a84c'}
                                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                            />
                            <button
                                onClick={handleSaveEmail}
                                style={{
                                    height: '40px', padding: '0 16px',
                                    backgroundColor: emailSaved ? '#22c55e' : '#c9a84c',
                                    color: '#0d2444', border: 'none', borderRadius: '8px',
                                    fontSize: '13px', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                                }}
                            >
                                {emailSaved ? 'Saved ✓' : 'Save'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-2">
                    <h2 className="font-semibold text-[#1e3a5f] mb-3">About</h2>
                    <p className="text-sm text-muted-foreground">RTO Readability — AQF Assessment Tool v24</p>
                    <p className="text-xs text-muted-foreground">Scores are AI estimates. Always review with a qualified assessor before submission.</p>
                </div>

                {/* Admin feedback table */}
                {isAdmin && <AdminFeedbackView />}
            </div>
        </div>
    );
}