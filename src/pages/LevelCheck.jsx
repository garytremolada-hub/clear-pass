import { useState, useRef } from 'react';
import { Upload, CheckCircle, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { ResultCard } from '@/components/chat/ReadabilityResultCard';
import { parseReadabilityResult } from '@/lib/parseReadabilityResult';
import { useNavigate } from 'react-router-dom';

export default function LevelCheck() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    const handleFile = (f) => {
        if (!f) return;
        setFile(f);
        setResult(null);
        setError(null);
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
            // Upload file to get a URL
            const uploadResult = await base44.integrations.Core.UploadFile({ file });
            const fileUrl = uploadResult.file_url;

            // Extract text — match exact param names the function expects
            const payload = { file_url: fileUrl, file_name: file.name, label: 'Level Check document' };
            console.log('[LevelCheck] Calling extractDocumentText with:', payload);

            const res = await base44.functions.invoke('extractDocumentText', payload);
            const text = res?.data?.text || '';

            console.log('[LevelCheck] Extracted text length:', text?.length, '— preview:', text?.slice(0, 120));

            if (!text) throw new Error('Could not extract text from this document.');

            // Score via LLM
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
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleBuild = () => {
        const level = result?.fkgl ? `FKGL ${result.fkgl.toFixed(1)}` : '';
        navigate('/chat', {
            state: {
                quickPrompt: `I want to build a new assessment from a UoC. The target readability level is ${level}.`,
                cohort: true,
            },
        });
    };

    const handleSave = () => {
        // Fire save event to chat — navigate first
        navigate('/chat', {
            state: {
                quickPrompt: 'Please save the last result to the work library.',
                cohort: false,
            },
        });
    };

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

                {/* Result */}
                {result && (
                    <div className="space-y-5">
                        <ResultCard result={result} />

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleBuild}
                                className="w-full py-3 px-6 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                                style={{ backgroundColor: '#c9a84c', color: '#0d2444' }}
                            >
                                Build an assessment for this level
                                <ArrowRight className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => { setResult(null); setFile(null); }}
                                className="text-sm underline text-center"
                                style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                Check another document
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}