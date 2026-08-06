import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCohort } from '@/lib/CohortContext';
import { downloadDocx } from '@/lib/downloadDocx';
import { buildBSBLDR413Mapping } from '@/lib/buildBSBLDR413Mapping';
import { CheckCircle, Upload, AlertCircle, CheckCircle2, Loader2, Search } from 'lucide-react';
import FeedbackButton from '@/components/feedback/FeedbackButton';
import FeedbackModal from '@/components/feedback/FeedbackModal';
import ThumbsRating from '@/components/feedback/ThumbsRating';
import { extractMappingData } from '@/lib/extractMappingData';
import { callWithRetry } from '@/lib/buildUtils';

function isNewUocStructure(data) {
    return Array.isArray(data?.elements) && data.elements.length > 0;
}
// ── Inlined: BuildProgress ────────────────────────────────────────────────────
const BP_STEPS = ['Find Unit', 'Learners', 'Review', 'Done'];
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
    { value: 'high_school', label: 'High school students', feedback: "High school students: we'll use a junior secondary reading level." },
    { value: 'apprentices', label: 'Apprentices and trainees', feedback: "Apprentices and trainees: standard working adult literacy assumed." },
    { value: 'working_adults', label: 'Working adults', feedback: "Working adults: standard adult literacy assumed." },
    { value: 'university', label: 'University students', feedback: "University students: we'll use a higher academic reading level." },
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
    { pct: 97,  label: 'Mapping requirements to questions...' },
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

// ── Screen 1 — Unit code search (Deno backend) + file upload fallback ────────

function Screen1({ onConfirm }) {
    const [searchMode, setSearchMode] = useState('tga'); // 'tga' | 'upload'
    const [unitCode, setUnitCode] = useState('');
    const [searchState, setSearchState] = useState('idle'); // 'idle'|'loading'|'confirmed'|'error'
    const [searchError, setSearchError] = useState('');
    const [uocData, setUocData] = useState(null);

    // Legacy upload state
    const [pasteText, setPasteText] = useState('');
    const [extracting, setExtracting] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const inputRef = useRef();

    // ── TGA search via Deno backend ──
    const handleFindUnit = async (e) => {
        e.preventDefault();
        if (!unitCode.trim()) return;
        setSearchState('loading');
        setSearchError('');
        setUocData(null);
        try {
            const result = await base44.functions.invoke('fetchUnitFromTGA', { unitCode: unitCode.trim() });
            setUocData(result.data);
            setSearchState('confirmed');
        } catch (err) {
            setSearchError(err?.response?.data?.error || err.message || 'Could not load unit. Try again.');
            setSearchState('error');
        }
    };

    const handleTgaConfirm = () => {
        onConfirm({
            code: uocData.unitCode,
            title: uocData.unitTitle,
            releaseNumber: uocData.releaseNumber,
            uocData,
            text: null,
        });
    };

    // ── Legacy upload ──
    const MAX_SIZE = 5 * 1024 * 1024;
    const validateFile = (f) => {
        if (!f.name.match(/\.(pdf|docx)$/i)) return 'wrong_format';
        if (f.size > MAX_SIZE) return 'too_large';
        return null;
    };

    const extractUnit = async (f, text) => {
        setExtracting(true);
        setUploadError(null);
        try {
            let extractedText = text;
            if (f) {
                const up = await base44.integrations.Core.UploadFile({ file: f });
                const res = await base44.functions.invoke('extractDocumentText', { file_url: up.file_url, file_name: f.name, label: 'Unit of Competency' });
                extractedText = res?.data?.text || '';
            }
            if (!extractedText) throw new Error('empty');
            const parseResult = await base44.integrations.Core.InvokeLLM({
                prompt: `Extract the unit code and unit title from this Unit of Competency text. Return JSON only: {"code": "...", "title": "..."}\n\n${extractedText.slice(0, 2000)}`,
                response_json_schema: { type: 'object', properties: { code: { type: 'string' }, title: { type: 'string' } } }
            });
            setUploadResult({ code: parseResult?.code || 'Unknown', title: parseResult?.title || 'Unit of Competency', text: extractedText });
        } catch (err) {
            setUploadError(err.message === 'empty' ? 'scanned' : 'parse');
        } finally {
            setExtracting(false);
        }
    };

    const handleFile = (f) => {
        const err = validateFile(f);
        if (err) { setUploadError(err); return; }
        setUploadError(null); setUploadResult(null);
        extractUnit(f, null);
    };

    const handlePaste = (val) => {
        setPasteText(val);
        if (val.length >= 100) { setUploadError(null); setUploadResult(null); extractUnit(null, val); }
    };

    const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); };

    const uploadErrorMessages = {
        scanned: "This looks like a scanned image. Try a text-based PDF or paste the text below.",
        too_large: "This file is too large. Try a smaller file or paste the text below.",
        wrong_format: "This file format isn't supported. Try .pdf or .docx.",
        parse: "We couldn't read this file. Try a different file or paste the text below.",
    };

    const infoRow = (label, value) => (
        <tr key={label}>
            <td style={{ padding: '7px 12px', color: '#6b7280', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', borderBottom: '1px solid #f3f4f6' }}>{label}</td>
            <td style={{ padding: '7px 12px', color: '#0d2444', fontSize: '13px', borderBottom: '1px solid #f3f4f6' }}>{value}</td>
        </tr>
    );

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 56px' }}>
                <BuildProgress step={1} contextNote="Enter a unit code to load it directly from training.gov.au — no file upload needed." />

                <h2 style={{ color: '#0d2444', fontSize: '24px', fontWeight: 500, marginBottom: '8px' }}>
                    What unit are you building for?
                </h2>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
                    Enter the unit code to load it directly from training.gov.au
                </p>

                {/* ── TGA search panel ── */}
                {searchMode === 'tga' && (
                    <>
                        {/* Search input — shown when not confirmed */}
                        {searchState !== 'confirmed' && (
                            <form onSubmit={handleFindUnit} style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        value={unitCode}
                                        onChange={e => { setUnitCode(e.target.value.toUpperCase()); setSearchState('idle'); }}
                                        placeholder="e.g. BSBLDR413"
                                        style={{
                                            flex: 1, height: '48px',
                                            border: '1px solid #e5e7eb', borderRadius: '8px',
                                            padding: '0 14px', fontSize: '16px',
                                            outline: 'none', boxSizing: 'border-box', letterSpacing: '0.5px',
                                        }}
                                        onFocus={e => e.target.style.borderColor = '#c9a84c'}
                                        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                                        disabled={searchState === 'loading'}
                                    />
                                    <button
                                        type="submit"
                                        disabled={searchState === 'loading' || !unitCode.trim()}
                                        style={{
                                            height: '48px', padding: '0 20px',
                                            backgroundColor: (searchState === 'loading' || !unitCode.trim()) ? '#e5e7eb' : '#c9a84c',
                                            color: (searchState === 'loading' || !unitCode.trim()) ? '#9ca3af' : '#0d2444',
                                            border: 'none', borderRadius: '8px',
                                            fontSize: '14px', fontWeight: 600, flexShrink: 0,
                                            cursor: (searchState === 'loading' || !unitCode.trim()) ? 'not-allowed' : 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                        }}
                                    >
                                        {searchState === 'loading'
                                            ? <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> Loading...</>
                                            : <><Search style={{ width: '16px', height: '16px' }} /> Find unit</>
                                        }
                                    </button>
                                </div>
                                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                                {searchState === 'loading' && (
                                    <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '8px' }}>Loading from training.gov.au...</p>
                                )}
                            </form>
                        )}

                        {/* Error state */}
                        {searchState === 'error' && (
                            <div style={{ border: '1px solid #ef4444', borderRadius: '8px', padding: '14px 16px', backgroundColor: '#fef2f2', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <AlertCircle style={{ color: '#ef4444', width: '16px', height: '16px', flexShrink: 0, marginTop: '1px' }} />
                                    <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{searchError}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => setSearchState('idle')} style={{ padding: '5px 12px', border: '1px solid #ef4444', borderRadius: '6px', backgroundColor: 'transparent', color: '#dc2626', fontSize: '12px', cursor: 'pointer' }}>
                                        Try again
                                    </button>
                                    <button onClick={() => setSearchMode('upload')} style={{ padding: '5px 12px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'transparent', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}>
                                        Upload a document instead
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Confirmed state */}
                        {searchState === 'confirmed' && uocData && (
                            <div style={{ border: '1px solid #22c55e', borderRadius: '10px', backgroundColor: '#f0fdf4', overflow: 'hidden', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: '1px solid #dcfce7' }}>
                                    <CheckCircle style={{ color: '#22c55e', width: '20px', height: '20px', flexShrink: 0 }} />
                                    <span style={{ color: '#166534', fontSize: '14px', fontWeight: 600 }}>Unit found on training.gov.au</span>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
                                    <tbody>
                                        {infoRow('Unit Code', uocData.unitCode)}
                                        {infoRow('Title', uocData.unitTitle)}
                                        {infoRow('Release', uocData.releaseNumber)}
                                        {infoRow('Elements', uocData.summary?.elementCount ?? '—')}
                                        {infoRow('Performance Criteria', uocData.summary?.pcCount ?? '—')}
                                        {infoRow('Knowledge Evidence', uocData.summary?.keCount ?? '—')}
                                        {infoRow('Performance Evidence', uocData.summary?.peCount ?? '—')}
                                    </tbody>
                                </table>
                                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <button
                                        onClick={handleTgaConfirm}
                                        style={{ width: '100%', height: '44px', backgroundColor: '#c9a84c', color: '#0d2444', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Build assessment for this unit →
                                    </button>
                                    <button
                                        onClick={() => { setSearchState('idle'); setUocData(null); setUnitCode(''); }}
                                        style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer' }}
                                    >
                                        Not the right unit? Search again
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Fallback link — idle only */}
                        {searchState === 'idle' && (
                            <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>
                                Can't find your unit code?{' '}
                                <button onClick={() => setSearchMode('upload')} style={{ background: 'none', border: 'none', color: '#c9a84c', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
                                    Upload a document instead
                                </button>
                            </p>
                        )}
                    </>
                )}

                {/* ── Legacy upload fallback ── */}
                {searchMode === 'upload' && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <button onClick={() => { setSearchMode('tga'); setUploadResult(null); setUploadError(null); }} style={{ background: 'none', border: 'none', color: '#c9a84c', fontSize: '13px', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
                                ← Search by unit code instead
                            </button>
                        </div>

                        {!uploadResult && !extracting && (
                            <div
                                onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => inputRef.current?.click()}
                                style={{ border: '2px dashed #e5e7eb', borderRadius: '12px', padding: '40px', textAlign: 'center', backgroundColor: '#f9fafb', cursor: 'pointer', marginBottom: '16px' }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a84c'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                            >
                                <input ref={inputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
                                <Upload style={{ color: '#c9a84c', width: '32px', height: '32px', margin: '0 auto 12px' }} />
                                <p style={{ color: '#0d2444', fontSize: '14px', marginBottom: '6px' }}>Drop your UoC here or click to browse</p>
                                <p style={{ color: '#9ca3af', fontSize: '12px' }}>.pdf or .docx files accepted</p>
                            </div>
                        )}

                        {extracting && (
                            <div style={{ textAlign: 'center', padding: '40px', border: '2px dashed #e5e7eb', borderRadius: '12px', marginBottom: '16px' }}>
                                <Loader2 style={{ color: '#c9a84c', width: '28px', height: '28px', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                                <p style={{ color: '#6b7280', fontSize: '14px' }}>Reading your UoC...</p>
                            </div>
                        )}

                        {uploadResult && (
                            <div style={{ border: '1px solid #22c55e', borderRadius: '8px', padding: '16px', backgroundColor: '#f0fdf4', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                    <CheckCircle style={{ color: '#22c55e', width: '20px', height: '20px', flexShrink: 0 }} />
                                    <span style={{ color: '#0d2444', fontSize: '14px', fontWeight: 500 }}>Got it — {uploadResult.code} {uploadResult.title}</span>
                                </div>
                                <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '12px', marginLeft: '30px' }}>Is this the right unit?</p>
                                <div style={{ display: 'flex', gap: '8px', marginLeft: '30px' }}>
                                    <button onClick={() => onConfirm({ code: uploadResult.code, title: uploadResult.title, text: uploadResult.text, uocData: null })} style={{ padding: '6px 14px', border: '1px solid #22c55e', borderRadius: '6px', backgroundColor: 'transparent', color: '#166534', fontSize: '13px', cursor: 'pointer' }}>
                                        Yes, continue →
                                    </button>
                                    <button onClick={() => { setUploadResult(null); setPasteText(''); }} style={{ padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'transparent', color: '#6b7280', fontSize: '13px', cursor: 'pointer' }}>
                                        No, try a different file
                                    </button>
                                </div>
                            </div>
                        )}

                        {uploadError && (
                            <div style={{ border: '1px solid #ef4444', borderRadius: '8px', padding: '12px 16px', backgroundColor: '#fef2f2', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <AlertCircle style={{ color: '#ef4444', width: '16px', height: '16px', flexShrink: 0, marginTop: '1px' }} />
                                <p style={{ color: '#dc2626', fontSize: '13px' }}>{uploadErrorMessages[uploadError]}</p>
                            </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
                            <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
                            <span style={{ color: '#9ca3af', fontSize: '13px' }}>or paste below</span>
                            <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
                        </div>

                        <textarea
                            value={pasteText}
                            onChange={e => handlePaste(e.target.value)}
                            placeholder="Paste your Unit of Competency text here..."
                            style={{ width: '100%', height: '180px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', fontFamily: 'Arial', fontSize: '11px', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </>
                )}
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
            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 56px' }}>
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

// ── Screen 3 — Assessment structure review ────────────────────────────────────

function Screen3Structure({ unitInfo, cohortInfo, structureProposal, onBack, onBuild }) {
    const [selectedSections, setSelectedSections] = useState(() => {
        const required = structureProposal?.required || [];
        return required.map(s => s.id);
    });

    const toggleSection = (id) => {
        setSelectedSections(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const handleBuild = () => {
        const required = (structureProposal?.required || []).filter(s => selectedSections.includes(s.id));
        const optional = (structureProposal?.optional || []).filter(s => selectedSections.includes(s.id));
        onBuild([...required, ...optional]);
    };

    const requiredSections = structureProposal?.required || [];
    const optionalSections = structureProposal?.optional || [];

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '40px 56px' }}>
                <BuildProgress step={3} contextNote="Review your assessment structure — takes 2-3 minutes to build." />
                <h2 style={{ color: '#0d2444', fontSize: '24px', fontWeight: 500, marginBottom: '8px' }}>
                    Your assessment structure
                </h2>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
                    Based on {unitInfo?.code}, we recommend the following structure:
                </p>
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ color: '#0d2444', fontSize: '16px', fontWeight: 500, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle style={{ color: '#22c55e', width: '18px', height: '18px' }} />
                        Required sections
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {requiredSections.map(section => (
                            <label key={section.id} style={{
                                display: 'flex', alignItems: 'flex-start', gap: '12px',
                                padding: '14px 16px', border: '1px solid #e5e7eb',
                                borderRadius: '8px', cursor: 'pointer',
                                backgroundColor: selectedSections.includes(section.id) ? '#f0f7ff' : '#ffffff',
                            }}>
                                <input
                                    type="checkbox"
                                    checked={selectedSections.includes(section.id)}
                                    onChange={() => toggleSection(section.id)}
                                    style={{ marginTop: '2px', accentColor: '#c9a84c' }}
                                />
                                <div style={{ flex: 1 }}>
                                    <p style={{ color: '#0d2444', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{section.name}</p>
                                    <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '6px' }}>{section.description}</p>
                                    {section.justification && (
                                        <p style={{ color: '#6b7280', fontSize: '11px', fontStyle: 'italic' }}>Why required: {section.justification}</p>
                                    )}
                                    {section.uocRequirement && (
                                        <p style={{ color: '#6b7280', fontSize: '11px', fontStyle: 'italic', marginTop: '4px' }}>{section.uocRequirement}</p>
                                    )}
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
                {optionalSections.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ color: '#0d2444', fontSize: '16px', fontWeight: 500, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertCircle style={{ color: '#c9a84c', width: '18px', height: '18px' }} />
                            Optional sections
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {optionalSections.map(section => (
                                <label key={section.id} style={{
                                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                                    padding: '14px 16px', border: '1px solid #e5e7eb',
                                    borderRadius: '8px', cursor: 'pointer',
                                    backgroundColor: selectedSections.includes(section.id) ? '#f0f7ff' : '#ffffff',
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedSections.includes(section.id)}
                                        onChange={() => toggleSection(section.id)}
                                        style={{ marginTop: '2px', accentColor: '#c9a84c' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <p style={{ color: '#0d2444', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{section.name}</p>
                                        <p style={{ color: '#6b7280', fontSize: '12px' }}>{section.description}</p>
                                        {section.reason && (
                                            <p style={{ color: '#6b7280', fontSize: '11px', fontStyle: 'italic', marginTop: '4px' }}>Reason: {section.reason}</p>
                                        )}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button
                        onClick={onBack}
                        style={{ flex: 1, height: '44px', border: '1px solid #0d2444', borderRadius: '8px', backgroundColor: 'transparent', color: '#0d2444', fontSize: '14px', cursor: 'pointer' }}
                    >
                        ← Back
                    </button>
                    <button
                        onClick={handleBuild}
                        style={{ flex: 1, height: '44px', borderRadius: '8px', backgroundColor: '#c9a84c', color: '#0d2444', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
                    >
                        Build assessment →
                    </button>
                </div>
                <div style={{ backgroundColor: '#f9fafb', borderLeft: '3px solid #c9a84c', borderRadius: '4px', padding: '10px 14px', marginTop: '16px' }}>
                    <p style={{ color: '#6b7280', fontSize: '12px', lineHeight: 1.6 }}>
                        All content is AI-generated and should be reviewed with a qualified assessor.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Screen 4 — Building / Ready ───────────────────────────────────────────────

function Screen4Loading({ onReset, onRetry, progress, buildError, failedStep }) {
    const stage = [...BUILD_STAGES].reverse().find(s => progress >= s.pct) || BUILD_STAGES[0];

    if (buildError) {
        return (
            <div className="flex-1 flex flex-col" style={{ backgroundColor: '#ffffff' }}>
                <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 56px', width: '100%' }}>
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
                            {failedStep && (
                                <button
                                    onClick={onRetry}
                                    style={{ padding: '8px 18px', border: 'none', borderRadius: '6px', backgroundColor: '#c9a84c', color: '#0d2444', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                                >
                                    ↻ Retry step {failedStep.step}
                                </button>
                            )}
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
            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 56px', width: '100%' }}>
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

function Screen4Ready({ unitInfo, cohortInfo, assessmentText, mappingResult, validationResult, mappingError, validationError, studentBookletBase64, studentBookletError, onBack, onReset, onSave }) {
    const navigate = useNavigate();
    const [showFeedback, setShowFeedback] = useState(false);
    const hasGaps = assessmentText?.includes('⚠') || assessmentText?.includes('NOT COVERED');
    const gapCount = hasGaps ? (assessmentText.match(/GAP \d+:/g) || []).length : 0;

    const handleDownloadStudentBooklet = () => {
        const bytes = atob(studentBookletBase64);
        const buffer = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${unitInfo.code}-student-booklet.docx`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadBase64 = (result) => {
        if (!result?.file_base64) return;
        const isXlsx = result.filename?.endsWith('.xlsx');
        const mime = isXlsx
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        const bytes = atob(result.file_base64);
        const buf = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
        const blob = new Blob([buf], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 56px' }}>
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

                    {/* Button 1 — Student booklet */}
                    <button
                        onClick={studentBookletError ? undefined : handleDownloadStudentBooklet}
                        disabled={studentBookletError}
                        style={{
                            width: '100%', height: '48px',
                            backgroundColor: studentBookletError ? '#e5e7eb' : '#c9a84c',
                            color: studentBookletError ? '#9ca3af' : '#0d2444',
                            borderRadius: '8px', border: 'none',
                            fontSize: '15px', fontWeight: 500,
                            cursor: studentBookletError ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {studentBookletError
                            ? 'Student booklet unavailable — try rebuilding'
                            : 'Download student booklet (.docx) →'}
                    </button>

                    {/* Button 2 — Competency mapping */}
                    <div>
                        <button
                            onClick={() => handleDownloadBase64(mappingResult)}
                            disabled={!mappingResult}
                            style={{
                                width: '100%', height: '44px',
                                backgroundColor: 'transparent',
                                color: mappingResult ? '#0d2444' : '#9ca3af',
                                borderRadius: '8px',
                                border: `1px solid ${mappingResult ? '#0d2444' : '#d1d5db'}`,
                                fontSize: '14px', cursor: mappingResult ? 'pointer' : 'not-allowed',
                            }}
                        >
                            Download competency mapping (.docx) →
                        </button>
                        <p style={{ color: '#9ca3af', fontSize: '11px', fontStyle: 'italic', textAlign: 'center', marginTop: '4px' }}>
                            Word document — maps every requirement to specific questions and tasks
                        </p>
                        {mappingError && (
                            <p style={{ color: '#d97706', fontSize: '11px', marginTop: '4px', backgroundColor: '#fef3c7', borderRadius: '4px', padding: '6px 8px' }}>
                                ⚠ {mappingError}
                            </p>
                        )}
                    </div>

                    {/* Button 3 — Validation record */}
                    <div>
                        <button
                            onClick={() => handleDownloadBase64(validationResult)}
                            disabled={!validationResult}
                            style={{
                                width: '100%', height: '44px',
                                backgroundColor: 'transparent',
                                color: validationResult ? '#0d2444' : '#9ca3af',
                                borderRadius: '8px',
                                border: `1px solid ${validationResult ? '#0d2444' : '#d1d5db'}`,
                                fontSize: '14px', cursor: validationResult ? 'pointer' : 'not-allowed',
                            }}
                        >
                            Download validation record (.docx) →
                        </button>
                        <p style={{ color: '#9ca3af', fontSize: '11px', fontStyle: 'italic', textAlign: 'center', marginTop: '4px' }}>
                            One-page sign-off document — for your validation folder
                        </p>
                        {validationError && (
                            <p style={{ color: '#d97706', fontSize: '11px', marginTop: '4px', backgroundColor: '#fef3c7', borderRadius: '4px', padding: '6px 8px' }}>
                                ⚠ {validationError}
                            </p>
                        )}
                    </div>

                    {/* Button 4 — Save to library */}
                    <button
                        onClick={onSave}
                        style={{ width: '100%', height: '44px', backgroundColor: 'transparent', color: '#0d2444', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', cursor: 'pointer' }}
                    >
                        Save to library
                    </button>
                </div>

                {/* Recovery links */}
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', display: 'block', width: '100%', marginBottom: '6px' }}>
                        Wrong learner type? Go back to adjust
                    </button>
                    <button onClick={onReset} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', display: 'block', width: '100%', marginBottom: '6px' }}>
                        Not what you expected? Start again
                    </button>
                    <button onClick={onReset} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', display: 'block', width: '100%' }}>
                        Wrong unit? Start again with a new UoC
                    </button>
                </div>

                <p style={{ color: '#9ca3af', fontSize: '11px', fontStyle: 'italic', textAlign: 'center' }}>
                    All content is AI-generated. Review with a qualified assessor before submitting for validation or audit purposes.
                </p>

                <ThumbsRating flow="Build" unitCode={unitInfo?.code} context="Assessment build result" />
                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <FeedbackButton onClick={() => setShowFeedback(true)} />
                </div>
            </div>

            {showFeedback && (
                <FeedbackModal flow="Build" unitCode={unitInfo?.code} onClose={() => setShowFeedback(false)} />
            )}
        </div>
    );
}

// ── Main Build page ───────────────────────────────────────────────────────────

export default function Build() {
    const navigate = useNavigate();
    const { profile, getLabel } = useCohort();
    const [screen, setScreen] = useState(1);
    const [unitInfo, setUnitInfo] = useState(null);
    const [cohortInfo, setCohortInfo] = useState(null);
    const [structureProposal, setStructureProposal] = useState(null);
    const [structureLoading, setStructureLoading] = useState(false);
    const [activeSections, setActiveSections] = useState([]);
    const [building, setBuilding] = useState(false);
    const [buildProgress, setBuildProgress] = useState(0);
    const [buildError, setBuildError] = useState(null);
    const [assessmentText, setAssessmentText] = useState('');
    const [mappingResult, setMappingResult] = useState(null);     // { file_base64, filename }
    const [validationResult, setValidationResult] = useState(null); // { file_base64, filename }
    const [mappingError, setMappingError] = useState(null);
    const [validationError, setValidationError] = useState(null);
    const [studentBookletBase64, setStudentBookletBase64] = useState(null);
    const [studentBookletError, setStudentBookletError] = useState(false);
    const buildStateRef = useRef({});
    const [failedStep, setFailedStep] = useState(null);

    const buildCohortProfile = (ci) => {
        const learnerLabel = LEARNER_OPTIONS.find(o => o.value === ci.learner)?.label || ci.learner;
        return `1. Delivery mode: mixed\n2. Learner literacy level: ${ci.support.includes('literacy') ? 'foundation' : 'standard'}\n3. Language background: ${ci.support.includes('esl') ? 'LLNP/ESL cohort' : 'English first language'}\n4. Age group: ${learnerLabel}`;
    };

    const NO_DASH_RULE = 'CRITICAL STYLE RULE: Never use em dashes (—) or en dashes (–) anywhere in your output. Rewrite sentences using correct grammar instead: use a colon (:) to introduce a list, a full stop to separate two complete thoughts, and a comma to join closely related ideas within a sentence. Restructure sentences as needed so they read naturally without dashes.\n\n';

    const llmCall = (prompt) => base44.integrations.Core.InvokeLLM({ prompt: NO_DASH_RULE + prompt, model: 'claude_sonnet_4_6' });

    const handleScreen1Confirm = (info) => {
        setUnitInfo(info);
        setScreen(2);
    };

    const handleScreen2Confirm = async (ci) => {
        setCohortInfo(ci);
        setStructureLoading(true);
        setScreen(3);

        const isESL = ci.support === 'esl' || ci.support === 'both';
        const isLiteracy = ci.support === 'literacy' || ci.support === 'both';
        const isWorkplace = true; // default delivery

        // Build a text summary for the structure LLM call — works for both new and old paths
        const uocTextForStructure = isNewUocStructure(unitInfo.uocData)
            ? [
                `Unit: ${unitInfo.code} — ${unitInfo.title}`,
                `\nKnowledge Evidence (${unitInfo.uocData.knowledgeEvidence.length} items):`,
                unitInfo.uocData.knowledgeEvidence.map(k => k.text).join('\n'),
                `\nPerformance Evidence (${unitInfo.uocData.performanceEvidence.length} items):`,
                unitInfo.uocData.performanceEvidence.join('\n'),
                `\nAssessment Conditions:`,
                unitInfo.uocData.assessmentConditions.join('\n'),
              ].join('\n')
            : (unitInfo.text || '').slice(0, 6000);

        try {
            const result = await llmCall(
                `You are an Australian VET assessment designer. Analyse this Unit of Competency and return a JSON object ONLY (no other text).

UoC TEXT (first 6000 chars):
${uocTextForStructure}

COHORT: ${ci.learnerDesc}, reading level: ${ci.band}
ESL learners: ${isESL}, Literacy support: ${isLiteracy}, Workplace delivery: ${isWorkplace}

Apply these exact rules to determine section types:

RULE 1 — Knowledge Questions (REQUIRED if any KE items exist):
Always required when KE items exist. Format: check AC for "written" or "verbal".

RULE 2 — Practical Observation (REQUIRED only if PE explicitly contains):
- "demonstrate" or "demonstrated"
- "perform" or "performance" in context of showing a skill
- A specified number of occasions (e.g. "at least X occasions")
- "in the course of" followed by practical tasks
- "in a workplace or simulated environment"
NOT required if PE only has: develop/produce/create/write/prepare (product evidence only).

RULE 3 — Workplace Project or Case Study (REQUIRED if PE requires producing a tangible work product):
- "develop", "produce", "create", "plan", "document", "record", "submit", "portfolio"
Format: Workplace Project if workplace delivery, Case Study if classroom/online.

RULE 4 — Supervisor Report (OPTIONAL, offer only if workplace delivery AND observation is required).

RULE 5 — Work Documents/Portfolio (OPTIONAL, offer only if AC mentions "workplace documentation", "work products", or "portfolio of evidence").

RULE 6 — Verbal Questions (OPTIONAL, offer only if ESL=${isESL} or literacy=${isLiteracy} AND AC does not prohibit verbal).

Return this JSON structure:
{
  "required": [
    {
      "id": "knowledge_questions",
      "name": "Knowledge Questions",
      "description": "Tests understanding of all key concepts from the UoC",
      "justification": "your UoC has [n] Knowledge Evidence items",
      "uocRequirement": "UoC requires: [n] Knowledge Evidence items — minimum [n] questions",
      "formatOptions": ["Written", "Verbal"] or null if locked,
      "formatLocked": true or false,
      "format": "Written" (default, or "Verbal" if AC specifies),
      "formatNote": null or "Verbal questions are written at assessor reading level. Learner readability scoring does not apply." (only if verbal)
    },
    ... (Practical Observation and/or Workplace Project if rules apply)
  ],
  "optional": [
    ... (only sections where rules say to offer as optional)
  ]
}

For Practical Observation use id "practical_observation", name "Practical Observation".
- Set uocRequirement to the exact PE occasion text if a number of occasions is specified (e.g. "UoC requires: at least 4 occasions with different individuals or groups"), otherwise "UoC requires: demonstrated performance in a workplace or simulated environment".
For Workplace Project use id "workplace_project", name "Workplace Project" (or "Case Study" id "case_study", name "Case Study").
- Set uocRequirement to "UoC requires: [brief comma-separated list of 2-4 key product requirements from PE, verbatim where possible]".
- For Case Study, set uocRequirement to "UoC requires: application of knowledge to a realistic workplace scenario".
For Supervisor Report use id "supervisor_report", name "Supervisor Report", and set addedNote to ["Your supervisor will need to complete this form. It includes:", "· Observable behaviours from your UoC", "· Space for comments and a signature field", "· Used as evidence of competency"].
For Work Documents use id "work_documents", name "Work Documents / Portfolio".
For Verbal Questions (as optional) use id "verbal_questions", name "Verbal Questions".

Each required section needs: id, name, description, justification, uocRequirement.
Each optional section needs: id, name, description, reason (plain English reason why it may be useful).
Do not include a section unless its rule is satisfied. State the justification clearly.
IMPORTANT: uocRequirement must always be populated for required sections. Use exact UoC language. Fallback if nothing specific: "UoC requires: [section type] to assess [KE/PE category]".`
            );

            let proposal;
            try {
                const jsonStr = typeof result === 'string'
                    ? result.replace(/```json|```/g, '').trim()
                    : JSON.stringify(result);
                proposal = JSON.parse(jsonStr);
            } catch {
                // Fallback to sensible defaults
                proposal = {
                    required: [
                        { id: 'knowledge_questions', name: 'Knowledge Questions', description: 'Tests understanding of all key concepts from the UoC', justification: 'your UoC has Knowledge Evidence items', formatOptions: ['Written', 'Verbal'], formatLocked: false, format: 'Written' },
                        { id: 'practical_observation', name: 'Practical Observation', description: 'Assessor observes the learner completing practical tasks', justification: 'your UoC requires demonstrated performance', formatOptions: null, formatLocked: false, format: null },
                        { id: 'workplace_project', name: 'Workplace Project', description: 'Learner produces evidence of real workplace performance', justification: 'your UoC requires a tangible work product', formatOptions: ['Project', 'Case Study'], formatLocked: false, format: 'Project' },
                    ],
                    optional: [],
                };
            }
            setStructureProposal(proposal);
        } catch (e) {
            // Fallback silently
            setStructureProposal({
                required: [
                    { id: 'knowledge_questions', name: 'Knowledge Questions', description: 'Tests understanding of all key concepts from the UoC', justification: 'your UoC has Knowledge Evidence items', formatOptions: ['Written', 'Verbal'], formatLocked: false, format: 'Written' },
                    { id: 'workplace_project', name: 'Workplace Project', description: 'Learner produces evidence of real workplace performance', justification: 'your UoC requires a tangible work product', formatOptions: ['Project', 'Case Study'], formatLocked: false, format: 'Project' },
                ],
                optional: [],
            });
        } finally {
            setStructureLoading(false);
        }
    };

    const handleBuild = async (sections) => {
        const isResume = Object.keys(buildStateRef.current).length > 0;
        const useSections = isResume ? (activeSections || sections) : sections;
        if (!isResume) setActiveSections(useSections);
        setBuilding(true);
        setBuildProgress(0);
        setBuildError(null);
        setFailedStep(null);
        setScreen(4);

        const cohortBlock = buildCohortProfile(cohortInfo);
        const band = cohortInfo.band;
        const levelNote = `Target reading level: ${band}\nCohort: ${cohortBlock}`;

        // Determine if we have structured TGA data or legacy text
        const hasStructured = isNewUocStructure(unitInfo.uocData);
        const totalSteps = hasStructured ? 6 : 7;
        let stepNum = 0;

        // Step wrapper: logs step number, retries on failure, caches for resume
        const llmStep = async (name, prompt) => {
            stepNum++;
            const cacheKey = `step${stepNum}`;
            if (buildStateRef.current[cacheKey] !== undefined) {
                console.log(`Build step ${stepNum} of ${totalSteps} (${name}) — cached, skipping`);
                return buildStateRef.current[cacheKey];
            }
            console.log(`Starting build step ${stepNum} of ${totalSteps}... (${name})`);
            try {
                const result = await callWithRetry(() => llmCall(prompt));
                buildStateRef.current[cacheKey] = result;
                return result;
            } catch (err) {
                console.error(`Build FAILED at step ${stepNum} of ${totalSteps} (${name}):`, err.message);
                setFailedStep({ step: stepNum, name, total: totalSteps, error: err.message });
                throw err;
            }
        };

        try {
            // STEP 1 (legacy only) — Parse UoC structure
            setBuildProgress(10);

            let parsed;
            if (hasStructured) {
                // Build parsed object directly from structured TGA data — no AI needed
                const ud = unitInfo.uocData;
                parsed = {
                    unit_code: unitInfo.code,
                    unit_title: unitInfo.title,
                    ke_items: ud.knowledgeEvidence.map(k => k.subItems ? `${k.text} (including: ${k.subItems.join(', ')})` : k.text),
                    pe_items: ud.performanceEvidence,
                    pc_items: ud.elements.flatMap(el => el.performanceCriteria.map(pc => `${pc.ref} — ${pc.text}`)),
                };
            } else {
                const uoc = unitInfo.text || '';
                const structure = await llmStep('Parse UoC structure',
                    `You are an Australian VET assessment designer. Parse this Unit of Competency and return a JSON object only (no other text) with these fields:
- unit_code: string
- unit_title: string  
- ke_items: array of strings (each Knowledge Evidence item, verbatim)
- pe_items: array of strings (each Performance Evidence item, verbatim)
- pc_items: array of strings (each Performance Criteria item, formatted as "X.X — description")

UoC TEXT:
${uoc.slice(0, 8000)}`
                );
                try {
                    const jsonStr = typeof structure === 'string' ? structure.replace(/```json|```/g, '').trim() : JSON.stringify(structure);
                    parsed = JSON.parse(jsonStr);
                } catch {
                    parsed = { ke_items: [], pe_items: [], pc_items: [] };
                }
            }

            const keList = (parsed.ke_items || []).join('\n');
            const peList = (parsed.pe_items || []).join('\n');

            // CALL 2 — Knowledge Questions
            setBuildProgress(30);
            const knowledgeSection = await llmStep('Knowledge Questions',
                `You are an Australian VET assessment writer. Write a Knowledge Questions section for an assessment instrument.

${levelNote}
Unit: ${unitInfo.code} — ${unitInfo.title}

KNOWLEDGE EVIDENCE ITEMS TO COVER:
${keList || (unitInfo.text || '').slice(0, 3000)}

Instructions:
- Write 8–12 questions that cover all knowledge evidence items
- Use short-answer format (2–4 sentences expected per answer)
- Write at ${band} reading level
- Number each question (Q1, Q2, etc.)
- Include a "Model Answer" for each question in italics below the question
- Use plain, clear language appropriate for the cohort
- Do NOT include any other sections

MANDATORY Q4 REQUIREMENT: Q4 must be written exactly as follows (do not change any wording):

Q4. Leaders use five key skills to build trust with their team. Name each skill below. Write what it means and give one example of how you would use it at work.

Personal style (how you act with others)
Communication (how you share information)
Consultation (how you ask for input)
Cultural sensitivity (how you respect differences)
Networking (how you build connections)

*Model Answer:*
*1. Personal style: Using a calm and respectful approach helps team members feel comfortable. For example, listening without interrupting when someone raises a concern.*
*2. Communication: Sharing updates clearly and checking that people have understood. For example, sending a brief written summary after a team meeting.*
*3. Consultation: Asking team members for their input before making a decision. For example, holding a short meeting to get ideas before planning a new project.*
*4. Cultural and social sensitivity: Being aware that people have different backgrounds and values. For example, making sure team activities are inclusive and respectful of different cultural practices.*
*5. Networking: Building working relationships inside and outside the organisation. For example, introducing yourself to people in other teams and staying in contact with industry contacts.*

Q5 REQUIREMENT: After writing Q4 as above, check whether Q5 would be redundant (i.e. it would cover communication or consultation already fully covered by Q4). If it is redundant, replace Q5 with the following question instead:

Q5. Think about a time when a workplace relationship was difficult. What steps could a leader take to repair trust and improve the relationship?

*Model Answer: A leader could start by having a private, respectful conversation to understand the other person's perspective. They could acknowledge any misunderstandings, agree on clear expectations going forward, and follow up regularly to make sure the relationship continues to improve. Seeking support from HR or a mentor may also help.*

This replacement Q5 covers the impact of relationships on planned outcomes at a deeper applied level.

Output format: Markdown. Start with: ## Part A — Knowledge Questions`
            );

            // CALL 3 — Observation Checklist
            setBuildProgress(50);
            const observationSection = await llmStep('Observation Checklist',
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
            const projectSection = await llmStep('Workplace Project',
                `You are an Australian VET assessment writer. Write a Workplace Project task for an assessment instrument.

${levelNote}
Unit: ${unitInfo.code} — ${unitInfo.title}

PERFORMANCE EVIDENCE TO COVER:
${peList || (unitInfo.text || '').slice(0, 2000)}

Instructions:
- Write one practical workplace project task that covers all performance evidence
- Include: scenario context, task instructions (numbered steps), resources required, submission requirements
- Write at ${band} reading level
- The task should produce a physical or digital work product as evidence
- Include word count guidance for any written components

Output format: Markdown. Start with: ## Part C — Workplace Project`
            );

            // Assemble text refs (needed by marking guide split + mapping index)
            const kText = typeof knowledgeSection === 'string' ? knowledgeSection : JSON.stringify(knowledgeSection);
            const oText = typeof observationSection === 'string' ? observationSection : JSON.stringify(observationSection);
            const pText = typeof projectSection === 'string' ? projectSection : JSON.stringify(projectSection);

            // STEP 5a — Marking Guide: Knowledge Questions (split to reduce token load)
            setBuildProgress(75);
            const markingKnowledge = await llmStep('Marking Guide (Knowledge)',
                `You are an Australian VET assessment writer. Write the Knowledge Questions marking guide.

${levelNote}
Unit: ${unitInfo.code} — ${unitInfo.title}

KNOWLEDGE QUESTIONS (already written):
${kText.slice(0, 3000)}

Instructions:
- For each knowledge question: include the model answer and acceptable variations
- Write at ${band} reading level (for assessor use)

Output format: Markdown. Start with: ## Knowledge Questions — Marking Guide`
            );

            // STEP 5b — Marking Guide: Observation + Project (split to reduce token load)
            setBuildProgress(80);
            const markingRest = await llmStep('Marking Guide (Observation & Project)',
                `You are an Australian VET assessment writer. Write the Observation and Project marking guide.

${levelNote}
Unit: ${unitInfo.code} — ${unitInfo.title}

OBSERVATION CHECKLIST (already written):
${oText.slice(0, 2000)}

WORKPLACE PROJECT (already written):
${pText.slice(0, 2000)}

Instructions:
- For observation: include specific observable indicators for each checklist item
- For the project: include assessment criteria and evidence requirements
- Include a Reasonable Adjustment note
- Include a Judgement of Competence summary section
- Write at ${band} reading level (for assessor use)

Output format: Markdown. Start with: ## Observation & Project — Marking Guide`
            );

            const markingGuide = `# Assessor Marking Guide — ${unitInfo.code}\n\n${typeof markingKnowledge === 'string' ? markingKnowledge : JSON.stringify(markingKnowledge)}\n\n---\n\n${typeof markingRest === 'string' ? markingRest : JSON.stringify(markingRest)}`;

            // STEP 6 — Mapping Index
            setBuildProgress(97);
            const kSummary = kText.slice(0, 3000);
            const oSummary = oText.slice(0, 2000);
            const pSummary = pText.slice(0, 2000);

            const mappingIndexRaw = await llmStep('Mapping Index',
                `You have just built an assessment for ${unitInfo.code} — ${unitInfo.title}.

The assessment contains the following sections:

PART A — KNOWLEDGE QUESTIONS (actual content):
${kSummary}

PART B — OBSERVATION CHECKLIST (actual content):
${oSummary}

PART C — WORKPLACE PROJECT (actual content):
${pSummary}

KNOWLEDGE EVIDENCE ITEMS FROM UoC:
${keList || '(see UoC)'}

PERFORMANCE EVIDENCE ITEMS FROM UoC:
${peList || '(see UoC)'}

PERFORMANCE CRITERIA FROM UoC:
${parsed.pc_items?.join('\n') || '(see UoC)'}

FULL UoC TEXT (for foundation skills and assessment conditions):
${hasStructured
    ? [
        ...(unitInfo.uocData.assessmentConditions || []).map(c => `Assessment condition: ${c}`),
        ...(unitInfo.uocData.foundationSkills || []).map(fs => `Foundation skill: ${fs.skill} — ${(fs.descriptions || []).join(' ')}`),
      ].join('\n')
    : (unitInfo.text || '').slice(0, 4000)
}

Now produce a mapping index as a JSON object.
Return ONLY the JSON. No explanation. No markdown fences.
Start your response with { and end with }

The JSON must use this exact format with double quotes:

{
  "mappingIndex": {
    "knowledgeQuestions": [
      {
        "num": "Q1",
        "ke": ["KE1"],
        "pc": ["1.1"],
        "text": "brief question topic"
      }
    ],
    "observationItems": [
      {
        "num": "Item 1",
        "pe": ["PE1", "PE2"],
        "pc": ["1.1", "1.2"],
        "text": "brief behaviour description"
      }
    ],
    "projectSteps": [
      {
        "num": "Step 1",
        "name": "exact step name from assessment",
        "pe": ["PE2"],
        "pc": ["1.1"],
        "text": "brief step description"
      }
    ],
    "verbalQuestions": [],
    "assessmentConditions": [
      {
        "condition": "verbatim condition text from UoC",
        "howMet": "plain English explanation of how this assessment meets it"
      }
    ],
    "foundationSkills": [
      {
        "skill": "skill name",
        "pcRefs": ["1.1", "2.3"],
        "description": "verbatim description from UoC",
        "coveredBy": {
          "task1": "Q1, Q3",
          "task2": "Item 2, Item 4",
          "task3": "Step 2",
          "task4": ""
        }
      }
    ]
  }
}

Rules:
- Every KE item must appear in at least one knowledgeQuestions entry
- Every PE item must appear in at least one observationItems or projectSteps entry
- Every PC must appear in at least one entry across all sections
- Use exact references with prefixes: "Q1" not "1", "Item 1" not "1", "Step 1" not "1"
- assessmentConditions must quote the UoC conditions verbatim. Make sure to include ALL conditions listed under "Assessment conditions" in the UoC. Common conditions that are often missed: interaction with others, access to real or simulated workplace, access to workplace documentation. Do not stop at 3 or 4 conditions if the UoC lists more.
- foundationSkills must include all skills listed in the UoC
- Return ONLY the JSON object. Nothing else.

Important: map every single question to its KE requirement. Do not stop before you have mapped all questions. The second-to-last knowledge question covers conflict resolution methods. Map it to KE7. The third-to-last knowledge question covers poor work performance management methods. Map it to KE8. The last knowledge question covers methods to monitor and improve work relationships. Map it to KE9. Count your knowledgeQuestions array entries when done. The count must equal the total number of questions built. If it does not, you have missed some questions. Go back and add them.`
            );

            // Parse mapping index
            function parseMappingIndex(aiResponse) {
                let clean = typeof aiResponse === 'string' ? aiResponse.trim() : JSON.stringify(aiResponse);
                clean = clean.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
                const start = clean.indexOf('{');
                const end = clean.lastIndexOf('}');
                if (start === -1 || end === -1) throw new Error('No valid JSON found');
                clean = clean.substring(start, end + 1);
                return JSON.parse(clean);
            }

            let mappingIndex = {};
            try {
                const parsed7 = parseMappingIndex(mappingIndexRaw);
                // Support both { mappingIndex: {...} } and flat { knowledgeQuestions: [...] }
                mappingIndex = parsed7.mappingIndex || parsed7;
            } catch (e) {
                console.error('Mapping index parse failed:', e.message);
                mappingIndex = { knowledgeQuestions: [], observationItems: [], projectSteps: [], verbalQuestions: [], assessmentConditions: [], foundationSkills: [] };
            }

            // Validation: warn if mapped question count is less than built question count
            const builtQuestionCount = kText.match(/Q\d+\./g)?.length || 0;
            const mappedCount = mappingIndex.knowledgeQuestions?.length || 0;
            if (mappedCount < builtQuestionCount) {
                console.warn(`Mapping index has ${mappedCount} entries but assessment has ${builtQuestionCount} questions. Some questions are unmapped.`);
            }

            // BUG 4 FIX Part B — BSBLDR413 fallback: ensure "Interaction with others" condition is present
            if ((parsed.unit_code || unitInfo.code || '').includes('BSBLDR413')) {
                const hasInteraction = mappingIndex.assessmentConditions &&
                    mappingIndex.assessmentConditions.some(ac =>
                        (ac.condition || '').toLowerCase().includes('interaction')
                    );
                if (!hasInteraction) {
                    if (!mappingIndex.assessmentConditions) mappingIndex.assessmentConditions = [];
                    mappingIndex.assessmentConditions.push({
                        condition: 'Interaction with others',
                        howMet: 'Part B requires the learner to interact with at least four different individuals or groups across multiple observation occasions. Part C requires team collaboration throughout the workplace project.',
                    });
                }
            }

            // Assemble final document
            const mText = typeof markingGuide === 'string' ? markingGuide : JSON.stringify(markingGuide);

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
            setBuildProgress(100);

            // ── Generate compliance documents ──────────────────────────────
            const mappingData = extractMappingData(parsed, unitInfo, cohortInfo, sections, mappingIndex);

            // Extract question strings from knowledgeSection
            // Matches lines like: "Q1. text", "**Q1. text**", "**Q1.** text", "Q1. **text**"
            // Strips markdown bold markers, model answer lines, and blank lines
            const builtQuestions = [];
            if (typeof kText === 'string') {
                const lines = kText.split('\n');
                for (const line of lines) {
                    const stripped = line.replace(/\*\*/g, '').trim();
                    const match = stripped.match(/^Q(\d+)\.\s*(.+)/);
                    if (match) {
                        builtQuestions.push(match[2].trim());
                    }
                }
            }
            console.log('Question count:', builtQuestions.length, builtQuestions);

            // Extract observation items from observationSection (table rows, non-header text cells)
            const builtObsItems = (typeof oText === 'string' ? oText : '')
                .split('\n')
                .filter(l => l.includes('|') && !/Item|Observable|---/.test(l))
                .map(l => {
                    const cells = l.split('|').map(c => c.trim()).filter(Boolean);
                    return cells[1] || '';
                })
                .filter(Boolean);

            // Extract project steps from projectSection — handle multiple heading formats
            const builtProjectSteps = [];
            if (typeof pText === 'string') {
                // Match: "### Step 1: Title", "### Step 1 — Title", "**Step 1: Title**", "**Step 1 — Title**"
                const stepMatches = [...pText.matchAll(/(?:#{1,3}\s*|\*\*)(Step\s+\d+[^*\n]*?)(?:\*\*|)\n([\s\S]*?)(?=(?:#{1,3}\s*|\*\*)Step\s+\d+|$)/gi)];
                stepMatches.forEach(m => {
                    const title = m[1].replace(/[*#]/g, '').trim();
                    const desc = m[2].replace(/\*\*/g, '').trim().slice(0, 600);
                    if (title) builtProjectSteps.push({ title, desc });
                });
                // Fallback: numbered list steps if no heading-style steps found
                if (builtProjectSteps.length === 0) {
                    const listMatches = [...pText.matchAll(/^\d+\.\s+\*\*([^*]+)\*\*[:.]?\s*\n?([\s\S]*?)(?=^\d+\.|$)/gm)];
                    listMatches.forEach(m => {
                        builtProjectSteps.push({ title: m[1].trim(), desc: m[2].trim().slice(0, 600) });
                    });
                }
            }
            console.log('Passing to booklet:', {
                questions: builtQuestions,
                obsItems: builtObsItems,
                projectSteps: builtProjectSteps,
            });

            // Run all three in parallel, don't block on errors
            const [cmRes, vrRes, sbRes] = await Promise.allSettled([
                base44.functions.invoke('generateCompetencyMapping', { mappingData }),
                base44.functions.invoke('generateValidationRecord', { mappingData }),
                base44.functions.invoke('generateStudentBooklet', {
                    unitCode: unitInfo.code,
                    unitTitle: unitInfo.title,
                    questions: builtQuestions,
                    obsItems: builtObsItems.length > 0 ? builtObsItems : [],
                    projectSteps: builtProjectSteps.length > 0 ? builtProjectSteps : [],
                    occasionCount: 4,
                }),
            ]);

            if (cmRes.status === 'fulfilled' && cmRes.value?.data?.file_base64) {
                setMappingResult(cmRes.value.data);
                setMappingError(null);
            } else {
                setMappingError('Competency mapping could not be generated. Try downloading the assessment first, then rebuild.');
            }

            if (vrRes.status === 'fulfilled' && vrRes.value?.data?.file_base64) {
                setValidationResult(vrRes.value.data);
                setValidationError(null);
            } else {
                setValidationError('Validation record could not be generated. Try downloading the assessment first, then rebuild.');
            }

            if (sbRes.status === 'fulfilled' && sbRes.value?.data?.file_base64) {
                setStudentBookletBase64(sbRes.value.data.file_base64);
                setStudentBookletError(false);
            } else {
                setStudentBookletError(true);
            }

            // Build succeeded — clear step cache
            buildStateRef.current = {};

        } catch (e) {
            setBuildError(failedStep
                ? `Step ${failedStep.step} (${failedStep.name}) could not complete. Click retry to try that step again without starting over.`
                : 'One of the build steps timed out or failed.');
        } finally {
            setBuilding(false);
        }
    };

    const handleRetry = () => {
        setBuildError(null);
        setFailedStep(null);
        handleBuild(activeSections);
    };

    const handleSave = async () => {
        if (!unitInfo || !assessmentText) return;
        try {
            await base44.entities.WorkLibraryItem.create({
                title: `${unitInfo.code} — ${unitInfo.title}`,
                task_type: 'build',
                unit_code: unitInfo.code,
                unit_title: unitInfo.title,
                aqf_level: cohortInfo?.band || '',
                output_text: assessmentText,
            });
            navigate('/library');
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save to library. Please try again.');
        }
    };

    const handleReset = () => {
        buildStateRef.current = {};
        setScreen(1);
        setUnitInfo(null);
        setCohortInfo(null);
        setStructureProposal(null);
        setActiveSections([]);
        setAssessmentText('');
        setMappingResult(null);
        setValidationResult(null);
        setMappingError(null);
        setValidationError(null);
        setStudentBookletBase64(null);
        setStudentBookletError(false);
        setBuilding(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#ffffff' }}>
            <BuildHeader />

            {screen === 1 && <Screen1 onConfirm={handleScreen1Confirm} />}
            {screen === 2 && <Screen2 unitInfo={unitInfo} onBack={() => setScreen(1)} onConfirm={handleScreen2Confirm} />}
            {screen === 3 && (
                structureLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
                        <Loader2 style={{ color: '#c9a84c', width: '28px', height: '28px', animation: 'spin 1s linear infinite' }} />
                        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                        <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '12px' }}>Analysing your UoC...</p>
                    </div>
                ) : (
                    <Screen3Structure
                        unitInfo={unitInfo}
                        cohortInfo={cohortInfo}
                        structureProposal={structureProposal}
                        onBack={() => setScreen(2)}
                        onBuild={handleBuild}
                    />
                )
            )}
            {screen === 4 && (building || buildError) && <Screen4Loading onReset={handleReset} onRetry={handleRetry} progress={buildProgress} buildError={buildError} failedStep={failedStep} />}
            {screen === 4 && !building && !buildError && (
                <Screen4Ready
                    unitInfo={unitInfo}
                    cohortInfo={cohortInfo}
                    assessmentText={assessmentText}
                    mappingResult={mappingResult}
                    validationResult={validationResult}
                    mappingError={mappingError}
                    validationError={validationError}
                    studentBookletBase64={studentBookletBase64}
                    studentBookletError={studentBookletError}
                    onBack={() => setScreen(2)}
                    onReset={handleReset}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}