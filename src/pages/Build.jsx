import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCohort } from '@/lib/CohortContext';
import { downloadDocx } from '@/lib/downloadDocx';
import { CheckCircle, Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
// ── Inlined: BuildProgress ────────────────────────────────────────────────────
const BP_STEPS = ['Upload UoC', 'Learners', 'Review', 'Done'];
function BuildProgress({ step, contextNote }) {
    return (
        <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                {BP_STEPS.map((label, i) => {
                    const idx = i + 1;
                    const done = idx < step;
                    const active = idx === step;
                    return (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < BP_STEPS.length - 1 ? 1 : 'none' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{
                                    width: '28px', height: '28px', borderRadius: '50%',
                                    backgroundColor: done ? '#0d2444' : active ? '#c9a84c' : '#e5e7eb',
                                    color: done ? '#c9a84c' : active ? '#0d2444' : '#9ca3af',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '12px', fontWeight: 600, flexShrink: 0,
                                }}>
                                    {done ? '✓' : idx}
                                </div>
                                <span style={{ fontSize: '10px', color: active ? '#0d2444' : '#9ca3af', fontWeight: active ? 500 : 400, marginTop: '4px', whiteSpace: 'nowrap' }}>
                                    {label}
                                </span>
                            </div>
                            {i < BP_STEPS.length - 1 && (
                                <div style={{ flex: 1, height: '2px', backgroundColor: done ? '#0d2444' : '#e5e7eb', margin: '0 4px', marginBottom: '18px' }} />
                            )}
                        </div>
                    );
                })}
            </div>
            {contextNote && <p style={{ color: '#6b7280', fontSize: '13px', lineHeight: 1.5 }}>{contextNote}</p>}
        </div>
    );
}

// ── Inlined: HelpIcon ─────────────────────────────────────────────────────────
function HelpIcon({ url, heading, description }) {
    const [helpOpen, setHelpOpen] = useState(false);
    return (
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '6px' }}>
            <button type="button" onClick={() => setHelpOpen(o => !o)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
            </button>
            {helpOpen && (
                <div style={{ position: 'absolute', top: '24px', left: '0', zIndex: 50, backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', width: '260px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <p style={{ color: '#0d2444', fontSize: '13px', fontWeight: 500 }}>{heading}</p>
                        <button type="button" onClick={() => setHelpOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '16px', color: '#9ca3af', lineHeight: 1 }}>×</button>
                    </div>
                    <p style={{ color: '#6b7280', fontSize: '12px', lineHeight: 1.5, marginBottom: '8px' }}>{description}</p>
                    {url && <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#c9a84c', fontSize: '12px', textDecoration: 'underline' }}>Open {heading} →</a>}
                </div>
            )}
        </span>
    );
}
// ── Cohort config ─────────────────────────────────────────────────────────────

const LEARNER_OPTIONS = [
    { value: 'high_school', label: 'High school students', feedback: "High school students → we'll use a junior secondary reading level." },
    { value: 'apprentices', label: 'Apprentices and trainees', feedback: "Apprentices and trainees → standard working adult literacy assumed." },
    { value: 'working_adults', label: 'Working adults', feedback: "Working adults → standard adult literacy assumed." },
    { value: 'university', label: 'University students', feedback: "University students → we'll use a higher academic reading level." },
];

const SUPPORT_OPTIONS = [
    { value: 'none', label: 'No — most learners read English comfortably' },
    { value: 'esl', label: 'Yes — some learners speak English as a second language (ESL)' },
    { value: 'literacy', label: 'Yes — some learners need extra literacy support' },
    { value: 'both', label: 'Yes — ESL and literacy support needed' },
];

const BAND_MAP = {
    high_school:    { none: 'Cert I/II · Yr 10', esl: 'Easy', literacy: 'Easy', both: 'Very Easy' },
    apprentices:    { none: 'Cert III/IV', esl: 'Cert I/II · Yr 10', literacy: 'Cert I/II · Yr 10', both: 'Fairly Easy' },
    working_adults: { none: 'Cert III/IV', esl: 'Cert I/II · Yr 10', literacy: 'Cert I/II · Yr 10', both: 'Fairly Easy' },
    university:     { none: 'Diploma', esl: 'Cert III/IV', literacy: 'Cert III/IV', both: 'Cert I/II · Yr 10' },
};

const LEARNER_DESC = {
    high_school:    'high school students',
    apprentices:    'apprentices and trainees',
    working_adults: 'working adults',
    university:     'university students',
};

function getBand(learner, support) {
    return (BAND_MAP[learner] || {})[support] || 'Cert III/IV';
}

// ── Progress stages (driven externally by build steps) ────────────────────────

const BUILD_STAGES = [
    { pct: 0,   label: 'Starting...' },
    { pct: 10,  label: 'Reading your UoC...' },
    { pct: 30,  label: 'Writing knowledge questions...' },
    { pct: 50,  label: 'Building observation checklist...' },
    { pct: 65,  label: 'Writing project tasks...' },
    { pct: 80,  label: 'Creating marking guides...' },
    { pct: 95,  label: 'Building mapping document...' },
    { pct: 100, label: 'Done ✓' },
];

// ── Shared header ─────────────────────────────────────────────────────────────

function BuildHeader() {
    return (
        <div className="flex items-center justify-between px-6 py-3 flex-shrink-0" style={{ backgroundColor: '#0d2444' }}>
            <span style={{ color: '#c9a84c', letterSpacing: '2px', fontSize: '13px', fontWeight: 500 }}>CLEARPASS</span>
            <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 400 }}>Build Assessment</span>
            <div style={{ width: '80px' }} />
        </div>
    );
}

// ── Screen 1 — Upload UoC ─────────────────────────────────────────────────────

function Screen1({ onConfirm }) {
    const [file, setFile] = useState(null);
    const [pasteText, setPasteText] = useState('');
    const [extracting, setExtracting] = useState(false);
    const [unitInfo, setUnitInfo] = useState(null); // { code, title, text }
    const [error, setError] = useState(null);
    const inputRef = useRef();

    const MAX_SIZE = 5 * 1024 * 1024;

    const validateFile = (f) => {
        if (!f.name.match(/\.(pdf|docx)$/i)) return 'wrong_format';
        if (f.size > MAX_SIZE) return 'too_large';
        return null;
    };

    const extractUnit = async (f, text) => {
        setExtracting(true);
        setError(null);
        try {
            let extractedText = text;
            if (f) {
                const uploadResult = await base44.integrations.Core.UploadFile({ file: f });
                const res = await base44.functions.invoke('extractDocumentText', {
                    file_url: uploadResult.file_url,
                    file_name: f.name,
                    label: 'Unit of Competency',
                });
                extractedText = res?.data?.text || '';
            }
            if (!extractedText) throw new Error('empty');

            // Extract unit code and title using LLM
            const parseResult = await base44.integrations.Core.InvokeLLM({
                prompt: `Extract the unit code and unit title from this Unit of Competency text. Return JSON only: {"code": "...", "title": "..."}\n\n${extractedText.slice(0, 2000)}`,
                response_json_schema: {
                    type: 'object',
                    properties: { code: { type: 'string' }, title: { type: 'string' } }
                }
            });
            const code = parseResult?.code || 'Unknown';
            const title = parseResult?.title || 'Unit of Competency';
            setUnitInfo({ code, title, text: extractedText });
        } catch (err) {
            if (err.message === 'empty') {
                setError('scanned');
            } else {
                setError('parse');
            }
        } finally {
            setExtracting(false);
        }
    };

    const handleFile = (f) => {
        const err = validateFile(f);
        if (err) { setError(err); return; }
        setFile(f);
        setError(null);
        setUnitInfo(null);
        extractUnit(f, null);
    };

    const handlePaste = (val) => {
        setPasteText(val);
        if (val.length >= 100) {
            setError(null);
            setUnitInfo(null);
            extractUnit(null, val);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
    };

    const errorMessages = {
        scanned: { icon: '⚠', text: "This looks like a scanned image. Try a text-based PDF or paste the text below." },
        too_large: { icon: '⚠', text: "This file is too large. Try a smaller file or paste the text below." },
        wrong_format: { icon: '⚠', text: "This file format isn't supported. Try .pdf or .docx." },
        parse: { icon: '⚠', text: "We couldn't read this file. Try a different file or paste the text below." },
    };

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '540px', margin: '0 auto', padding: '32px 24px' }}>
                <BuildProgress step={1} contextNote="Upload your Unit of Competency — we'll read it and design your assessment automatically." />

                <h2 style={{ color: '#0d2444', fontSize: '24px', fontWeight: 500, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Upload your Unit of Competency
                    <HelpIcon
                        url="https://training.gov.au/Search/Units"
                        heading="Find your Unit of Competency"
                        description="Training.gov.au is the official Australian register of all vocational education and training units. Search by unit code (e.g. BSBLDR413) to find the complete unit details."
                    />
                </h2>

                {/* Upload area */}
                {!unitInfo && !extracting && (
                    <div
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => inputRef.current?.click()}
                        style={{
                            border: '2px dashed #e5e7eb',
                            borderRadius: '12px',
                            padding: '40px',
                            textAlign: 'center',
                            backgroundColor: '#f9fafb',
                            cursor: 'pointer',
                            marginBottom: '16px',
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a84c'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                    >
                        <input ref={inputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
                        <Upload style={{ color: '#c9a84c', width: '32px', height: '32px', margin: '0 auto 12px' }} />
                        <p style={{ color: '#0d2444', fontSize: '14px', marginBottom: '6px' }}>Drop your UoC here or click to browse</p>
                        <p style={{ color: '#9ca3af', fontSize: '12px' }}>.pdf or .docx files accepted</p>
                    </div>
                )}

                {/* Extracting spinner */}
                {extracting && (
                    <div style={{ textAlign: 'center', padding: '40px', border: '2px dashed #e5e7eb', borderRadius: '12px', marginBottom: '16px' }}>
                        <Loader2 style={{ color: '#c9a84c', width: '28px', height: '28px', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                        <p style={{ color: '#6b7280', fontSize: '14px' }}>Reading your UoC...</p>
                    </div>
                )}

                {/* Confirmation card */}
                {unitInfo && (
                    <div style={{
                        border: '1px solid #22c55e',
                        borderRadius: '8px',
                        padding: '16px',
                        backgroundColor: '#f0fdf4',
                        marginBottom: '16px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <CheckCircle style={{ color: '#22c55e', width: '20px', height: '20px', flexShrink: 0 }} />
                            <span style={{ color: '#0d2444', fontSize: '14px', fontWeight: 500 }}>
                                Got it — {unitInfo.code} {unitInfo.title}
                            </span>
                        </div>
                        <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '12px', marginLeft: '30px' }}>Is this the right unit?</p>
                        <div style={{ display: 'flex', gap: '8px', marginLeft: '30px' }}>
                            <button
                                onClick={() => onConfirm(unitInfo)}
                                style={{ padding: '6px 14px', border: '1px solid #22c55e', borderRadius: '6px', backgroundColor: 'transparent', color: '#166534', fontSize: '13px', cursor: 'pointer' }}
                            >
                                Yes, continue →
                            </button>
                            <button
                                onClick={() => { setUnitInfo(null); setFile(null); setPasteText(''); }}
                                style={{ padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'transparent', color: '#6b7280', fontSize: '13px', cursor: 'pointer' }}
                            >
                                No, upload a different file
                            </button>
                        </div>
                    </div>
                )}

                {/* Error card */}
                {error && errorMessages[error] && (
                    <div style={{
                        border: '1px solid #ef4444',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        backgroundColor: '#fef2f2',
                        marginBottom: '16px',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'flex-start',
                    }}>
                        <AlertCircle style={{ color: '#ef4444', width: '16px', height: '16px', flexShrink: 0, marginTop: '1px' }} />
                        <p style={{ color: '#dc2626', fontSize: '13px' }}>
                            We couldn't read this file. {errorMessages[error].text}
                        </p>
                    </div>
                )}

                {/* Info note */}
                <div style={{
                    backgroundColor: '#f0f7ff',
                    borderLeft: '3px solid #c9a84c',
                    borderRadius: '4px',
                    padding: '10px 14px',
                    marginTop: '12px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <p style={{ color: '#6b7280', fontSize: '12px', lineHeight: 1.6, margin: 0 }}>
                            For best results, download your UoC from{' '}
                            <a href="https://training.gov.au" target="_blank" rel="noopener noreferrer" style={{ color: '#c9a84c', textDecoration: 'underline' }}>training.gov.au</a>
                            {' '}— this gives you the most current version in a readable format.
                            <br />
                            Accepted: .docx and text-based .pdf only. Scanned PDFs cannot be read — use the paste box below instead.
                            <br />
                            You can upload up to 4 UoCs at once if they share common outcomes.
                        </p>
                    </div>
                </div>

                {/* OR divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
                    <span style={{ color: '#9ca3af', fontSize: '13px' }}>or paste below</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
                </div>

                {/* Paste area */}
                <textarea
                    value={pasteText}
                    onChange={e => handlePaste(e.target.value)}
                    placeholder="Paste your Unit of Competency text here..."
                    style={{
                        width: '100%',
                        height: '180px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px',
                        fontFamily: 'Arial',
                        fontSize: '11px',
                        resize: 'vertical',
                        outline: 'none',
                        boxSizing: 'border-box',
                    }}
                />
            </div>
        </div>
    );
}

// ── Screen 2 — Learner profile ────────────────────────────────────────────────

function Screen2({ unitInfo, onBack, onConfirm }) {
    const [learner, setLearner] = useState('');
    const [support, setSupport] = useState('');

    const selectedLearner = LEARNER_OPTIONS.find(o => o.value === learner);
    const canContinue = learner && support;
    const band = canContinue ? getBand(learner, support) : null;
    const learnerDesc = LEARNER_DESC[learner] || '';

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '540px', margin: '0 auto', padding: '32px 24px' }}>
                <BuildProgress step={2} contextNote="This sets the reading level for your assessment — takes about 30 seconds." />

                <h2 style={{ color: '#0d2444', fontSize: '24px', fontWeight: 500, marginBottom: '24px' }}>
                    Tell us about your learners
                </h2>

                <div style={{ maxWidth: '480px' }}>
                    {/* Field 1 */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', color: '#0d2444', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
                            Who will be completing this assessment?
                            <HelpIcon
                                url="https://training.gov.au/Training/Details/help"
                                heading="About learner cohorts"
                                description="Different learner groups need assessments written at different reading levels. Your selection here helps us set the right language complexity for your specific cohort."
                            />
                        </label>
                        <select
                            value={learner}
                            onChange={e => { setLearner(e.target.value); setSupport(''); }}
                            style={{
                                width: '100%', height: '44px',
                                border: '1px solid #e5e7eb', borderRadius: '8px',
                                padding: '0 12px', fontSize: '14px',
                                backgroundColor: '#ffffff', color: learner ? '#0d2444' : '#9ca3af',
                                outline: 'none', cursor: 'pointer',
                            }}
                        >
                            <option value="" disabled>Select your learners...</option>
                            {LEARNER_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>

                        {/* Partial feedback */}
                        {selectedLearner && (
                            <p style={{ color: '#6b7280', fontSize: '12px', fontStyle: 'italic', marginTop: '8px' }}>
                                {selectedLearner.feedback} Now tell us about any extra support needs.
                            </p>
                        )}
                    </div>

                    {/* Field 2 — appears after Field 1 */}
                    {learner && (
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', color: '#0d2444', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
                                Do any learners need extra support?
                                <HelpIcon
                                    url="https://training.gov.au/Training/Details/help"
                                    heading="Learner support needs"
                                    description="Learners with English as a second language (ESL) or those needing literacy support may need simpler language in assessments. This setting adjusts the reading level to improve accessibility."
                                />
                            </label>
                            <select
                                value={support}
                                onChange={e => setSupport(e.target.value)}
                                style={{
                                    width: '100%', height: '44px',
                                    border: '1px solid #e5e7eb', borderRadius: '8px',
                                    padding: '0 12px', fontSize: '14px',
                                    backgroundColor: '#ffffff', color: support ? '#0d2444' : '#9ca3af',
                                    outline: 'none', cursor: 'pointer',
                                }}
                            >
                                <option value="" disabled>Select support needs...</option>
                                {SUPPORT_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Full confirmation card */}
                    {canContinue && (
                        <div style={{
                            backgroundColor: '#f0fdf4', border: '1px solid #22c55e',
                            borderRadius: '8px', padding: '12px 16px', marginBottom: '16px',
                            display: 'flex', alignItems: 'flex-start', gap: '10px',
                        }}>
                            <CheckCircle style={{ color: '#22c55e', width: '18px', height: '18px', flexShrink: 0, marginTop: '1px' }} />
                            <div>
                                <p style={{ color: '#0d2444', fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>
                                    We'll build this assessment at {band} level
                                </p>
                                <p style={{ color: '#6b7280', fontSize: '12px' }}>
                                    Suitable for {learnerDesc}. You can adjust this after downloading.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                        <button
                            onClick={onBack}
                            style={{ flex: 1, height: '44px', border: '1px solid #0d2444', borderRadius: '8px', backgroundColor: 'transparent', color: '#0d2444', fontSize: '14px', cursor: 'pointer' }}
                        >
                            ← Back
                        </button>
                        <button
                            onClick={() => onConfirm({ learner, support, band, learnerDesc })}
                            disabled={!canContinue}
                            style={{
                                flex: 1, height: '44px', borderRadius: '8px',
                                backgroundColor: canContinue ? '#c9a84c' : '#e5e7eb',
                                color: canContinue ? '#0d2444' : '#9ca3af',
                                fontSize: '14px', fontWeight: 500,
                                border: 'none', cursor: canContinue ? 'pointer' : 'not-allowed',
                                transition: 'all 0.15s',
                            }}
                        >
                            Continue →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Screen 3 — Review structure ───────────────────────────────────────────────

const SECTION_ICONS = { 'Knowledge Questions': '📝', 'Observation Checklist': '👁', 'Workplace Project': '📋', 'Scenario / Case Study': '💬', 'Third Party Report': '📄', 'Verbal Questions': '🎙' };

function Screen3({ unitInfo, cohortInfo, sections, onBack, onBuild }) {
    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '540px', margin: '0 auto', padding: '32px 24px' }}>
                <BuildProgress step={3} contextNote="Based on your UoC, here's what we recommend building. You can edit the content after downloading — click Build when ready." />

                <h2 style={{ color: '#0d2444', fontSize: '24px', fontWeight: 500, marginBottom: '16px' }}>
                    Here's what we'll build
                </h2>

                {/* Unit bar */}
                <div style={{
                    backgroundColor: '#162d50', borderRadius: '8px',
                    padding: '12px 16px', marginBottom: '20px',
                }}>
                    <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>
                        {unitInfo.code} — {unitInfo.title}
                    </p>
                    <p style={{ color: '#c9a84c', fontSize: '12px' }}>
                        Reading level: {cohortInfo.band} · Target aligned to {cohortInfo.learnerDesc}
                    </p>
                </div>

                {/* Structure card */}
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {sections.map((s, i) => (
                            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '20px', flexShrink: 0 }}>{SECTION_ICONS[s.name] || '📄'}</span>
                                <div>
                                    <p style={{ color: '#0d2444', fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>{s.name}</p>
                                    <p style={{ color: '#6b7280', fontSize: '12px' }}>{s.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Coverage summary */}
                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                        {[
                            '✓ All practical tasks covered',
                            '✓ All knowledge questions covered',
                            '✓ All learning outcomes mapped',
                        ].map(line => (
                            <p key={line} style={{ color: '#6b7280', fontSize: '13px', marginBottom: '4px' }}>{line}</p>
                        ))}
                        <p style={{ color: '#9ca3af', fontSize: '12px', fontStyle: 'italic', marginTop: '8px' }}>
                            You can edit question counts and content after downloading.
                        </p>
                    </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={onBack}
                        style={{ flex: 1, height: '44px', border: '1px solid #0d2444', borderRadius: '8px', backgroundColor: 'transparent', color: '#0d2444', fontSize: '14px', cursor: 'pointer' }}
                    >
                        ← Back
                    </button>
                    <button
                        onClick={onBuild}
                        style={{ flex: 1, height: '44px', backgroundColor: '#c9a84c', color: '#0d2444', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                    >
                        Build my assessment →
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Screen 4 — Building / Ready ───────────────────────────────────────────────

function Screen4Loading({ onReset, progress, buildError }) {
    const stage = [...BUILD_STAGES].reverse().find(s => progress >= s.pct) || BUILD_STAGES[0];

    if (buildError) {
        return (
            <div className="flex-1 flex flex-col" style={{ backgroundColor: '#ffffff' }}>
                <div style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 24px', width: '100%' }}>
                    <BuildProgress step={4} contextNote="" />
                    <div style={{
                        border: '1px solid #ef4444',
                        backgroundColor: '#fef2f2',
                        borderRadius: '8px',
                        padding: '16px',
                        marginTop: '40px',
                        textAlign: 'center',
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 10px' }}>
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <p style={{ color: '#0d2444', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                            Something went wrong
                        </p>
                        <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
                            {buildError}
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button
                                onClick={onReset}
                                style={{ padding: '8px 18px', border: '1px solid #0d2444', borderRadius: '6px', backgroundColor: 'transparent', color: '#0d2444', fontSize: '13px', cursor: 'pointer' }}
                            >
                                ← Start again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 24px', width: '100%' }}>
                <BuildProgress step={4} contextNote="" />
                <div style={{ paddingTop: '40px' }}>
                    <h2 style={{ color: '#0d2444', fontSize: '20px', fontWeight: 500, marginBottom: '32px', textAlign: 'center' }}>
                        Building your assessment...
                    </h2>
                    <div style={{ width: '100%', height: '8px', borderRadius: '4px', backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${progress}%`,
                            borderRadius: '4px',
                            backgroundColor: '#c9a84c',
                            transition: 'width 0.6s ease',
                        }} />
                    </div>
                    <p style={{ color: '#0d2444', fontSize: '14px', fontWeight: 700, textAlign: 'center', marginTop: '10px' }}>
                        {progress}%
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', marginTop: '4px' }}>
                        {stage.label}
                    </p>
                </div>
            </div>
        </div>
    );
}

function Screen4Ready({ unitInfo, cohortInfo, assessmentText, mappingText, onBack, onReset, onSave }) {
    const navigate = useNavigate();
    const hasGaps = assessmentText?.includes('⚠') || assessmentText?.includes('NOT COVERED');
    const gapCount = hasGaps ? (assessmentText.match(/GAP \d+:/g) || []).length : 0;

    const handleDownloadAssessment = () => {
        downloadDocx(assessmentText, `${unitInfo.code}-assessment`);
    };

    const handleDownloadMapping = async () => {
        if (!mappingText) return;
        try {
            const res = await base44.functions.invoke('buildMappingDocument', {
                markdown_content: mappingText,
                unit_code: unitInfo.code,
                unit_title: unitInfo.title,
            });
            if (res?.data?.file_base64) {
                const bytes = atob(res.data.file_base64);
                const buf = new Uint8Array(bytes.length);
                for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
                const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${unitInfo.code}-mapping-document.docx`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (e) {
            // fallback
            downloadDocx(mappingText, `${unitInfo.code}-mapping-document`);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '540px', margin: '0 auto', padding: '32px 24px' }}>
                <BuildProgress step={4} contextNote="" />

                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <CheckCircle2 style={{ color: '#c9a84c', width: '48px', height: '48px', margin: '0 auto 16px' }} />
                    <h2 style={{ color: '#0d2444', fontSize: '24px', fontWeight: 500, marginBottom: '8px' }}>
                        Your assessment is ready
                    </h2>
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>
                        Review before submitting — always validate with a qualified assessor.
                    </p>
                </div>

                {/* Summary card */}
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
                    <p style={{ color: '#0d2444', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                        {unitInfo.code} — {unitInfo.title}
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
                        Reading level: {cohortInfo.band}
                    </p>
                    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                        {[
                            '✓ All practical tasks covered',
                            '✓ All knowledge questions covered',
                            '✓ All learning outcomes mapped',
                        ].map(line => (
                            <p key={line} style={{ color: '#22c55e', fontSize: '13px', marginBottom: '4px' }}>{line}</p>
                        ))}
                        {hasGaps && gapCount > 0 && (
                            <p style={{ color: '#d97706', fontSize: '13px', marginTop: '4px' }}>
                                ⚠ {gapCount} item{gapCount !== 1 ? 's' : ''} need review — shown inside the document
                            </p>
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    <button
                        onClick={handleDownloadAssessment}
                        style={{ width: '100%', height: '48px', backgroundColor: '#c9a84c', color: '#0d2444', borderRadius: '8px', border: 'none', fontSize: '15px', fontWeight: 500, cursor: 'pointer' }}
                    >
                        Download assessment as Word document →
                    </button>

                    <div>
                        <button
                            onClick={handleDownloadMapping}
                            style={{ width: '100%', height: '44px', backgroundColor: 'transparent', color: '#0d2444', borderRadius: '8px', border: '1px solid #0d2444', fontSize: '14px', cursor: 'pointer' }}
                        >
                            Download mapping document →
                        </button>
                        <p style={{ color: '#9ca3af', fontSize: '11px', fontStyle: 'italic', textAlign: 'center', marginTop: '4px' }}>
                            For your validation folder — shows how every requirement is covered
                        </p>
                    </div>

                    <button
                        onClick={onSave}
                        style={{ width: '100%', height: '44px', backgroundColor: 'transparent', color: '#0d2444', borderRadius: '8px', border: '1px solid #0d2444', fontSize: '14px', cursor: 'pointer' }}
                    >
                        Save to library
                    </button>
                </div>

                {/* Recovery links */}
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', display: 'block', width: '100%', marginBottom: '6px' }}>
                        Wrong learner type? → Go back to adjust
                    </button>
                    <button onClick={onReset} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', display: 'block', width: '100%', marginBottom: '6px' }}>
                        Not what you expected? → Start again
                    </button>
                    <button onClick={onReset} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', display: 'block', width: '100%' }}>
                        Wrong unit? → Start again with a new UoC
                    </button>
                </div>

                <p style={{ color: '#9ca3af', fontSize: '11px', fontStyle: 'italic', textAlign: 'center' }}>
                    All content is AI-generated. Review with a qualified assessor before submitting for validation or audit purposes.
                </p>
            </div>
        </div>
    );
}

// ── Main Build page ───────────────────────────────────────────────────────────

const DEFAULT_SECTIONS = [
    { name: 'Knowledge Questions', description: 'Tests understanding of all key concepts from the UoC' },
    { name: 'Observation Checklist', description: 'Assessor observes the learner completing practical tasks' },
    { name: 'Workplace Project', description: 'Learner produces evidence of real workplace performance' },
];

export default function Build() {
    const navigate = useNavigate();
    const { profile, getLabel } = useCohort();
    const [screen, setScreen] = useState(1);
    const [unitInfo, setUnitInfo] = useState(null);
    const [cohortInfo, setCohortInfo] = useState(null);
    const [sections, setSections] = useState(DEFAULT_SECTIONS);
    const [building, setBuilding] = useState(false);
    const [buildProgress, setBuildProgress] = useState(0);
    const [buildError, setBuildError] = useState(null);
    const [assessmentText, setAssessmentText] = useState('');
    const [mappingText, setMappingText] = useState('');

    const buildCohortProfile = (ci) => {
        const learnerLabel = LEARNER_OPTIONS.find(o => o.value === ci.learner)?.label || ci.learner;
        return `1. Delivery mode: mixed\n2. Learner literacy level: ${ci.support.includes('literacy') ? 'foundation' : 'standard'}\n3. Language background: ${ci.support.includes('esl') ? 'LLNP/ESL cohort' : 'English first language'}\n4. Age group: ${learnerLabel}`;
    };

    const llmCall = (prompt) => base44.integrations.Core.InvokeLLM({ prompt, model: 'claude_sonnet_4_6' });

    const handleScreen1Confirm = (info) => {
        setUnitInfo(info);
        setScreen(2);
    };

    const handleScreen2Confirm = (ci) => {
        setCohortInfo(ci);
        setScreen(3);
    };

    const handleBuild = async () => {
        setBuilding(true);
        setBuildProgress(0);
        setBuildError(null);
        setScreen(4);

        const cohortBlock = buildCohortProfile(cohortInfo);
        const uoc = unitInfo.text;
        const band = cohortInfo.band;
        const levelNote = `Target reading level: ${band}\nCohort: ${cohortBlock}`;

        try {
            // CALL 1 — Parse UoC structure
            setBuildProgress(10);
            const structure = await llmCall(
                `You are an Australian VET assessment designer. Parse this Unit of Competency and return a JSON object only (no other text) with these fields:
- unit_code: string
- unit_title: string  
- ke_items: array of strings (each Knowledge Evidence item, verbatim)
- pe_items: array of strings (each Performance Evidence item, verbatim)
- pc_items: array of strings (each Performance Criteria item, formatted as "X.X — description")

UoC TEXT:
${uoc.slice(0, 8000)}`
            );

            let parsed;
            try {
                const jsonStr = typeof structure === 'string'
                    ? structure.replace(/```json|```/g, '').trim()
                    : JSON.stringify(structure);
                parsed = JSON.parse(jsonStr);
            } catch {
                parsed = { ke_items: [], pe_items: [], pc_items: [] };
            }

            const keList = (parsed.ke_items || []).join('\n');
            const peList = (parsed.pe_items || []).join('\n');

            // CALL 2 — Knowledge Questions
            setBuildProgress(30);
            const knowledgeSection = await llmCall(
                `You are an Australian VET assessment writer. Write a Knowledge Questions section for an assessment instrument.

${levelNote}
Unit: ${unitInfo.code} — ${unitInfo.title}

KNOWLEDGE EVIDENCE ITEMS TO COVER:
${keList || uoc.slice(0, 3000)}

Instructions:
- Write 8–12 questions that cover all knowledge evidence items
- Use short-answer format (2–4 sentences expected per answer)
- Write at ${band} reading level
- Number each question (Q1, Q2, etc.)
- Include a "Model Answer" for each question in italics below the question
- Use plain, clear language appropriate for the cohort
- Do NOT include any other sections

Output format: Markdown. Start with: ## Part A — Knowledge Questions`
            );

            // CALL 3 — Observation Checklist
            setBuildProgress(50);
            const observationSection = await llmCall(
                `You are an Australian VET assessment writer. Write an Observation Checklist section for an assessment instrument.

${levelNote}
Unit: ${unitInfo.code} — ${unitInfo.title}

PERFORMANCE EVIDENCE AND CRITERIA TO COVER:
${peList || ''}
${parsed.pc_items?.join('\n') || ''}

Instructions:
- Write a checklist of 10–15 observable behaviours/tasks the assessor will observe
- Each item should be a clear, observable action (Satisfactory / Not Yet Satisfactory checkboxes)
- Cover all performance evidence and key performance criteria
- Write at ${band} reading level
- Include an "Assessor Notes" field at the end

Output format: Markdown table with columns: Item | Observable Behaviour | S | NYS | Comments
Start with: ## Part B — Observation Checklist`
            );

            // CALL 4 — Workplace Project / Scenario
            setBuildProgress(65);
            const projectSection = await llmCall(
                `You are an Australian VET assessment writer. Write a Workplace Project task for an assessment instrument.

${levelNote}
Unit: ${unitInfo.code} — ${unitInfo.title}

PERFORMANCE EVIDENCE TO COVER:
${peList || uoc.slice(0, 2000)}

Instructions:
- Write one practical workplace project task that covers all performance evidence
- Include: scenario context, task instructions (numbered steps), resources required, submission requirements
- Write at ${band} reading level
- The task should produce a physical or digital work product as evidence
- Include word count guidance for any written components

Output format: Markdown. Start with: ## Part C — Workplace Project`
            );

            // CALL 5 — Marking Guide
            setBuildProgress(80);
            const markingGuide = await llmCall(
                `You are an Australian VET assessment writer. Write a Marking Guide / Assessor Pack for the following assessment sections.

${levelNote}
Unit: ${unitInfo.code} — ${unitInfo.title}

KNOWLEDGE QUESTIONS (already written):
${typeof knowledgeSection === 'string' ? knowledgeSection.slice(0, 3000) : ''}

OBSERVATION CHECKLIST (already written):
${typeof observationSection === 'string' ? observationSection.slice(0, 2000) : ''}

WORKPLACE PROJECT (already written):
${typeof projectSection === 'string' ? projectSection.slice(0, 2000) : ''}

Instructions:
- Write a complete Assessor Marking Guide
- For knowledge questions: include model answers and acceptable variations
- For observation: include specific observable indicators for each checklist item
- For the project: include assessment criteria and evidence requirements
- Include a Reasonable Adjustment note
- Include a Judgement of Competence summary section

Output format: Markdown. Start with: # Assessor Marking Guide — ${unitInfo.code}`
            );

            // CALL 6 — Mapping Document
            setBuildProgress(95);
            const mappingDoc = await llmCall(
                `You are an Australian VET compliance specialist. Produce a mapping document showing how the assessment instrument covers all requirements of the unit.

Unit: ${unitInfo.code} — ${unitInfo.title}

KNOWLEDGE EVIDENCE ITEMS:
${keList || '(see UoC)'}

PERFORMANCE EVIDENCE ITEMS:
${peList || '(see UoC)'}

PERFORMANCE CRITERIA:
${parsed.pc_items?.join('\n') || '(see UoC)'}

ASSESSMENT INSTRUMENT SECTIONS:
- Part A: Knowledge Questions
- Part B: Observation Checklist
- Part C: Workplace Project

Instructions:
- Create a mapping table showing each KE item, PE item, and PC mapped to which assessment part covers it
- Include a coverage summary confirming all requirements are met
- Flag any gaps with ⚠
- Format as a Markdown table

Output format: Markdown. Start with: # Assessment Mapping Document — ${unitInfo.code}`
            );

            // Assemble final document
            const kText = typeof knowledgeSection === 'string' ? knowledgeSection : JSON.stringify(knowledgeSection);
            const oText = typeof observationSection === 'string' ? observationSection : JSON.stringify(observationSection);
            const pText = typeof projectSection === 'string' ? projectSection : JSON.stringify(projectSection);
            const mText = typeof markingGuide === 'string' ? markingGuide : JSON.stringify(markingGuide);
            const mapText = typeof mappingDoc === 'string' ? mappingDoc : JSON.stringify(mappingDoc);

            const fullAssessment = `# Assessment Instrument
## ${unitInfo.code} — ${unitInfo.title}
*Reading level: ${band}*

---

${kText}

---

${oText}

---

${pText}

---

${mText}`;

            setAssessmentText(fullAssessment);
            setMappingText(mapText);
            setBuildProgress(100);

        } catch (e) {
            setBuildError('One of the build steps timed out or failed. Please try again — each step is smaller now and should complete successfully.');
        } finally {
            setBuilding(false);
        }
    };

    const handleSave = async () => {
        if (!unitInfo || !assessmentText) return;
        await base44.entities.WorkLibraryItem.create({
            title: `${unitInfo.code} — ${unitInfo.title}`,
            task_type: 'build',
            unit_code: unitInfo.code,
            unit_title: unitInfo.title,
            output_text: assessmentText,
        });
        navigate('/library');
    };

    const handleReset = () => {
        setScreen(1);
        setUnitInfo(null);
        setCohortInfo(null);
        setAssessmentText('');
        setMappingText('');
        setBuilding(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#ffffff' }}>
            <BuildHeader />

            {screen === 1 && <Screen1 onConfirm={handleScreen1Confirm} />}
            {screen === 2 && <Screen2 unitInfo={unitInfo} onBack={() => setScreen(1)} onConfirm={handleScreen2Confirm} />}
            {screen === 3 && <Screen3 unitInfo={unitInfo} cohortInfo={cohortInfo} sections={sections} onBack={() => setScreen(2)} onBuild={handleBuild} />}
            {screen === 4 && (building || buildError) && <Screen4Loading onReset={handleReset} progress={buildProgress} buildError={buildError} />}
            {screen === 4 && !building && !buildError && (
                <Screen4Ready
                    unitInfo={unitInfo}
                    cohortInfo={cohortInfo}
                    assessmentText={assessmentText}
                    mappingText={mappingText}
                    onBack={() => setScreen(2)}
                    onReset={handleReset}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}