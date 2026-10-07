import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { extractDocxText } from '@/lib/extractDocxText';
import { Upload, Loader2, AlertCircle } from 'lucide-react';

const MAX_SIZE = 5 * 1024 * 1024;

const UNIT_SCHEMA = {
    type: 'object',
    properties: {
        unitCode: { type: 'string' },
        unitTitle: { type: 'string' },
        elements: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    number: { type: 'number' },
                    title: { type: 'string' },
                    performanceCriteria: {
                        type: 'array',
                        items: { type: 'object', properties: { ref: { type: 'string' }, text: { type: 'string' } } },
                    },
                },
            },
        },
        performanceEvidence: { type: 'array', items: { type: 'string' } },
        knowledgeEvidence: {
            type: 'array',
            items: { type: 'object', properties: { text: { type: 'string' }, subItems: { type: 'array', items: { type: 'string' } } } },
        },
        assessmentConditions: { type: 'array', items: { type: 'string' } },
        foundationSkills: {
            type: 'array',
            items: { type: 'object', properties: { skill: { type: 'string' }, descriptions: { type: 'array', items: { type: 'string' } } } },
        },
    },
};

async function readFileText(file) {
    if (file.name.toLowerCase().endsWith('.docx')) {
        const result = await extractDocxText(file);
        return result.text;
    }
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri });
    const res = await base44.functions.invoke('extractDocumentText', { file_url: signed_url, file_name: file.name, label: 'Unit of Competency' });
    return res?.data?.text || '';
}

async function parseUnit(text) {
    const r = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract this Australian VET Unit of Competency into JSON. Copy wording verbatim; do not invent or drop items.
- unitCode and unitTitle
- elements: each with number, title and its performanceCriteria (ref like "1.1", and text)
- performanceEvidence: one string per requirement
- knowledgeEvidence: one entry per requirement, with subItems for any bullet sub-list
- assessmentConditions: one string per paragraph
- foundationSkills: skill name with its descriptions

UNIT TEXT:
${text}`,
        response_json_schema: UNIT_SCHEMA,
        model: 'claude_sonnet_4_6',
    });
    const elements = r.elements || [];
    const performanceEvidence = r.performanceEvidence || [];
    const knowledgeEvidence = r.knowledgeEvidence || [];
    const assessmentConditions = r.assessmentConditions || [];
    const foundationSkills = r.foundationSkills || [];
    return {
        unitCode: (r.unitCode || '').trim().toUpperCase(),
        unitTitle: r.unitTitle || '',
        releaseNumber: 'Uploaded',
        elements, performanceEvidence, knowledgeEvidence, assessmentConditions, foundationSkills,
        summary: {
            elementCount: elements.length,
            pcCount: elements.reduce((n, el) => n + (el.performanceCriteria || []).length, 0),
            peCount: performanceEvidence.length,
            keCount: knowledgeEvidence.length,
            acCount: assessmentConditions.length,
            fsCount: foundationSkills.length,
        },
    };
}

export default function UnitFileDrop({ onUnit }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef();

    const handleFile = async (file) => {
        if (!file) return;
        if (!file.name.match(/\.(pdf|docx)$/i)) { setError('Please use a .pdf or .docx file.'); return; }
        if (file.size > MAX_SIZE) { setError('That file is over 5 MB. Try a smaller file.'); return; }
        setBusy(true);
        setError('');
        try {
            const text = await readFileText(file);
            if (!text || text.trim().length < 100) throw new Error('empty');
            const uocData = await parseUnit(text);
            if (!uocData.unitCode) throw new Error('nocode');
            onUnit(uocData);
        } catch (err) {
            setError(err.message === 'empty'
                ? 'We could not read any text in that file. It may be a scanned image.'
                : err.message === 'nocode'
                    ? 'We could not find a unit code in that file.'
                    : 'We could not read that file. Try a different one.');
        } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    return (
        <div style={{ marginBottom: '16px' }}>
            <div
                onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
                onDragOver={e => e.preventDefault()}
                onClick={() => !busy && inputRef.current?.click()}
                style={{ border: '2px dashed #e5e7eb', borderRadius: '10px', padding: '22px', textAlign: 'center', backgroundColor: '#f9fafb', cursor: busy ? 'default' : 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a84c'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
            >
                <input ref={inputRef} type="file" accept=".pdf,.docx" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
                {busy ? (
                    <>
                        <Loader2 style={{ color: '#c9a84c', width: '24px', height: '24px', margin: '0 auto 8px', animation: 'spin 1s linear infinite' }} />
                        <p style={{ color: '#6b7280', fontSize: '13px' }}>Reading your unit...</p>
                    </>
                ) : (
                    <>
                        <Upload style={{ color: '#c9a84c', width: '24px', height: '24px', margin: '0 auto 8px' }} />
                        <p style={{ color: '#0d2444', fontSize: '14px', marginBottom: '4px' }}>Or drop your unit document here, or click to browse</p>
                        <p style={{ color: '#9ca3af', fontSize: '12px' }}>.pdf or .docx, up to 5 MB. Use either the unit code or a file.</p>
                    </>
                )}
            </div>
            {error && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '8px', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px 12px', backgroundColor: '#fef2f2' }}>
                    <AlertCircle style={{ color: '#ef4444', width: '16px', height: '16px', flexShrink: 0, marginTop: '1px' }} />
                    <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{error}</p>
                </div>
            )}
        </div>
    );
}