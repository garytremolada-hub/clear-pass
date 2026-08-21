import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, Upload, AlertCircle, Loader2 } from 'lucide-react';
import EvalProgress from './EvalProgress';
import { extractDocxText } from '@/lib/extractDocxText';
import { extractAssessableContent, clusterLabel } from '@/lib/evaluateAudit';

export default function EvalScreen2Upload({ units, onBack, onConfirm, previousEvaluation, showComparison, onSetShowComparison }) {
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [extracting, setExtracting] = useState(false);
    const [extractedText, setExtractedText] = useState('');
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
        setError('');
        setExtracting(true);
        try {
            let text = '';
            if (f.name.toLowerCase().endsWith('.docx')) {
                const result = await extractDocxText(f);
                text = result.text;
            } else {
                const up = await base44.integrations.Core.UploadFile({ file: f });
                const res = await base44.functions.invoke('extractDocumentText', { file_url: up.file_url, file_name: f.name, label: 'Assessment' });
                text = res?.data?.text || '';
            }
            const wc = text.split(/\s+/).filter(Boolean).length;
            setExtractedText(text);
            if (wc < 100) {
                setError('This document could not be read. Try saving it as a new Word file and uploading again, or paste the text directly below.');
                setShowPaste(true);
            }
        } catch (err) {
            console.error('Evaluate file extraction failed:', err?.message);
            setError(`This document could not be read (${err.message}). Try saving it as a new Word file and uploading again, or paste the text directly below.`);
            setShowPaste(true);
        } finally {
            setExtracting(false);
        }
    };

    const handlePasteChange = (val) => {
        setPasteText(val);
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
            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 56px' }}>
                <EvalProgress step={2} />
                <h2 style={{ color: '#0d2444', fontSize: '24px', fontWeight: 500, marginBottom: '8px' }}>
                    Upload the assessment to evaluate
                </h2>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
                    Upload the existing assessment you want to check against {clusterLabel(units)}
                </p>

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
                            onClick={() => { setExtractedText(''); setFile(null); setFileName(''); setError(''); }}
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

                {previousEvaluation && (() => {
                    const rd = previousEvaluation.richData;
                    const prevDate = previousEvaluation.created_date
                        ? new Date(previousEvaluation.created_date).toLocaleDateString('en-AU')
                        : 'previously';
                    return (
                        <div style={{ border: '1px solid #c9a84c', borderRadius: '8px', padding: '14px 16px', backgroundColor: '#fefce8', marginBottom: '16px' }}>
                            <p style={{ color: '#0d2444', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                                Previous evaluation found: {previousEvaluation.unit_code.replace(/\|/g, ', ')} evaluated {prevDate}
                            </p>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => onSetShowComparison(true)}
                                    style={{ padding: '5px 12px', border: 'none', borderRadius: '6px', backgroundColor: showComparison ? '#0d2444' : '#c9a84c', color: showComparison ? '#ffffff' : '#0d2444', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
                                >
                                    {showComparison ? 'Comparison on' : 'Yes, show comparison'}
                                </button>
                                <button
                                    onClick={() => onSetShowComparison(false)}
                                    style={{ padding: '5px 12px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'transparent', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}
                                >
                                    No, new report only
                                </button>
                            </div>
                        </div>
                    );
                })()}

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