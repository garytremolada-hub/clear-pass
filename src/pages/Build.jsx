import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCohort } from '@/lib/CohortContext';
import BuildProgress from '@/components/build/BuildProgress.jsx';
import HelpIcon from '@/components/build/HelpIcon.jsx';
import { downloadAsDocx as downloadDocx } from '@/lib/downloadDocx';
import { CheckCircle, Upload, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

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

// ── Loading messages ──────────────────────────────────────────────────────────

const LOADING_MESSAGES = [
    { from: 0,  text: 'Reading your UoC...' },
    { from: 15, text: 'Designing your assessment...' },
    { from: 30, text: 'Checking all requirements...' },
    { from: 45, text: 'Almost ready...' },
];

function useLoadingMessage(active) {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        if (!active) { setElapsed(0); return; }
        const t = setInterval(() => setElapsed(s => s + 1), 1000);
        return () => clearInterval(t);
    }, [active]);
    const msg = [...LOADING_MESSAGES].reverse().find(m => elapsed >= m.from);
    return msg?.text || LOADING_MESSAGES[0].text;
}

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

function Screen4Loading() {
    const msg = useLoadingMessage(true);
    return (
        <div className="flex-1 flex flex-col" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '540px', margin: '0 auto', padding: '32px 24px', width: '100%' }}>
                <BuildProgress step={4} contextNote="" />
                <div style={{ textAlign: 'center', paddingTop: '40px' }}>
                    <Loader2 style={{ color: '#c9a84c', width: '40px', height: '40px', margin: '0 auto 20px', animation: 'spin 1s linear infinite' }} />
                    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                    <h2 style={{ color: '#0d2444', fontSize: '20px', fontWeight: 500, marginBottom: '8px' }}>
                        Building your assessment...
                    </h2>
                    <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>This usually takes about 45 seconds.</p>
                    <p style={{ color: '#9ca3af', fontSize: '13px', fontStyle: 'italic' }}>{msg}</p>
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
        downloadDocx(assessmentText, `${unitInfo.code}-assessment.docx`);
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
            downloadDocx(mappingText, `${unitInfo.code}-mapping-document.docx`);
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
    const [assessmentText, setAssessmentText] = useState('');
    const [mappingText, setMappingText] = useState('');

    const buildCohortProfile = (ci) => {
        const learnerLabel = LEARNER_OPTIONS.find(o => o.value === ci.learner)?.label || ci.learner;
        const supportLabel = SUPPORT_OPTIONS.find(o => o.value === ci.support)?.label || ci.support;
        return `1. Delivery mode: mixed\n2. Learner literacy level: ${ci.support.includes('literacy') ? 'foundation' : 'standard'}\n3. Language background: ${ci.support.includes('esl') ? 'LLNP/ESL cohort' : 'English first language'}\n4. Age group: ${learnerLabel}`;
    };

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
        setScreen(4);

        const cohortBlock = buildCohortProfile(cohortInfo);
        const message = `BUILD MODE — UOC PROVIDED

DOCUMENT 1 — UNIT OF COMPETENCY:
${unitInfo.text}

---

COHORT PROFILE:
${cohortBlock}
Target reading level: ${cohortInfo.band}

Please proceed directly with the BUILD workflow. Do not ask what mode to use. Do not ask for the cohort profile. The UoC and cohort profile are provided above.`;

        try {
            const conv = await base44.agents.createConversation({
                agent_name: 'fk_readability_tool',
                metadata: { name: `Build: ${unitInfo.code}` }
            });

            await base44.agents.addMessage(conv, { role: 'user', content: message });

            // Poll for completion
            await new Promise((resolve) => {
                const unsub = base44.agents.subscribeToConversation(conv.id, (data) => {
                    const last = data.messages?.[data.messages.length - 1];
                    if (last?.role === 'assistant' && last?.content && !last?.is_streaming) {
                        const text = last.content;
                        setAssessmentText(text);

                        // Extract mapping document if present
                        const mapMatch = text.match(/<!--\s*MAPPING_DOCUMENT_START\s*-->([\s\S]*?)<!--\s*MAPPING_DOCUMENT_END\s*-->/);
                        if (mapMatch) {
                            setMappingText(mapMatch[1].trim());
                        }

                        unsub();
                        resolve();
                    }
                });
            });
        } catch (e) {
            setAssessmentText('An error occurred. Please try again.');
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
            {screen === 4 && building && <Screen4Loading />}
            {screen === 4 && !building && (
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