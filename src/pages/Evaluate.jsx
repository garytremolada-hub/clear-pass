import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CheckCircle, Upload, AlertCircle, Loader2, Search, ClipboardCheck, Download, XCircle, TriangleAlert, Info } from 'lucide-react';
import { calculateReadability } from '@/lib/calculateReadability';

// ── Shared constants (mirrored from Build) ────────────────────────────────────

const LEARNER_OPTIONS = [
    { value: 'high_school', label: 'High school students', feedback: "High school students — we'll use a junior secondary reading level." },
    { value: 'apprentices', label: 'Apprentices and trainees', feedback: "Apprentices and trainees — standard working adult literacy assumed." },
    { value: 'working_adults', label: 'Working adults', feedback: "Working adults — standard adult literacy assumed." },
    { value: 'university', label: 'University students', feedback: "University students — we'll use a higher academic reading level." },
];

const SUPPORT_OPTIONS = [
    { value: 'none', label: 'No — most learners read English comfortably' },
    { value: 'esl', label: 'Yes — some learners speak English as a second language (ESL)' },
    { value: 'literacy', label: 'Yes — some learners need extra literacy support' },
    { value: 'both', label: 'Yes — ESL and literacy support needed' },
];

const BAND_FKGL = {
    'Very Easy': 3, 'Easy': 4.5, 'Fairly Easy': 6.5, 'Cert I/II · Yr 10': 8.5,
    'Cert III/IV': 10.5, 'Diploma': 12.5, 'Degree / Grad Dip': 15, 'Very Difficult': 18,
};

const BAND_MAP = {
    high_school:    { none: 'Cert I/II · Yr 10', esl: 'Easy', literacy: 'Easy', both: 'Very Easy' },
    apprentices:    { none: 'Cert III/IV', esl: 'Cert I/II · Yr 10', literacy: 'Cert I/II · Yr 10', both: 'Fairly Easy' },
    working_adults: { none: 'Cert III/IV', esl: 'Cert I/II · Yr 10', literacy: 'Cert I/II · Yr 10', both: 'Fairly Easy' },
    university:     { none: 'Diploma', esl: 'Cert III/IV', literacy: 'Cert III/IV', both: 'Cert I/II · Yr 10' },
};

function getBand(learner, support) {
    return (BAND_MAP[learner] || {})[support] || 'Cert III/IV';
}

const EVAL_STAGES = [
    { pct: 0,   label: 'Starting...' },
    { pct: 10,  label: 'Reading your assessment...' },
    { pct: 25,  label: 'Identifying sections...' },
    { pct: 45,  label: 'Checking performance evidence...' },
    { pct: 60,  label: 'Checking knowledge evidence...' },
    { pct: 75,  label: 'Mapping performance criteria...' },
    { pct: 88,  label: 'Writing recommendations...' },
    { pct: 95,  label: 'Writing report...' },
    { pct: 100, label: 'Done' },
];

const NO_DASH = 'CRITICAL STYLE RULE: Never use em dashes or en dashes anywhere in your output. Use a colon to introduce a list, a full stop to separate two complete thoughts, and a comma to join closely related ideas. Do not use dashes.\n\n';

function llmCall(prompt) {
    return base44.integrations.Core.InvokeLLM({ prompt: NO_DASH + prompt, model: 'claude_sonnet_4_6' });
}

function parseAIJson(response) {
    let clean = (typeof response === 'string' ? response : JSON.stringify(response)).trim();
    clean = clean.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('AI response did not contain valid JSON');
    return JSON.parse(clean.substring(start, end + 1));
}

// ── Step progress bar ─────────────────────────────────────────────────────────

const EP_STEPS = ['Find Unit', 'Upload', 'Learners', 'Evaluate', 'Report'];

function EvalProgress({ step }) {
    return (
        <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                {EP_STEPS.map((label, i) => {
                    const idx = i + 1;
                    const done = idx < step;
                    const active = idx === step;
                    return (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < EP_STEPS.length - 1 ? 1 : 'none' }}>
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
                            {i < EP_STEPS.length - 1 && (
                                <div style={{ flex: 1, height: '2px', backgroundColor: done ? '#0d2444' : '#e5e7eb', margin: '0 4px', marginBottom: '18px' }} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Screen 1: Find the unit ───────────────────────────────────────────────────

function Screen1({ onConfirm }) {
    const [unitCode, setUnitCode] = useState('');
    const [searchState, setSearchState] = useState('idle');
    const [searchError, setSearchError] = useState('');
    const [uocData, setUocData] = useState(null);

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

    const infoRow = (label, value) => (
        <tr key={label}>
            <td style={{ padding: '7px 12px', color: '#6b7280', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', borderBottom: '1px solid #f3f4f6' }}>{label}</td>
            <td style={{ padding: '7px 12px', color: '#0d2444', fontSize: '13px', borderBottom: '1px solid #f3f4f6' }}>{value}</td>
        </tr>
    );

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '540px', margin: '0 auto', padding: '32px 24px' }}>
                <EvalProgress step={1} />
                <h2 style={{ color: '#0d2444', fontSize: '24px', fontWeight: 500, marginBottom: '8px' }}>
                    Which unit is this assessment for?
                </h2>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
                    Enter the unit code to load it from training.gov.au
                </p>

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

                {searchState === 'error' && (
                    <div style={{ border: '1px solid #ef4444', borderRadius: '8px', padding: '14px 16px', backgroundColor: '#fef2f2', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <AlertCircle style={{ color: '#ef4444', width: '16px', height: '16px', flexShrink: 0, marginTop: '1px' }} />
                            <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{searchError}</p>
                        </div>
                        <button onClick={() => setSearchState('idle')} style={{ padding: '5px 12px', border: '1px solid #ef4444', borderRadius: '6px', backgroundColor: 'transparent', color: '#dc2626', fontSize: '12px', cursor: 'pointer' }}>
                            Try again
                        </button>
                    </div>
                )}

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
                                onClick={() => onConfirm({ code: uocData.unitCode, title: uocData.unitTitle, uocData })}
                                style={{ width: '100%', height: '44px', backgroundColor: '#c9a84c', color: '#0d2444', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Next: Upload assessment →
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
            </div>
        </div>
    );
}

// ── Strip admin text before AI calls ─────────────────────────────────────────

function extractAssessableContent(fullText) {
    const startMarkers = [
        'ASSESSMENT 1:',
        'ASSESSMENT TASK 1:',
        'Assessment 1:',
        'Assessment Task 1:',
    ];

    let startIdx = -1;
    for (const marker of startMarkers) {
        const idx = fullText.lastIndexOf(marker);
        if (idx !== -1 && (startIdx === -1 || idx < startIdx)) {
            startIdx = idx;
        }
    }

    if (startIdx === -1) {
        const q1Match = fullText.match(/\bQ1\b\.|\bQuestion 1\b/);
        if (q1Match) startIdx = q1Match.index;
    }

    if (startIdx === -1) return fullText;

    let assessable = fullText.substring(startIdx);

    const endMarkers = [
        'TO BE COMPLETED BY THE ASSESSOR',
        'ASSESSOR DECLARATION',
        'RECORD OF ASSESSMENT OUTCOMES',
        'ASSESSOR USE ONLY',
        'ADMIN USE ONLY',
        'Version control',
    ];

    for (const marker of endMarkers) {
        const endIdx = assessable.indexOf(marker);
        if (endIdx !== -1) { assessable = assessable.substring(0, endIdx); break; }
    }

    return assessable.trim();
}

// ── Screen 2: Upload the assessment ──────────────────────────────────────────

function Screen2({ unitInfo, onBack, onConfirm }) {
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [extracting, setExtracting] = useState(false);
    const [extractedText, setExtractedText] = useState('');
    const [wordCount, setWordCount] = useState(0);
    const [error, setError] = useState('');
    const [showPaste, setShowPaste] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const inputRef = useRef();

    const handleFile = async (f) => {
        if (!f) return;
        if (!f.name.match(/\.(pdf|docx)$/i)) { setError('Only .docx and .pdf files are supported.'); return; }
        if (f.size > 10 * 1024 * 1024) { setError('File is too large. Try a smaller file or paste the text below.'); return; }
        setFile(f);
        setFileName(f.name);
        setExtractedText('');
        setWordCount(0);
        setError('');
        setExtracting(true);
        try {
            const up = await base44.integrations.Core.UploadFile({ file: f });
            const res = await base44.functions.invoke('extractDocumentText', { file_url: up.file_url, file_name: f.name, label: 'Assessment' });
            const text = res?.data?.text || '';
            const wc = text.split(/\s+/).filter(Boolean).length;
            setExtractedText(text);
            setWordCount(wc);
            if (wc < 100) {
                setError('This document appears to be very short or could not be read properly. Try uploading a different file or paste the text directly.');
            }
        } catch (err) {
            setError('Could not read this file. Try a different file or paste the text below.');
        } finally {
            setExtracting(false);
        }
    };

    const handlePasteChange = (val) => {
        setPasteText(val);
        const wc = val.split(/\s+/).filter(Boolean).length;
        setWordCount(wc);
        setExtractedText(val);
        setFileName('Pasted text');
        setError('');
    };

    const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); };

    const activeText = extractedText || pasteText;
    const activeWc = activeText.split(/\s+/).filter(Boolean).length;
    const canContinue = activeWc >= 100 && !extracting;

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '540px', margin: '0 auto', padding: '32px 24px' }}>
                <EvalProgress step={2} />
                <h2 style={{ color: '#0d2444', fontSize: '24px', fontWeight: 500, marginBottom: '8px' }}>
                    Upload the assessment to evaluate
                </h2>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
                    Upload the existing assessment document you want to check against {unitInfo.code}
                </p>

                {/* Drop zone */}
                {!extractedText && !extracting && (
                    <div
                        onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => inputRef.current?.click()}
                        style={{ border: '2px dashed #e5e7eb', borderRadius: '12px', padding: '40px', textAlign: 'center', backgroundColor: '#f9fafb', cursor: 'pointer', marginBottom: '16px' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a84c'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                    >
                        <input ref={inputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
                        <Upload style={{ color: '#c9a84c', width: '32px', height: '32px', margin: '0 auto 12px' }} />
                        <p style={{ color: '#0d2444', fontSize: '14px', marginBottom: '6px' }}>Drop your assessment here or click to browse</p>
                        <p style={{ color: '#9ca3af', fontSize: '12px' }}>Accepts .docx and .pdf files</p>
                    </div>
                )}

                {extracting && (
                    <div style={{ textAlign: 'center', padding: '40px', border: '2px dashed #e5e7eb', borderRadius: '12px', marginBottom: '16px' }}>
                        <Loader2 style={{ color: '#c9a84c', width: '28px', height: '28px', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                        <p style={{ color: '#6b7280', fontSize: '14px' }}>Reading your assessment...</p>
                    </div>
                )}

                {extractedText && !extracting && (
                    <div style={{ border: '1px solid #22c55e', borderRadius: '8px', padding: '16px', backgroundColor: '#f0fdf4', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                            <CheckCircle style={{ color: '#22c55e', width: '18px', height: '18px', flexShrink: 0 }} />
                            <span style={{ color: '#0d2444', fontSize: '14px', fontWeight: 500 }}>Document loaded: {fileName}</span>
                        </div>
                        <p style={{ color: '#6b7280', fontSize: '12px', marginLeft: '28px', marginBottom: '8px' }}>{activeWc} words detected</p>
                        <button
                            onClick={() => { setExtractedText(''); setFile(null); setFileName(''); setWordCount(0); setError(''); }}
                            style={{ marginLeft: '28px', background: 'none', border: 'none', color: '#c9a84c', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                        >
                            Upload a different file
                        </button>
                    </div>
                )}

                {error && (
                    <div style={{ border: '1px solid #f59e0b', borderRadius: '8px', padding: '12px 16px', backgroundColor: '#fffbeb', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <AlertCircle style={{ color: '#f59e0b', width: '16px', height: '16px', flexShrink: 0, marginTop: '1px' }} />
                        <p style={{ color: '#92400e', fontSize: '13px' }}>{error}</p>
                    </div>
                )}

                {/* Paste option */}
                <div style={{ margin: '16px 0 8px' }}>
                    <button
                        onClick={() => setShowPaste(p => !p)}
                        style={{ background: 'none', border: 'none', color: '#c9a84c', fontSize: '13px', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                    >
                        {showPaste ? 'Hide text paste' : 'Or paste the assessment text directly'}
                    </button>
                </div>
                {showPaste && (
                    <textarea
                        value={pasteText}
                        onChange={e => handlePasteChange(e.target.value)}
                        placeholder="Paste your assessment text here..."
                        style={{ width: '100%', height: '180px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', fontFamily: 'Arial', fontSize: '12px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }}
                    />
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button onClick={onBack} style={{ flex: 1, height: '44px', border: '1px solid #0d2444', borderRadius: '8px', backgroundColor: 'transparent', color: '#0d2444', fontSize: '14px', cursor: 'pointer' }}>
                        ← Back
                    </button>
                    <button
                        onClick={() => onConfirm({ text: activeText, assessableText: extractAssessableContent(activeText), fileName, wordCount: activeWc })}
                        disabled={!canContinue}
                        style={{
                            flex: 1, height: '44px', borderRadius: '8px',
                            backgroundColor: canContinue ? '#c9a84c' : '#e5e7eb',
                            color: canContinue ? '#0d2444' : '#9ca3af',
                            fontSize: '14px', fontWeight: 500, border: 'none',
                            cursor: canContinue ? 'pointer' : 'not-allowed',
                        }}
                    >
                        Next: Learner profile →
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Screen 3: Learner profile ─────────────────────────────────────────────────

function Screen3({ unitInfo, onBack, onConfirm }) {
    const [learner, setLearner] = useState('');
    const [support, setSupport] = useState('');

    const selectedLearner = LEARNER_OPTIONS.find(o => o.value === learner);
    const canContinue = learner && support;
    const band = canContinue ? getBand(learner, support) : null;
    const targetFKGL = band ? (BAND_FKGL[band] || 10.5) : null;

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '540px', margin: '0 auto', padding: '32px 24px' }}>
                <EvalProgress step={3} />
                <h2 style={{ color: '#0d2444', fontSize: '24px', fontWeight: 500, marginBottom: '8px' }}>
                    Who was this assessment written for?
                </h2>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
                    This sets the readability target we compare against
                </p>

                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', color: '#0d2444', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
                        Who are the learners?
                    </label>
                    <select
                        value={learner}
                        onChange={e => { setLearner(e.target.value); setSupport(''); }}
                        style={{ width: '100%', height: '44px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0 12px', fontSize: '14px', backgroundColor: '#ffffff', outline: 'none', cursor: 'pointer' }}
                    >
                        <option value="" disabled>Select your learners...</option>
                        {LEARNER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {selectedLearner && (
                        <p style={{ color: '#6b7280', fontSize: '12px', fontStyle: 'italic', marginTop: '6px' }}>{selectedLearner.feedback}</p>
                    )}
                </div>

                {learner && (
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', color: '#0d2444', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
                            Do any learners need extra support?
                        </label>
                        <select
                            value={support}
                            onChange={e => setSupport(e.target.value)}
                            style={{ width: '100%', height: '44px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0 12px', fontSize: '14px', backgroundColor: '#ffffff', outline: 'none', cursor: 'pointer' }}
                        >
                            <option value="" disabled>Select support needs...</option>
                            {SUPPORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                )}

                {canContinue && (
                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #22c55e', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <CheckCircle style={{ color: '#22c55e', width: '18px', height: '18px', flexShrink: 0, marginTop: '1px' }} />
                        <div>
                            <p style={{ color: '#0d2444', fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>
                                Target readability: {band} (FKGL {targetFKGL})
                            </p>
                            <p style={{ color: '#6b7280', fontSize: '12px' }}>
                                We will compare the assessment against this level.
                            </p>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button onClick={onBack} style={{ flex: 1, height: '44px', border: '1px solid #0d2444', borderRadius: '8px', backgroundColor: 'transparent', color: '#0d2444', fontSize: '14px', cursor: 'pointer' }}>
                        ← Back
                    </button>
                    <button
                        onClick={() => onConfirm({ learner, support, band, targetFKGL })}
                        disabled={!canContinue}
                        style={{
                            flex: 1, height: '44px', borderRadius: '8px',
                            backgroundColor: canContinue ? '#c9a84c' : '#e5e7eb',
                            color: canContinue ? '#0d2444' : '#9ca3af',
                            fontSize: '14px', fontWeight: 500, border: 'none',
                            cursor: canContinue ? 'pointer' : 'not-allowed',
                        }}
                    >
                        Start evaluation →
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Screen 4: Evaluation in progress ─────────────────────────────────────────

function Screen4Progress({ progress, evalError }) {
    const stage = [...EVAL_STAGES].reverse().find(s => progress >= s.pct) || EVAL_STAGES[0];

    if (evalError) {
        return (
            <div className="flex-1 flex flex-col" style={{ backgroundColor: '#ffffff' }}>
                <div style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 24px', width: '100%' }}>
                    <EvalProgress step={4} />
                    <div style={{ border: '1px solid #ef4444', backgroundColor: '#fef2f2', borderRadius: '8px', padding: '16px', marginTop: '40px', textAlign: 'center' }}>
                        <AlertCircle style={{ color: '#ef4444', width: '24px', height: '24px', margin: '0 auto 10px' }} />
                        <p style={{ color: '#0d2444', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Evaluation encountered an issue</p>
                        <p style={{ color: '#6b7280', fontSize: '13px' }}>{evalError}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 24px', width: '100%' }}>
                <EvalProgress step={4} />
                <div style={{ paddingTop: '40px' }}>
                    <h2 style={{ color: '#0d2444', fontSize: '20px', fontWeight: 500, marginBottom: '32px', textAlign: 'center' }}>
                        Evaluating your assessment...
                    </h2>
                    <div style={{ width: '100%', height: '8px', borderRadius: '4px', backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, borderRadius: '4px', backgroundColor: '#c9a84c', transition: 'width 0.6s ease' }} />
                    </div>
                    <p style={{ color: '#0d2444', fontSize: '14px', fontWeight: 700, textAlign: 'center', marginTop: '10px' }}>{progress}%</p>
                    <p style={{ color: '#6b7280', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', marginTop: '4px' }}>{stage.label}</p>
                </div>
            </div>
        </div>
    );
}

// ── Screen 5: Report ready ────────────────────────────────────────────────────

const DISCLAIMER = 'This evaluation identifies potential coverage gaps and readability issues. Final compliance determination rests with the assessor, the RTO, and where applicable, the relevant regulatory authority (ASQA or VRQA). This report does not constitute a compliance ruling.';

// Coverage stacked bar component
function CoverageBar({ label, covered, partial, notCovered, total, coveredLabel, partialLabel, notLabel }) {
    if (total === 0) return null;
    const covPct = parseFloat((covered / total * 100).toFixed(1));
    const parPct = parseFloat((partial / total * 100).toFixed(1));
    const notPct = parseFloat((100 - covPct - parPct).toFixed(1));
    const summaryParts = [];
    if (covered > 0) summaryParts.push(`${covered} covered`);
    if (partial > 0) summaryParts.push(`${partial} partial`);
    if (notCovered > 0) summaryParts.push(`${notCovered} missing`);
    return (
        <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                <span style={{ color: '#0d2444', fontSize: '13px', fontWeight: 500 }}>{label}</span>
                <span style={{ color: '#6b7280', fontSize: '12px' }}>{summaryParts.join(' · ')}</span>
            </div>
            <div style={{ display: 'flex', height: '20px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#e5e7eb' }}>
                {covPct > 0 && <div style={{ width: `${covPct}%`, background: '#639922' }} title={`Covered: ${covPct}%`} />}
                {parPct > 0 && <div style={{ width: `${parPct}%`, background: '#BA7517' }} title={`Partial: ${parPct}%`} />}
                {notPct > 0 && <div style={{ width: `${notPct}%`, background: '#A32D2D' }} title={`Not covered: ${notPct}%`} />}
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
                {covered > 0 && coveredLabel && <span style={{ fontSize: '11px', color: '#639922' }}>{coveredLabel}</span>}
                {partial > 0 && partialLabel && <span style={{ fontSize: '11px', color: '#BA7517' }}>{partialLabel}</span>}
                {notCovered > 0 && notLabel && <span style={{ fontSize: '11px', color: '#A32D2D' }}>{notLabel}</span>}
            </div>
        </div>
    );
}

// Gap card component
function GapCard({ gap }) {
    const type = (gap.gapType || '').toUpperCase();
    const isNotCovered = type === 'NOT COVERED' || type === 'NOT MAPPED';
    const isPartial = type === 'PARTIALLY COVERED' || type === 'PARTIALLY MAPPED';
    const borderColor = isNotCovered ? '#A32D2D' : isPartial ? '#BA7517' : '#9ca3af';
    const bgColor = isNotCovered ? '#FCEBEB' : isPartial ? '#FAEEDA' : '#f9fafb';
    const IconComp = isNotCovered ? XCircle : isPartial ? TriangleAlert : Info;
    const iconColor = isNotCovered ? '#A32D2D' : isPartial ? '#BA7517' : '#6b7280';
    return (
        <div style={{ borderLeft: `3px solid ${borderColor}`, backgroundColor: bgColor, borderRadius: '6px', padding: '12px 14px', marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <IconComp style={{ color: iconColor, width: '16px', height: '16px', flexShrink: 0, marginTop: '1px' }} />
            <div>
                <p style={{ color: '#0d2444', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{gap.requirement}</p>
                <p style={{ color: '#374151', fontSize: '13px', lineHeight: 1.5 }}>{gap.recommendation}</p>
            </div>
        </div>
    );
}

function Screen5Report({ unitInfo, cohortProfile, results, reportText, onReset, onSave }) {
    const [downloading, setDownloading] = useState(false);

    const { sections = [], peResults = [], keResults = [], elementsResults = [], gaps = [], overallVerdict = 'REQUIRES DEVELOPMENT', summaryStatement = '' } = results;

    const peCovered = peResults.filter(r => r.status === 'COVERED').length;
    const pePartial = peResults.filter(r => r.status === 'PARTIALLY COVERED').length;
    const peNotCovered = peResults.filter(r => r.status === 'NOT COVERED').length;
    const keCovered = keResults.filter(r => r.status === 'COVERED').length;
    const kePartial = keResults.filter(r => r.status === 'PARTIALLY COVERED').length;
    const keNotCovered = keResults.filter(r => r.status === 'NOT COVERED').length;
    const allPCs = elementsResults.flatMap(e => e.performanceCriteria || []);
    const pcTotal = allPCs.length;
    const pcMapped = allPCs.filter(pc => pc.status === 'MAPPED').length;
    const pcPartial = allPCs.filter(pc => pc.status === 'PARTIALLY MAPPED').length;
    const pcNotMapped = allPCs.filter(pc => pc.status === 'NOT MAPPED').length;
    const withinRange = sections.filter(s => s._readability && Math.abs((s._readability.fkgl || 0) - cohortProfile.targetFKGL) <= 1.5).length;
    const isAdequate = overallVerdict === 'ADEQUATE';

    // Build ref labels for bar annotations
    const peRefs = (items, status) => items.filter(r => r.status === status).map((r, i) => `PE${i + 1}`).join(', ');
    const keRefs = (items, status) => items.filter(r => r.status === status).map((r, i) => `KE${i + 1}`).join(', ');
    const pcRefs = (pcs, status) => pcs.filter(pc => pc.status === status).map(pc => pc.ref).join(', ');

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, BorderStyle, WidthType, ShadingType } = await import('docx');
            const NAVY = '0D2444'; const WHITE = 'FFFFFF'; const LIGHT_GREY = 'F9FAFB'; const BORDER_GREY = 'D1D5DB';
            const PAGE_WIDTH = 9026;
            const thin = { style: BorderStyle.SINGLE, size: 1, color: BORDER_GREY };
            const navyB = { style: BorderStyle.SINGLE, size: 2, color: NAVY };
            const borders = { top: thin, bottom: thin, left: thin, right: thin };
            const navyBorders = { top: navyB, bottom: navyB, left: navyB, right: navyB };
            const cm = { top: 80, bottom: 80, left: 140, right: 140 };
            const navyHeader = (text) => new Table({ width: { size: PAGE_WIDTH, type: WidthType.DXA }, columnWidths: [PAGE_WIDTH], rows: [new TableRow({ children: [new TableCell({ borders: navyBorders, width: { size: PAGE_WIDTH, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 200, right: 200 }, children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 26, color: WHITE, font: 'Arial' })] })] })] })] });
            const para = (t, opts = {}) => new Paragraph({ spacing: { before: opts.before || 80, after: opts.after || 80 }, children: [new TextRun({ text: t, size: opts.size || 20, font: 'Arial', color: opts.color || '1A1A1A', bold: opts.bold || false, italics: opts.italic || false })] });
            const tableRow = (cells, isHeader = false) => new TableRow({ children: cells.map((t, i) => new TableCell({ borders, margins: cm, shading: { fill: isHeader ? NAVY : (i % 2 === 0 ? LIGHT_GREY : WHITE), type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: String(t || ''), size: 18, font: 'Arial', color: isHeader ? WHITE : '1A1A1A', bold: isHeader })] })] })) });
            const makeTable = (headers, rows) => new Table({ width: { size: PAGE_WIDTH, type: WidthType.DXA }, columnWidths: Array(headers.length).fill(Math.floor(PAGE_WIDTH / headers.length)), rows: [tableRow(headers, true), ...rows.map(r => tableRow(r))] });
            const sp = () => new Paragraph({ spacing: { before: 120, after: 120 }, children: [new TextRun({ text: '' })] });
            const children = [
                navyHeader('COMPLIANCE AUDIT REPORT'), sp(),
                para(`${unitInfo.code} - ${unitInfo.title}`, { bold: true, size: 24 }),
                para(`Cohort: ${cohortProfile.band} level (FKGL ${cohortProfile.targetFKGL})`, { color: '6B7280' }),
                para(`Date: ${new Date().toLocaleDateString('en-AU')}`, { color: '6B7280' }),
                para(`Overall verdict: ${overallVerdict}`, { bold: true, color: isAdequate ? '16A34A' : 'D97706' }), sp(),
                navyHeader('Executive Summary'), sp(),
                para(summaryStatement || reportText.split('\n').slice(0, 4).join(' ')), sp(),
                navyHeader('Readability by Section'), sp(),
                makeTable(['Section', 'FKGL', 'Target FKGL', 'Status'], sections.map(s => { const fkgl = s._readability?.fkgl ?? '-'; const diff = s._readability ? Math.abs(fkgl - cohortProfile.targetFKGL) : null; const status = diff === null ? 'Not scored' : diff <= 1.5 ? 'Within range' : diff <= 2.5 ? 'Advisory' : 'Refer for review'; return [s.name, typeof fkgl === 'number' ? fkgl.toFixed(1) : '-', cohortProfile.targetFKGL, status]; })), sp(),
                navyHeader('Performance Evidence Coverage'), sp(),
                makeTable(['Requirement', 'Status', 'Coverage cited', 'Gap'], peResults.map(r => [r.requirement || '', r.status || '', r.coverage || '', r.gap || ''])), sp(),
                navyHeader('Knowledge Evidence Coverage'), sp(),
                makeTable(['Requirement', 'Status', 'Coverage cited', 'Gap'], keResults.map(r => [r.requirement || '', r.status || '', r.coverage || '', r.gap || ''])), sp(),
                navyHeader('Element and Performance Criteria Mapping'), sp(),
                makeTable(['Element', 'PC', 'Status', 'Mapped to', 'Gap'], elementsResults.flatMap(el => (el.performanceCriteria || []).map(pc => [el.title || '', pc.ref || '', pc.status || '', pc.mappedTo || '', pc.gap || '']))), sp(),
                navyHeader('Gaps and Recommendations'), sp(),
                ...(gaps.length === 0 ? [para('No gaps identified.')] : gaps.map(g => para(`${g.requirement}: ${g.recommendation} (add: ${g.recommendedSectionType})`))), sp(),
                navyHeader('Instrument Adequacy'), sp(),
                para(overallVerdict, { bold: true, size: 24, color: isAdequate ? '16A34A' : 'D97706' }), sp(),
                navyHeader('Compliance Disclaimer'), sp(),
                para(DISCLAIMER, { italic: true, color: '6B7280', size: 18 }),
            ];
            const doc = new Document({ styles: { default: { document: { run: { font: 'Arial', size: 20 } } } }, sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children }] });
            const blob = await Packer.toBlob(doc);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${unitInfo.code}-compliance-audit.docx`; a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download error:', err);
            alert('Download failed: ' + err.message);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '620px', margin: '0 auto', padding: '32px 24px' }}>
                <EvalProgress step={5} />

                {/* Header row: verdict + readability */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                    <div style={{
                        borderLeft: `4px solid ${isAdequate ? '#639922' : '#BA7517'}`,
                        border: '1px solid #e5e7eb',
                        borderLeftWidth: '4px',
                        borderLeftColor: isAdequate ? '#639922' : '#BA7517',
                        borderRadius: '8px', padding: '16px',
                    }}>
                        <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Overall verdict</p>
                        <p style={{ color: isAdequate ? '#3B6D11' : '#854F0B', fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{overallVerdict}</p>
                        <p style={{ color: '#6b7280', fontSize: '12px' }}>
                            {gaps.length === 0 ? 'No gaps identified' : `${gaps.length} recommendation${gaps.length !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                        <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Readability</p>
                        <p style={{ color: '#0d2444', fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{withinRange} / {sections.length} sections</p>
                        <p style={{ color: '#6b7280', fontSize: '12px' }}>within target range</p>
                    </div>
                </div>

                {/* Coverage overview */}
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
                    <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>Coverage overview</p>

                    {/* Legend */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '18px', flexWrap: 'wrap' }}>
                        {[['#639922', 'Covered'], ['#BA7517', 'Partially covered'], ['#A32D2D', 'Not covered']].map(([color, label]) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: color, flexShrink: 0 }} />
                                <span style={{ color: '#6b7280', fontSize: '11px' }}>{label}</span>
                            </div>
                        ))}
                    </div>

                    <CoverageBar
                        label="Performance Evidence"
                        covered={peCovered} partial={pePartial} notCovered={peNotCovered} total={peResults.length}
                        coveredLabel={peRefs(peResults, 'COVERED') ? `Covered: ${peRefs(peResults, 'COVERED')}` : null}
                        partialLabel={peRefs(peResults, 'PARTIALLY COVERED') ? `Partial: ${peRefs(peResults, 'PARTIALLY COVERED')}` : null}
                        notLabel={peRefs(peResults, 'NOT COVERED') ? `Missing: ${peRefs(peResults, 'NOT COVERED')}` : null}
                    />
                    <CoverageBar
                        label="Knowledge Evidence"
                        covered={keCovered} partial={kePartial} notCovered={keNotCovered} total={keResults.length}
                        coveredLabel={keRefs(keResults, 'COVERED') ? `Covered: ${keRefs(keResults, 'COVERED')}` : null}
                        partialLabel={keRefs(keResults, 'PARTIALLY COVERED') ? `Partial: ${keRefs(keResults, 'PARTIALLY COVERED')}` : null}
                        notLabel={keRefs(keResults, 'NOT COVERED') ? `Missing: ${keRefs(keResults, 'NOT COVERED')}` : null}
                    />
                    <CoverageBar
                        label="Performance Criteria"
                        covered={pcMapped} partial={pcPartial} notCovered={pcNotMapped} total={pcTotal}
                        coveredLabel={pcRefs(allPCs, 'MAPPED') ? `Mapped: ${pcRefs(allPCs, 'MAPPED').split(', ').slice(0, 6).join(', ')}${allPCs.filter(p => p.status === 'MAPPED').length > 6 ? '...' : ''}` : null}
                        partialLabel={pcRefs(allPCs, 'PARTIALLY MAPPED') ? `Partial: ${pcRefs(allPCs, 'PARTIALLY MAPPED')}` : null}
                        notLabel={pcRefs(allPCs, 'NOT MAPPED') ? `Missing: ${pcRefs(allPCs, 'NOT MAPPED')}` : null}
                    />
                </div>

                {/* Gaps to fix */}
                {gaps.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>Gaps to fix</p>
                        {gaps.map((g, i) => <GapCard key={i} gap={g} />)}
                    </div>
                )}

                {gaps.length === 0 && (
                    <div style={{ border: '1px solid #639922', borderRadius: '8px', padding: '14px 16px', backgroundColor: '#f0fdf4', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CheckCircle style={{ color: '#639922', width: '18px', height: '18px', flexShrink: 0 }} />
                        <p style={{ color: '#3B6D11', fontSize: '13px', fontWeight: 500 }}>No gaps identified. This assessment appears to cover all requirements.</p>
                    </div>
                )}

                {/* Download buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        style={{
                            width: '100%', height: '48px',
                            backgroundColor: downloading ? '#e5e7eb' : '#0d2444',
                            color: downloading ? '#9ca3af' : '#ffffff',
                            borderRadius: '8px', border: 'none',
                            fontSize: '14px', fontWeight: 600,
                            cursor: downloading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        }}
                    >
                        <Download style={{ width: '16px', height: '16px' }} />
                        {downloading ? 'Preparing document...' : 'Download audit report (.docx)'}
                    </button>
                    <button
                        onClick={onSave}
                        style={{ width: '100%', height: '44px', backgroundColor: 'transparent', color: '#0d2444', borderRadius: '8px', border: '1px solid #0d2444', fontSize: '14px', cursor: 'pointer' }}
                    >
                        Save to library
                    </button>
                    <button
                        onClick={onReset}
                        style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', marginTop: '4px' }}
                    >
                        Evaluate another assessment
                    </button>
                </div>

                <p style={{ color: '#9ca3af', fontSize: '11px', fontStyle: 'italic', lineHeight: 1.6 }}>
                    {DISCLAIMER}
                </p>
            </div>
        </div>
    );
}

// ── Main Evaluate page ────────────────────────────────────────────────────────

export default function Evaluate() {
    const navigate = useNavigate();
    const [screen, setScreen] = useState(1);
    const [unitInfo, setUnitInfo] = useState(null);
    const [assessmentDoc, setAssessmentDoc] = useState(null); // { text, fileName, wordCount }
    const [cohortProfile, setCohortProfile] = useState(null);
    const [evalProgress, setEvalProgress] = useState(0);
    const [evalError, setEvalError] = useState(null);
    const [results, setResults] = useState({});
    const [reportText, setReportText] = useState('');

    const handleScreen1Confirm = (info) => { setUnitInfo(info); setScreen(2); };
    const handleScreen2Confirm = (doc) => { setAssessmentDoc(doc); setScreen(3); };

    const handleScreen3Confirm = async (cohort) => {
        setCohortProfile(cohort);
        setEvalProgress(10);
        setEvalError(null);
        setScreen(4);

        const uocData = unitInfo.uocData;
        const rawText = assessmentDoc.text;
        const assessableText = assessmentDoc.assessableText || rawText;
        console.log('Raw text length:', rawText.length);
        console.log('Assessable text length:', assessableText.length);
        console.log('Assessable text starts with:', assessableText.substring(0, 100));
        const { targetFKGL, band } = cohort;

        const peList = (uocData?.performanceEvidence || []).join('\n');
        const keList = (uocData?.knowledgeEvidence || []).map(k => k.subItems ? `${k.text}: ${k.subItems.join(', ')}` : k.text).join('\n');
        const elementsText = (uocData?.elements || []).map(el =>
            `Element ${el.number}: ${el.title}\n` +
            (el.performanceCriteria || []).map(pc => `  ${pc.ref} ${pc.text}`).join('\n')
        ).join('\n\n');

        let sections = [], peResults = [], keResults = [], elementsResults = [], gaps = [], overallVerdict = 'REQUIRES DEVELOPMENT', summaryStatement = '';

        try {
            // Call 1 — Extract and classify sections
            setEvalProgress(25);
            let sectionsRaw;
            try {
                const r1 = await llmCall(
                    `You are an RTO assessment analyst. Extract and classify every section of the assessment text provided.\n\nReturn ONLY valid JSON. No explanation. No markdown fences.\n\n{\n  "sections": [\n    {\n      "name": "section name or heading",\n      "type": "Knowledge Questions | Observation Checklist | Workplace Project | Verbal Questions | Case Study | Third Party Report | Other",\n      "evidenceCategory": "Knowledge Evidence | Performance Evidence | Product Evidence | Indirect Evidence",\n      "items": ["item 1 text", "item 2 text"],\n      "itemCount": 3,\n      "wordCount": 450\n    }\n  ],\n  "totalWordCount": 1200,\n  "sectionCount": 3\n}\n\nSection type rules:\n- Questions starting with Q1, Q2 etc or numbered questions: Knowledge Questions\n- Checklist with tick boxes or observable behaviours: Observation Checklist\n- Steps or tasks to complete over time: Workplace Project\n- Questions marked verbal or oral: Verbal Questions\n- Scenario followed by questions: Case Study\n- Form for supervisor or third party: Third Party Report\n\nASSESSMENT TEXT:\n${assessableText.slice(0, 8000)}`
                );
                sectionsRaw = parseAIJson(r1);
                sections = sectionsRaw.sections || [];
            } catch (e) {
                console.error('Call 1 failed:', e.message);
                sections = [{ name: 'Could not be evaluated', type: 'Other', items: [assessableText.slice(0, 500)], itemCount: 1, wordCount: assessmentDoc.wordCount }];
            }

            // Step 2 — Score readability per section using JS (no AI)
            sections = sections.map(s => {
                const sectionText = (s.items || []).join(' ');
                let readability = null;
                try {
                    if (sectionText.trim().length > 30) {
                        readability = calculateReadability(sectionText);
                    }
                } catch (e) { /* skip */ }
                return { ...s, _readability: readability };
            });

            // Call 3 — Audit Performance Evidence
            setEvalProgress(45);
            try {
                const r3 = await llmCall(
                    `You are an RTO compliance auditor. Check whether the assessment covers each Performance Evidence requirement.\n\nUse ONLY these three statuses: COVERED, PARTIALLY COVERED, NOT COVERED.\n\nReturn ONLY valid JSON. No explanation. No markdown fences.\n\n{\n  "performanceEvidence": [\n    {\n      "requirement": "verbatim PE requirement text",\n      "status": "COVERED | PARTIALLY COVERED | NOT COVERED",\n      "coverage": "cite specific assessment text, or none found",\n      "gap": "explain what is missing if PARTIALLY COVERED or NOT COVERED"\n    }\n  ]\n}\n\nPERFORMANCE EVIDENCE REQUIREMENTS:\n${peList || 'None specified'}\n\nASSESSMENT TEXT:\n${assessableText.slice(0, 6000)}`
                );
                const parsed = parseAIJson(r3);
                peResults = parsed.performanceEvidence || [];
            } catch (e) {
                console.error('Call 3 failed:', e.message);
                peResults = (uocData?.performanceEvidence || []).map(pe => ({ requirement: pe, status: 'Could not be evaluated', coverage: '', gap: '' }));
            }

            // Call 4 — Audit Knowledge Evidence
            setEvalProgress(60);
            try {
                const r4 = await llmCall(
                    `You are an RTO compliance auditor. Check whether the assessment covers each Knowledge Evidence requirement.\n\nUse ONLY these three statuses: COVERED, PARTIALLY COVERED, NOT COVERED.\n\nReturn ONLY valid JSON. No explanation. No markdown fences.\n\n{\n  "knowledgeEvidence": [\n    {\n      "requirement": "verbatim KE requirement text",\n      "status": "COVERED | PARTIALLY COVERED | NOT COVERED",\n      "coverage": "cite specific assessment text, or none found",\n      "gap": "explain what is missing if PARTIALLY COVERED or NOT COVERED"\n    }\n  ]\n}\n\nKNOWLEDGE EVIDENCE REQUIREMENTS:\n${keList || 'None specified'}\n\nASSESSMENT TEXT:\n${assessableText.slice(0, 6000)}`
                );
                const parsed = parseAIJson(r4);
                keResults = parsed.knowledgeEvidence || [];
            } catch (e) {
                console.error('Call 4 failed:', e.message);
                keResults = (uocData?.knowledgeEvidence || []).map(ke => ({ requirement: ke.text || ke, status: 'Could not be evaluated', coverage: '', gap: '' }));
            }

            // Call 5 — Audit Elements and PCs
            setEvalProgress(75);
            try {
                const r5 = await llmCall(
                    `You are an RTO compliance auditor. Check whether the assessment maps to each Element and Performance Criterion.\n\nUse ONLY these three statuses: MAPPED, PARTIALLY MAPPED, NOT MAPPED.\n\nReturn ONLY valid JSON. No explanation. No markdown fences.\n\n{\n  "elements": [\n    {\n      "number": 1,\n      "title": "element title",\n      "status": "MAPPED | PARTIALLY MAPPED | NOT MAPPED",\n      "performanceCriteria": [\n        {\n          "ref": "1.1",\n          "text": "verbatim PC text",\n          "status": "MAPPED | PARTIALLY MAPPED | NOT MAPPED",\n          "mappedTo": "section name or none found",\n          "gap": "what context or conditions are missing if PARTIALLY MAPPED"\n        }\n      ]\n    }\n  ]\n}\n\nELEMENTS AND PERFORMANCE CRITERIA:\n${elementsText || 'None specified'}\n\nASSESSMENT TEXT:\n${assessableText.slice(0, 6000)}`
                );
                const parsed = parseAIJson(r5);
                elementsResults = parsed.elements || [];
            } catch (e) {
                console.error('Call 5 failed:', e.message);
                elementsResults = (uocData?.elements || []).map(el => ({ number: el.number, title: el.title, status: 'Could not be evaluated', performanceCriteria: (el.performanceCriteria || []).map(pc => ({ ref: pc.ref, text: pc.text, status: 'Could not be evaluated', mappedTo: '', gap: '' })) }));
            }

            // Call 6 — Gap recommendations
            setEvalProgress(88);
            const peGaps = peResults.filter(r => r.status !== 'COVERED');
            const keGaps = keResults.filter(r => r.status !== 'COVERED');
            const pcGaps = elementsResults.flatMap(el => (el.performanceCriteria || []).filter(pc => pc.status !== 'MAPPED').map(pc => ({ ...pc, elementTitle: el.title })));
            try {
                const r6 = await llmCall(
                    `You are an RTO assessment designer. Based on the coverage audit results, write specific recommendations for each gap.\n\nReturn ONLY valid JSON. No explanation. No markdown fences.\n\n{\n  "gaps": [\n    {\n      "requirement": "PE or KE or PC reference and text",\n      "gapType": "NOT COVERED | PARTIALLY COVERED | NOT MAPPED | PARTIALLY MAPPED",\n      "recommendedSectionType": "exact type name",\n      "recommendation": "plain English description of what to add",\n      "minimumContent": ["required field 1", "required field 2"]\n    }\n  ],\n  "overallVerdict": "ADEQUATE | REQUIRES DEVELOPMENT",\n  "summaryStatement": "one sentence plain English summary"\n}\n\nUOC TITLE: ${unitInfo.title}\n\nPE GAPS:\n${JSON.stringify(peGaps.slice(0, 10))}\n\nKE GAPS:\n${JSON.stringify(keGaps.slice(0, 10))}\n\nPC GAPS:\n${JSON.stringify(pcGaps.slice(0, 10))}`
                );
                const parsed = parseAIJson(r6);
                gaps = parsed.gaps || [];
                overallVerdict = parsed.overallVerdict || 'REQUIRES DEVELOPMENT';
                summaryStatement = parsed.summaryStatement || '';
            } catch (e) {
                console.error('Call 6 failed:', e.message);
                gaps = [...peGaps, ...keGaps].map(g => ({ requirement: g.requirement, gapType: g.status, recommendedSectionType: 'Knowledge Questions', recommendation: 'Review and add coverage for this requirement.', minimumContent: [] }));
                overallVerdict = (peGaps.length === 0 && keGaps.length === 0 && pcGaps.length === 0) ? 'ADEQUATE' : 'REQUIRES DEVELOPMENT';
            }

            // Call 7 — Report text
            setEvalProgress(95);
            const cohortSummary = `${cohort.band} level (FKGL ${targetFKGL}), learner type: ${cohort.learner}, support: ${cohort.support}`;
            try {
                const r7 = await llmCall(
                    `You are writing an RTO compliance report. Write clear, professional plain English. Do not use em dashes. Use full stops between sentences. Do not use bullet points. Write in prose with numbered lists where needed.\n\nWrite a compliance audit report with these sections:\n1. Executive Summary (3-4 sentences)\n2. Assessment Overview (what sections were found)\n3. Readability Summary (how each section scored)\n4. Coverage Analysis (PE, KE, PC findings in prose)\n5. Gaps and Recommendations (what needs to be added)\n6. Instrument Adequacy: state ${overallVerdict}\n\nUNIT: ${unitInfo.code} ${unitInfo.title}\nCOHORT: ${cohortSummary}\nREADABILITY TARGET: FKGL ${targetFKGL}\n\nSECTIONS FOUND: ${sections.map(s => s.name + ' (' + s.type + ')').join(', ')}\nPE COVERAGE: ${peResults.length} items, ${peResults.filter(r => r.status === 'COVERED').length} covered\nKE COVERAGE: ${keResults.length} items, ${keResults.filter(r => r.status === 'COVERED').length} covered\nPC MAPPING: ${elementsResults.flatMap(e => e.performanceCriteria || []).length} criteria, ${elementsResults.flatMap(e => e.performanceCriteria || []).filter(pc => pc.status === 'MAPPED').length} mapped\nGAPS: ${gaps.length} identified`
                );
                setReportText(typeof r7 === 'string' ? r7 : JSON.stringify(r7));
            } catch (e) {
                console.error('Call 7 failed:', e.message);
                setReportText(`Compliance Audit Report\n${unitInfo.code} ${unitInfo.title}\n\nOverall verdict: ${overallVerdict}\n\n${summaryStatement}\n\nOne or more report sections could not be completed. Download the partial report for available findings.`);
            }

            setResults({ sections, peResults, keResults, elementsResults, gaps, overallVerdict, summaryStatement });
            setEvalProgress(100);
            setScreen(5);

        } catch (e) {
            console.error('Evaluation failed:', e);
            setEvalError('One evaluation step could not complete. The report may be incomplete. Try again or check your document.');
        }
    };

    const handleSave = async () => {
        try {
            await base44.entities.WorkLibraryItem.create({
                title: `Evaluate: ${unitInfo.code} — ${unitInfo.title}`,
                task_type: 'evaluate',
                unit_code: unitInfo.code,
                unit_title: unitInfo.title,
                aqf_level: cohortProfile?.band || '',
                output_text: reportText,
            });
            navigate('/library');
        } catch (err) {
            console.error('Save error:', err);
            alert('Failed to save to library.');
        }
    };

    const handleReset = () => {
        setScreen(1);
        setUnitInfo(null);
        setAssessmentDoc(null);
        setCohortProfile(null);
        setResults({});
        setReportText('');
        setEvalError(null);
        setEvalProgress(0);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#ffffff' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 flex-shrink-0" style={{ backgroundColor: '#0d2444' }}>
                <span style={{ color: '#c9a84c', letterSpacing: '2px', fontSize: '13px', fontWeight: 500 }}>CLEARPASS</span>
                <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 400 }}>Evaluate Assessment</span>
                <div style={{ width: '80px' }} />
            </div>

            {screen === 1 && <Screen1 onConfirm={handleScreen1Confirm} />}
            {screen === 2 && <Screen2 unitInfo={unitInfo} onBack={() => setScreen(1)} onConfirm={handleScreen2Confirm} />}
            {screen === 3 && <Screen3 unitInfo={unitInfo} onBack={() => setScreen(2)} onConfirm={handleScreen3Confirm} />}
            {screen === 4 && <Screen4Progress progress={evalProgress} evalError={evalError} />}
            {screen === 5 && (
                <Screen5Report
                    unitInfo={unitInfo}
                    cohortProfile={cohortProfile}
                    results={results}
                    reportText={reportText}
                    onReset={handleReset}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}