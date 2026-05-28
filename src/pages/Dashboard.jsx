import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, ShieldCheck, FileDown } from 'lucide-react';

const BAND_COLORS = [
    { color: '#22c55e', label: 'Very Easy' },
    { color: '#86efac', label: 'Easy' },
    { color: '#bef264', label: 'Fairly Easy' },
    { color: '#fde047', label: 'Cert I/II' },
    { color: '#fb923c', label: 'Cert III/IV' },
    { color: '#f97316', label: 'Diploma' },
    { color: '#ef4444', label: 'Degree' },
    { color: '#991b1b', label: 'Postgrad' },
];

export default function Dashboard() {
    const navigate = useNavigate();

    const handleBuild = () => navigate('/chat', { state: { quickPrompt: 'I want to build a new assessment from a UoC.', cohort: true } });
    const handleEvaluate = () => navigate('/chat', { state: { quickPrompt: 'I want to evaluate an existing assessment against a UoC.', cohort: true } });
    const handleScore = () => navigate('/chat', { state: { quickPrompt: 'I want to score some text for readability.', cohort: false } });

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>

            {/* SECTION 1 — Header bar */}
            <div className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: '#0d2444' }}>
                <span style={{ color: '#c9a84c', letterSpacing: '2px', fontSize: '13px', fontWeight: 500 }}>
                    CLEARPASS
                </span>
                <div className="flex items-center gap-5">
                    <button
                        onClick={() => navigate('/library')}
                        className="text-sm hover:underline transition-colors"
                        style={{ color: '#8ba4c4', fontSize: '13px' }}
                    >
                        Work Library
                    </button>
                    <button
                        onClick={() => navigate('/settings')}
                        className="text-sm hover:underline transition-colors"
                        style={{ color: '#8ba4c4', fontSize: '13px' }}
                    >
                        Settings
                    </button>
                </div>
            </div>

            {/* SECTION 2 — Hero */}
            <div className="flex flex-col items-center text-center px-6 py-16" style={{ backgroundColor: '#ffffff' }}>
                <p style={{
                    color: '#c9a84c',
                    fontSize: '11px',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    marginBottom: '16px',
                    fontWeight: 500,
                }}>
                    Assessment Compliance Tool
                </p>

                <h1 style={{
                    color: '#0d2444',
                    fontSize: '32px',
                    fontWeight: 500,
                    lineHeight: 1.25,
                    maxWidth: '480px',
                    marginBottom: '16px',
                }}>
                    Build audit-ready assessments in minutes
                </h1>

                <p style={{
                    color: '#6b7280',
                    fontSize: '16px',
                    lineHeight: 1.6,
                    maxWidth: '480px',
                    marginBottom: '32px',
                }}>
                    Upload your Unit of Competency. We build a complete, compliant assessment — written at the right reading level for your learners, mapped to every requirement.
                </p>

                <button
                    onClick={handleBuild}
                    style={{
                        backgroundColor: '#c9a84c',
                        color: '#0d2444',
                        height: '48px',
                        borderRadius: '8px',
                        width: '100%',
                        maxWidth: '400px',
                        fontSize: '15px',
                        fontWeight: 500,
                        border: 'none',
                        cursor: 'pointer',
                        marginBottom: '20px',
                        transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                    Upload your UoC and get started →
                </button>

                <div className="flex items-center gap-6">
                    <button
                        onClick={handleEvaluate}
                        style={{ color: '#6b7280', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer' }}
                        className="hover:underline"
                    >
                        Check an existing assessment
                    </button>
                    <button
                        onClick={handleScore}
                        style={{ color: '#6b7280', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer' }}
                        className="hover:underline"
                    >
                        Score a document for readability
                    </button>
                </div>
            </div>

            {/* SECTION 3 — Readability scale */}
            <div className="px-6 py-8" style={{ borderTop: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
                <p style={{
                    color: '#6b7280',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    textAlign: 'center',
                    marginBottom: '16px',
                }}>
                    Where does your assessment sit?
                </p>

                {/* Colour bar */}
                <div
                    className="flex w-full overflow-hidden mx-auto"
                    style={{ maxWidth: '600px', height: '12px', borderRadius: '6px' }}
                >
                    {BAND_COLORS.map(b => (
                        <div key={b.color} className="flex-1" style={{ backgroundColor: b.color }} />
                    ))}
                </div>

                {/* Labels */}
                <div
                    className="flex w-full mx-auto mt-2"
                    style={{ maxWidth: '600px' }}
                >
                    {BAND_COLORS.map(b => (
                        <div
                            key={b.label}
                            className="flex-1 text-center"
                            style={{ fontSize: '10px', color: '#6b7280' }}
                        >
                            {b.label}
                        </div>
                    ))}
                </div>

                <p style={{
                    color: '#6b7280',
                    fontSize: '13px',
                    textAlign: 'center',
                    marginTop: '16px',
                }}>
                    Upload your Unit of Competency and we'll build an assessment calibrated to exactly the right level for your learners.
                </p>
            </div>

            {/* SECTION 4 — Trust indicators */}
            <div
                className="px-6 py-8"
                style={{ borderTop: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}
            >
                <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12">
                    {[
                        { Icon: ClipboardCheck, text: 'Mapped to AQF levels 1–10' },
                        { Icon: ShieldCheck,    text: 'Every requirement covered' },
                        { Icon: FileDown,       text: 'Exports as Word document' },
                    ].map(({ Icon, text }) => (
                        <div key={text} className="flex flex-col items-center gap-2 text-center">
                            <Icon style={{ color: '#c9a84c', width: '22px', height: '22px' }} />
                            <span style={{ color: '#6b7280', fontSize: '13px' }}>{text}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}