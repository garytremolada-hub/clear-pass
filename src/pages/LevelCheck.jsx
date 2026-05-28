import { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { ResultCard, BeforeAfterCards } from '@/components/chat/ReadabilityResultCard';
import { parseReadabilityResult, getBandForFkgl } from '@/lib/parseReadabilityResult';
import { useNavigate } from 'react-router-dom';
import RewriteModal from '@/components/levelcheck/RewriteModal';

const LS_KEY = 'clearpass_last_level_check';

export default function LevelCheck() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [fileName, setFileName] = useState(null);
    const [extractedText, setExtractedText] = useState(null); // stored for rewrite
    const [error, setError] = useState(null);
    const [showRewriteModal, setShowRewriteModal] = useState(false);
    const [rewriting, setRewriting] = useState(false);
    const [rewritingLabel, setRewritingLabel] = useState('');
    const [rewriteResult, setRewriteResult] = useState(null); // { before, after }
    const [rewrittenText, setRewrittenText] = useState(null);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Load persisted result on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(LS_KEY);
            if (saved) {
                const { result: r, fileName: n, extractedText: t } = JSON.parse(saved);
                if (r) { setResult(r); setFileName(n); setExtractedText(t || null); }
            }
        } catch (_) {}
    }, []);

    const persistResult = (r, name, text) => {
        try {
            localStorage.setItem(LS_KEY, JSON.stringify({ result: r, fileName: name, extractedText: text }));
        } catch (_) {}
    };

    const clearPersisted = () => {
        try { localStorage.removeItem(LS_KEY); } catch (_) {}
    };

    const handleFile = (f) => {
        if (!f) return;
        setFile(f);
        setResult(null);
        setFileName(null);
        setExtractedText(null);
        setRewriteResult(null);
        setError(null);
        clearPersisted();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
    };

    const handleCheck = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        try {
            const uploadResult = await base44.integrations.Core.UploadFile({ file });
            const fileUrl = uploadResult.file_url;

            const payload = { file_url: fileUrl, file_name: file.name, label: 'Level Check document' };
            const res = await base44.functions.invoke('extractDocumentText', payload);
            const text = res?.data?.text || '';

            if (!text) throw new Error('Could not extract text from this document.');

            const prompt = `Score the following text for readability using FKGL and FRE formulas.

Return ONLY this exact format (no extra commentary):
FKGL: [number]
FRE: [number]
Words: [number]
Sentences: [number]
Syllables: [number]
Summary: [one sentence describing the readability level]
Benchmark: [nearest AQF level or year level]

Text to score:
${text.slice(0, 4000)}`;

            const raw = await base44.integrations.Core.InvokeLLM({ prompt });
            const parsed = parseReadabilityResult(raw);

            if (!parsed) throw new Error('Could not parse readability result.');
            setResult(parsed);
            setFileName(file.name);
            setExtractedText(text);
            persistResult(parsed, file.name, text);
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Rewrite modal confirm — two-step: rewrite text, then score it
    const handleRewriteConfirm = async (targetLevel) => {
        setShowRewriteModal(false);
        setRewriting(true);
        setRewritingLabel(targetLevel);
        setRewriteResult(null);
        setRewrittenText(null);
        setError(null);

        const text = extractedText || '';
        if (!text) {
            setError('No document text found. Please re-upload the document.');
            setRewriting(false);
            return;
        }

        try {
            // Step 1 — rewrite only, no scoring blocks
            const rewritePrompt = `Rewrite the following document to ${targetLevel}.
Return ONLY the rewritten document text — no scoring blocks, no explanations, no markdown headers, no commentary.
Just the rewritten document text.

Document to rewrite:
${text.slice(0, 4000)}`;

            const rewritten = await base44.integrations.Core.InvokeLLM({ prompt: rewritePrompt, model: 'claude_sonnet_4_6' });

            if (!rewritten || rewritten.trim().length < 20) {
                throw new Error('AI did not return a rewritten document. Please try again.');
            }
            setRewrittenText(rewritten);

            // Step 2 — score the rewritten text
            const scorePrompt = `Score the following text for readability using FKGL and FRE formulas.

Return ONLY this exact format (no extra commentary):
FKGL: [number]
FRE: [number]
Words: [number]
Sentences: [number]
Syllables: [number]
Summary: [one sentence describing the readability level]
Benchmark: [nearest AQF level or year level]

Text to score:
${rewritten.slice(0, 4000)}`;

            const scoreRaw = await base44.integrations.Core.InvokeLLM({ prompt: scorePrompt });
            const afterResult = parseReadabilityResult(scoreRaw);

            if (!afterResult) throw new Error('Could not score the rewritten document.');

            setRewriteResult({ before: result, after: afterResult });
        } catch (err) {
            setError(err.message || 'Rewrite failed. Please try again.');
        } finally {
            setRewriting(false);
        }
    };

    const handleDownloadRewrite = () => {
        if (!rewrittenText) return;
        const html = `<html><body style="font-family:Arial,sans-serif;max-width:800px;margin:40px auto;line-height:1.6;">${rewrittenText.replace(/\n/g, '<br/>')}</body></html>`;
        const blob = new Blob([html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rewritten-${fileName || 'document'}.doc`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleBuild = () => {
        const band = getBandForFkgl(result?.fkgl);
        const bandName = band?.name || 'this level';
        const fkglStr = result?.fkgl != null ? result.fkgl.toFixed(1) : '—';
        navigate('/chat', {
            state: {
                quickPrompt: `I want to build an assessment at ${bandName} level (FKGL ${fkglStr}). Please ask me for the UoC.`,
                cohort: true,
            },
        });
    };

    const handleSave = () => {
        if (!result) return;
        const band = getBandForFkgl(result?.fkgl);
        navigate('/library', {
            state: {
                prefill: {
                    title: fileName || 'Level Check result',
                    task_type: 'score',
                    fkgl: result.fkgl,
                    fre: result.fre,
                    band: band?.name,
                    original_text: fileName || '',
                },
            },
        });
    };

    const handleCheckAnother = () => {
        setResult(null);
        setFile(null);
        setFileName(null);
        setExtractedText(null);
        setRewriteResult(null);
        clearPersisted();
    };

    const band = getBandForFkgl(result?.fkgl);
    const bandName = band?.name || '—';
    const fkglStr = result?.fkgl != null ? result.fkgl.toFixed(1) : '—';

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            {/* Header */}
            <div className="flex items-center px-6 py-4" style={{ backgroundColor: '#0d2444', borderBottom: '1px solid #162d50' }}>
                <span style={{ color: '#c9a84c', letterSpacing: '2px', fontSize: '13px', fontWeight: 500, marginRight: '24px' }}>
                    CLEARPASS
                </span>
                <h1 className="text-base font-medium" style={{ color: '#ffffff' }}>Level Check</h1>
            </div>

            {/* Main content */}
            <div className="mx-auto px-6 py-10 space-y-8" style={{ maxWidth: '600px' }}>

                {/* Heading */}
                <div className="space-y-1.5">
                    <h2 style={{ color: '#0d2444', fontSize: '24px', fontWeight: 500, lineHeight: 1.3 }}>
                        Where does your document sit?
                    </h2>
                    <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.6 }}>
                        Upload any document and we'll show you its readability level on the scale — instantly.
                    </p>
                </div>

                {/* Upload area */}
                {!result && (
                    <div>
                        <div
                            onDrop={handleDrop}
                            onDragOver={e => e.preventDefault()}
                            onClick={() => inputRef.current?.click()}
                            className="cursor-pointer transition-colors"
                            style={{
                                border: '2px dashed #e5e7eb',
                                borderRadius: '12px',
                                padding: '40px 24px',
                                backgroundColor: '#f9fafb',
                                textAlign: 'center',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a84c'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                        >
                            <input
                                ref={inputRef}
                                type="file"
                                accept=".pdf,.docx"
                                className="hidden"
                                onChange={e => handleFile(e.target.files?.[0])}
                            />
                            {file ? (
                                <div className="flex flex-col items-center gap-2">
                                    <CheckCircle className="h-8 w-8" style={{ color: '#22c55e' }} />
                                    <p className="text-sm font-medium" style={{ color: '#0d2444' }}>{file.name}</p>
                                    <p className="text-xs" style={{ color: '#6b7280' }}>Click to change file</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <Upload className="h-8 w-8" style={{ color: '#c9a84c' }} />
                                    <p className="text-sm" style={{ color: '#6b7280' }}>Drop your document here or click to browse</p>
                                    <p className="text-xs" style={{ color: '#9ca3af' }}>Accepts .pdf and .docx files</p>
                                </div>
                            )}
                        </div>

                        {file && !loading && (
                            <button
                                onClick={handleCheck}
                                className="w-full mt-4 py-3 px-6 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                                style={{ backgroundColor: '#c9a84c', color: '#0d2444' }}
                            >
                                Check the level
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        )}

                        {loading && (
                            <div className="w-full mt-4 py-3 px-6 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                                style={{ backgroundColor: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                                <div className="h-4 w-4 border-2 border-gray-300 border-t-[#c9a84c] rounded-full animate-spin" />
                                Analysing document…
                            </div>
                        )}

                        {error && (
                            <p className="mt-3 text-sm text-center" style={{ color: '#ef4444' }}>{error}</p>
                        )}
                    </div>
                )}

                {/* Sticky result banner */}
                {result && fileName && (
                    <div className="flex items-center justify-between px-4 py-2.5 rounded-lg" style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
                        <span className="text-sm" style={{ color: '#6b7280' }}>
                            Showing your most recent result — <span className="font-medium" style={{ color: '#0d2444' }}>{fileName}</span>
                        </span>
                        <button
                            onClick={handleCheckAnother}
                            className="text-xs font-medium ml-3 whitespace-nowrap"
                            style={{ color: '#c9a84c', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            Check another document
                        </button>
                    </div>
                )}

                {/* Rewrite in progress */}
                {rewriting && (
                    <div className="flex flex-col items-center justify-center gap-3 py-10">
                        <div className="h-6 w-6 border-2 border-gray-200 border-t-[#c9a84c] rounded-full animate-spin" />
                        <p style={{ color: '#0d2444', fontSize: '14px' }}>
                            Rewriting to <span className="font-medium">{rewritingLabel}</span> level…
                        </p>
                    </div>
                )}

                {/* Before/After rewrite result */}
                {rewriteResult && !rewriting && (
                    <div className="space-y-4">
                        <BeforeAfterCards
                            before={rewriteResult.before}
                            after={rewriteResult.after}
                            onRewrite={() => setShowRewriteModal(true)}
                            onSaveToLibrary={handleSave}
                        />

                        {/* Download rewritten doc */}
                        <button
                            onClick={handleDownloadRewrite}
                            className="w-full py-3 px-6 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                            style={{ backgroundColor: '#c9a84c', color: '#0d2444' }}
                        >
                            Download rewritten document →
                        </button>

                        {/* Build at this level link */}
                        <button
                            onClick={handleBuild}
                            className="w-full text-sm font-medium text-center"
                            style={{ background: 'none', border: 'none', color: '#0d2444', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            Build an assessment at this level →
                        </button>
                    </div>
                )}

                {/* Original result (only show when no rewrite yet) */}
                {result && !rewriteResult && !rewriting && (
                    <div className="space-y-4">
                        <ResultCard
                            result={result}
                            onRewrite={() => setShowRewriteModal(true)}
                            onSaveToLibrary={handleSave}
                        />

                        <button
                            onClick={handleBuild}
                            className="w-full py-3 px-6 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                            style={{ backgroundColor: '#c9a84c', color: '#0d2444' }}
                        >
                            Build an assessment for this level
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {error && result && (
                    <p className="text-sm text-center" style={{ color: '#ef4444' }}>{error}</p>
                )}
            </div>

            {/* Rewrite modal */}
            {showRewriteModal && (
                <RewriteModal
                    bandName={bandName}
                    fkglStr={fkglStr}
                    onConfirm={handleRewriteConfirm}
                    onCancel={() => setShowRewriteModal(false)}
                />
            )}
        </div>
    );
}