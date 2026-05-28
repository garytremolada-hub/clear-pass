import { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { downloadAsDocx } from '@/lib/downloadDocx';
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
    const [wordCount, setWordCount] = useState(null); // authoritative count from extracted text
    const [error, setError] = useState(null);
    const [showRewriteModal, setShowRewriteModal] = useState(false);
    const [rewriting, setRewriting] = useState(false);
    const [rewritingLabel, setRewritingLabel] = useState('');
    const [rewritingProgress, setRewritingProgress] = useState('');
    const [rewriteResult, setRewriteResult] = useState(null); // { before, after }
    const [rewrittenText, setRewrittenText] = useState(null);
    const inputRef = useRef(null);
    const secondaryInputRef = useRef(null);
    const navigate = useNavigate();

    // Load persisted result on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(LS_KEY);
            if (saved) {
                const { result: r, fileName: n, extractedText: t, wordCount: wc } = JSON.parse(saved);
                if (r) { setResult(r); setFileName(n); setExtractedText(t || null); setWordCount(wc || null); }
            }
        } catch (_) {}
    }, []);

    const persistResult = (r, name, text, wc) => {
        try {
            localStorage.setItem(LS_KEY, JSON.stringify({ result: r, fileName: name, extractedText: text, wordCount: wc }));
        } catch (_) {}
    };

    const clearPersisted = () => {
        try { localStorage.removeItem(LS_KEY); } catch (_) {}
    };

    const handleFile = (f, autoCheck = false) => {
        if (!f) return;
        setFile(f);
        setResult(null);
        setFileName(null);
        setExtractedText(null);
        setWordCount(null);
        setRewriteResult(null);
        setError(null);
        clearPersisted();
        if (autoCheck) {
            // Run check immediately after state settles
            setTimeout(() => runCheck(f), 0);
        }
    };

    const runCheck = async (f) => {
        setLoading(true);
        setError(null);
        try {
            const uploadResult = await base44.integrations.Core.UploadFile({ file: f });
            const fileUrl = uploadResult.file_url;
            const payload = { file_url: fileUrl, file_name: f.name, label: 'Level Check document' };
            const res = await base44.functions.invoke('extractDocumentText', payload);
            const text = res?.data?.text || '';
            if (!text) throw new Error('Could not extract text from this document.');
            const wc = text.trim().split(/\s+/).filter(w => w.length > 0).length;
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
            setFileName(f.name);
            setExtractedText(text);
            setWordCount(wc);
            persistResult(parsed, f.name, text, wc);
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
    };

    const handleCheck = () => {
        if (!file) return;
        runCheck(file);
    };

    // Split text into ~2000-word chunks on paragraph boundaries
    const splitIntoChunks = (text, wordsPerChunk = 2000) => {
        const paragraphs = text.split(/\n\n+/);
        const chunks = [];
        let current = [];
        let wordCount = 0;
        for (const para of paragraphs) {
            const paraWords = para.split(/\s+/).length;
            if (wordCount + paraWords > wordsPerChunk && current.length > 0) {
                chunks.push(current.join('\n\n'));
                current = [para];
                wordCount = paraWords;
            } else {
                current.push(para);
                wordCount += paraWords;
            }
        }
        if (current.length > 0) chunks.push(current.join('\n\n'));
        return chunks;
    };

    // Rewrite modal confirm — chunk-based rewrite then score
    const handleRewriteConfirm = async ({ targetFkgl, learnerLabel, learnerDesc, support }) => {
        setShowRewriteModal(false);
        setRewriting(true);
        setRewritingLabel(learnerLabel);
        setRewritingProgress('');
        setRewriteResult(null);
        setRewrittenText(null);
        setError(null);

        const text = extractedText || '';
        if (!text) {
            setError('No document text found. Please re-upload the document.');
            setRewriting(false);
            return;
        }

        const buildPrompt = (chunkText) => `You are rewriting a document to make it simpler and easier to read.

Target reading level: FKGL ${targetFkgl}
Current reading level: FKGL ${result?.fkgl != null ? result.fkgl.toFixed(1) : 'unknown'}
Learner type: ${learnerDesc || learnerLabel}
Support needs: ${support || 'none'}

REWRITING RULES — follow every rule:
1. Break every long sentence into two or three shorter sentences.
   Target: maximum 15 words per sentence for Cert III/IV and below.
   Maximum 20 words for Diploma and above.
2. Replace every word with 3+ syllables with a simpler word where possible.
   Examples:
   'demonstrate' → 'show'
   'implement' → 'use' or 'put in place'
   'identify' → 'find' or 'name'
   'organisational' → 'workplace'
   'requirements' → 'rules' or 'needs'
   'procedures' → 'steps' or 'process'
3. Use active voice. Change passive sentences to active.
   Example: 'must be completed by the student' → 'you must complete'
4. Remove unnecessary words and phrases.
5. Keep all factual content and assessment requirements intact.
6. Keep question numbers and structure.

PROTECTED TEXT — DO NOT CHANGE:
The following must be copied exactly as they appear in the original — word for word, no changes:
- All Element names and numbers
- All Performance Criteria text
- All Performance Evidence text
- All Knowledge Evidence text
- All Assessment Conditions text
- All unit codes and unit titles
- All text inside tables headed Element or Performance Criteria

Only rewrite:
- Instructions to students
- Question text
- Scenario descriptions
- Administrative text
- Overview and introduction paragraphs
- Assessor instructions (simplify these separately at FKGL 12-14)

Return ONLY the rewritten text.
No explanations. No scoring.
No commentary. No headers.
Just the rewritten document section.

Document section to rewrite:
${chunkText}`;

        try {
            const chunks = splitIntoChunks(text, 2000);
            const rewrittenChunks = [];

            for (let i = 0; i < chunks.length; i++) {
                setRewritingProgress(`Rewriting section ${i + 1} of ${chunks.length}…`);
                const rewritten = await base44.integrations.Core.InvokeLLM({
                    prompt: buildPrompt(chunks[i]),
                    model: 'claude_sonnet_4_6',
                });
                if (!rewritten || rewritten.trim().length < 10) {
                    throw new Error(`Section ${i + 1} could not be rewritten. Please try again.`);
                }
                rewrittenChunks.push(rewritten.trim());
            }

            const fullRewritten = rewrittenChunks.join('\n\n');
            setRewrittenText(fullRewritten);

            // Score the rewritten text (first 4000 chars is representative)
            setRewritingProgress('Scoring rewritten document…');
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
${fullRewritten.slice(0, 4000)}`;

            const scoreRaw = await base44.integrations.Core.InvokeLLM({ prompt: scorePrompt });
            const afterResult = parseReadabilityResult(scoreRaw);
            if (!afterResult) throw new Error('Could not score the rewritten document.');

            setRewriteResult({ before: result, after: afterResult });
        } catch (err) {
            setError(err.message || 'Rewrite failed. Please try again.');
        } finally {
            setRewriting(false);
            setRewritingProgress('');
        }
    };

    const handleDownloadRewrite = () => {
        if (!rewrittenText) return;
        const baseName = (fileName || 'document').replace(/\.(docx?|pdf)$/i, '');
        downloadAsDocx(rewrittenText, `${baseName}-rewritten`);
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
                            Showing result for — <span className="font-medium" style={{ color: '#0d2444' }}>{fileName}</span>
                        </span>
                        <button
                            onClick={handleCheckAnother}
                            style={{
                                marginLeft: '12px',
                                whiteSpace: 'nowrap',
                                fontSize: '12px',
                                fontWeight: 500,
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid #c9a84c',
                                color: '#c9a84c',
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                            }}
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
                        {rewritingProgress && (
                            <p style={{ color: '#6b7280', fontSize: '13px' }}>{rewritingProgress}</p>
                        )}
                    </div>
                )}

                {/* Before/After rewrite result */}
                {rewriteResult && !rewriting && (
                    <div className="space-y-4">
                        <BeforeAfterCards
                            before={rewriteResult.before}
                            after={rewriteResult.after}
                            originalWordCount={wordCount}
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
                            wordCount={wordCount}
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

                {/* Secondary upload area — always visible when a result is showing */}
                {result && !rewriting && (
                    <div>
                        <input
                            ref={secondaryInputRef}
                            type="file"
                            accept=".pdf,.docx"
                            className="hidden"
                            onChange={e => handleFile(e.target.files?.[0], true)}
                        />
                        <div
                            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0], true); }}
                            onDragOver={e => e.preventDefault()}
                            onClick={() => secondaryInputRef.current?.click()}
                            className="cursor-pointer transition-colors"
                            style={{
                                border: '2px dashed #e5e7eb',
                                borderRadius: '8px',
                                padding: '16px',
                                marginTop: '16px',
                                backgroundColor: '#f9fafb',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a84c'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                        >
                            <Upload className="h-5 w-5" style={{ color: '#c9a84c' }} />
                            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                                Drop a new document here or click to browse
                            </p>
                        </div>
                    </div>
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