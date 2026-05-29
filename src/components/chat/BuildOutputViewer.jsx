import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Download, CheckCircle2, XCircle, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

// ─── Parse the AI output into student + assessor sections ────────────────────

function parseBuildOutput(text) {
    if (!text) return null;

    // Detect BUILD output: must have assessor section markers
    const hasAssessor = /ASSESSOR|MARKING GUIDE|EVIDENCE COVERAGE|COMPLIANCE/i.test(text);
    if (!hasAssessor) return null;

    // Extract mapping document block if present
    let mappingText = null;
    let mappingFilename = null;
    const mappingStartIdx = text.indexOf('<!-- MAPPING_DOCUMENT_START -->');
    const mappingEndIdx = text.indexOf('<!-- MAPPING_DOCUMENT_END -->');
    if (mappingStartIdx !== -1 && mappingEndIdx !== -1) {
        mappingText = text.slice(mappingStartIdx + '<!-- MAPPING_DOCUMENT_START -->'.length, mappingEndIdx).trim();
        // Extract filename hint
        const fnMatch = mappingText.match(/<!--\s*MAPPING_FILENAME:\s*([^\s>]+)\s*-->/);
        if (fnMatch) {
            mappingFilename = fnMatch[1].trim();
            mappingText = mappingText.replace(/<!--\s*MAPPING_FILENAME:[^>]+-->\n?/, '').trim();
        }
        // Remove mapping block from main text
        text = (text.slice(0, mappingStartIdx) + text.slice(mappingEndIdx + '<!-- MAPPING_DOCUMENT_END -->'.length)).trim();
    }

    // Try to split on a clear assessor divider
    const splitPatterns = [
        /\n(?=#+\s*ASSESSOR\b)/i,
        /\n(?=#+\s*ASSESSOR PACK\b)/i,
        /\n(?=#+\s*ASSESSOR SECTION\b)/i,
        /\n(?=---+\s*\nASSESSOR)/i,
        /\n(?=\*{2,}ASSESSOR)/i,
        /\n(?=ASSESSOR PACK\b)/i,
        /\n(?=ASSESSOR SECTION\b)/i,
    ];

    let studentText = text;
    let assessorText = '';

    for (const pattern of splitPatterns) {
        const parts = text.split(pattern);
        if (parts.length >= 2) {
            studentText = parts[0].trim();
            assessorText = parts.slice(1).join('\n').trim();
            break;
        }
    }

    // If no split found but has assessor content, try line-based heuristic
    if (!assessorText) {
        const lines = text.split('\n');
        const splitIdx = lines.findIndex(l => /^#+\s*ASSESSOR|^ASSESSOR PACK|^ASSESSOR SECTION/i.test(l.trim()));
        if (splitIdx > 0) {
            studentText = lines.slice(0, splitIdx).join('\n').trim();
            assessorText = lines.slice(splitIdx).join('\n').trim();
        } else {
            return null;
        }
    }

    const compliance = parseCompliance(assessorText);

    // Try to extract unit codes from the text for the mapping doc filename
    const unitCodes = [];
    const codeMatches = text.matchAll(/\b([A-Z]{3,8}\d{3,6}[A-Z]?)\b/g);
    for (const m of codeMatches) {
        if (!unitCodes.includes(m[1])) unitCodes.push(m[1]);
    }

    return { studentText, assessorText, compliance, mappingText, mappingFilename, unitCodes };
}

function parseCompliance(text) {
    const keMatch = text.match(/Knowledge Evidence[^:\n]*:?\s*(\d+)\s*[/of]+\s*(\d+)/i);
    const peMatch = text.match(/Performance Evidence[^:\n]*:?\s*(\d+)\s*[/of]+\s*(\d+)/i);
    const pcMatch = text.match(/Performance Criteria[^:\n]*:?\s*(\d+)\s*[/of]+\s*(\d+)/i);

    const adequate = /\bADEQUATE\b/i.test(text) && !/REQUIRES DEVELOPMENT/i.test(text);
    const requiresDev = /REQUIRES DEVELOPMENT/i.test(text);

    return {
        ke: keMatch ? { covered: parseInt(keMatch[1]), total: parseInt(keMatch[2]) } : null,
        pe: peMatch ? { covered: parseInt(peMatch[1]), total: parseInt(peMatch[2]) } : null,
        pc: pcMatch ? { covered: parseInt(pcMatch[1]), total: parseInt(pcMatch[2]) } : null,
        status: requiresDev ? 'requires_development' : adequate ? 'adequate' : null,
    };
}

// ─── Compliance summary card ──────────────────────────────────────────────────

function ComplianceSummaryCard({ compliance }) {
    if (!compliance) return null;
    const { ke, pe, pc, status } = compliance;
    if (!ke && !pe && !pc && !status) return null;

    const rows = [
        ke && { label: 'Knowledge Evidence (KE)', covered: ke.covered, total: ke.total },
        pe && { label: 'Performance Evidence (PE)', covered: pe.covered, total: pe.total },
        pc && { label: 'Performance Criteria (PC)', covered: pc.covered, total: pc.total },
    ].filter(Boolean);

    return (
        <div className="rounded-xl border border-border bg-muted/30 p-4 mb-5 space-y-3">
            <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Compliance Summary</p>
            <div className="space-y-2">
                {rows.map(row => {
                    const ok = row.covered >= row.total;
                    return (
                        <div key={row.label} className="flex items-center gap-2">
                            {ok
                                ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                : <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                            }
                            <span className="text-sm text-foreground">
                                {row.label}:
                                <span className={cn("ml-1 font-semibold", ok ? "text-green-700" : "text-amber-700")}>
                                    {row.covered}/{row.total} covered
                                </span>
                            </span>
                        </div>
                    );
                })}
            </div>
            {status && (
                <div className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold mt-1",
                    status === 'adequate'
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                )}>
                    {status === 'adequate'
                        ? <CheckCircle2 className="h-4 w-4" />
                        : <XCircle className="h-4 w-4" />
                    }
                    Overall: {status === 'adequate' ? 'ADEQUATE' : 'REQUIRES DEVELOPMENT'}
                </div>
            )}
        </div>
    );
}

// ─── Document markdown renderer ───────────────────────────────────────────────

function DocumentContent({ children }) {
    return (
        <ReactMarkdown
            className="prose prose-sm max-w-none text-foreground
                [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-[#1e3a5f] [&_h1]:mt-8 [&_h1]:mb-3 [&_h1]:pb-2 [&_h1]:border-b
                [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-[#1e3a5f] [&_h2]:mt-6 [&_h2]:mb-2
                [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-4 [&_h3]:mb-1.5
                [&_p]:text-sm [&_p]:leading-relaxed [&_p]:my-2
                [&_ol]:my-3 [&_ol]:ml-5 [&_ol]:list-decimal
                [&_ul]:my-3 [&_ul]:ml-5 [&_ul]:list-disc
                [&_li]:text-sm [&_li]:leading-relaxed [&_li]:my-1
                [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:text-sm
                [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:bg-muted [&_th]:font-semibold [&_th]:text-left
                [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2
                [&_hr]:my-6 [&_hr]:border-border
                [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
                [&>*:first-child]:mt-0"
        >
            {children}
        </ReactMarkdown>
    );
}

// ─── Download handlers ────────────────────────────────────────────────────────

function downloadAsWord(studentText, assessorText) {
    const mdToHtml = (md) =>
        md
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(?!<[hlip])/gm, '<p>')
            .replace(/<\/p><p>(<[hlip])/g, '$1');

    const glossary = `
<div style="page-break-before:always">
<h1 style="text-align:center;font-size:12pt;color:#0d2444">GLOSSARY OF TERMS USED IN THIS DOCUMENT</h1>
<p style="font-style:italic;color:#6b7280;font-size:10pt">The following terms and short forms are used in this document. If you are new to VET assessment, this list will help you understand what each term means.</p>
<hr/>
<p><strong style="color:#0d2444">AC — Assessment Conditions</strong><br/><span style="margin-left:8mm;display:inline-block">The environment, resources, and requirements that must be in place when assessment takes place.</span></p>
<p><strong style="color:#0d2444">AQF — Australian Qualifications Framework</strong><br/><span style="margin-left:8mm;display:inline-block">The national policy that sets the standards for all qualifications in Australia, from Certificate I through to Doctoral Degree.</span></p>
<p><strong style="color:#0d2444">ASQA — Australian Skills Quality Authority</strong><br/><span style="margin-left:8mm;display:inline-block">The national regulator for Registered Training Organisations and vocational qualifications in Australia.</span></p>
<p><strong style="color:#0d2444">FKGL — Flesch-Kincaid Grade Level</strong><br/><span style="margin-left:8mm;display:inline-block">A number that shows the school grade level a reader needs to comfortably understand a text. A higher number means harder to read.</span></p>
<p><strong style="color:#0d2444">FRE — Flesch Reading Ease Score</strong><br/><span style="margin-left:8mm;display:inline-block">A score from 0 to 100 that shows how easy a text is to read. A higher number means the text is easier to read.</span></p>
<p><strong style="color:#0d2444">KE — Knowledge Evidence</strong><br/><span style="margin-left:8mm;display:inline-block">What a learner must know and be able to explain to be assessed as competent in this unit.</span></p>
<p><strong style="color:#0d2444">NYS — Not Yet Satisfactory</strong><br/><span style="margin-left:8mm;display:inline-block">The learner has not yet met the requirements for this task or question and needs to resubmit.</span></p>
<p><strong style="color:#0d2444">PC — Performance Criteria</strong><br/><span style="margin-left:8mm;display:inline-block">The specific standards a learner must meet to demonstrate competency within each Element of the unit.</span></p>
<p><strong style="color:#0d2444">PE — Performance Evidence</strong><br/><span style="margin-left:8mm;display:inline-block">What a learner must be able to DO and demonstrate in practice to be assessed as competent in this unit.</span></p>
<p><strong style="color:#0d2444">RTO — Registered Training Organisation</strong><br/><span style="margin-left:8mm;display:inline-block">A training provider registered with ASQA or a state regulator to deliver and assess vocational qualifications.</span></p>
<p><strong style="color:#0d2444">S — Satisfactory</strong><br/><span style="margin-left:8mm;display:inline-block">The learner has met the requirements for this task or question.</span></p>
<p><strong style="color:#0d2444">UoC — Unit of Competency</strong><br/><span style="margin-left:8mm;display:inline-block">A single unit from an Australian Training Package that describes exactly what a learner must know and be able to do to be considered competent in that area of work.</span></p>
<p><strong style="color:#0d2444">VET — Vocational Education and Training</strong><br/><span style="margin-left:8mm;display:inline-block">The Australian system of practical qualifications, from Certificate I through to Advanced Diploma, delivered by RTOs and TAFEs.</span></p>
</div>`;

    const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>Assessment</title>
  <style>
    body { font-family: Calibri, sans-serif; font-size: 11pt; margin: 2cm; }
    h1 { font-size: 16pt; color: #1e3a5f; margin-top: 18pt; }
    h2 { font-size: 13pt; color: #1e3a5f; margin-top: 14pt; }
    h3 { font-size: 11pt; font-weight: bold; margin-top: 10pt; }
    p, li { font-size: 11pt; line-height: 1.5; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #ccc; padding: 6px 8px; font-size: 10pt; }
    th { background: #f0f0f0; font-weight: bold; }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>
  <h1>Student Assessment</h1>
  ${mdToHtml(studentText)}
  <div class="page-break"></div>
  <h1>Assessor Pack</h1>
  ${mdToHtml(assessorText)}
  ${glossary}
</body>
</html>`;

    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assessment.doc';
    a.click();
    URL.revokeObjectURL(url);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BuildOutputViewer({ text }) {
    const [activeTab, setActiveTab] = useState('student');
    const [downloadingMapping, setDownloadingMapping] = useState(false);
    const [mappingError, setMappingError] = useState(null);

    const parsed = parseBuildOutput(text);
    if (!parsed) return null;

    const { studentText, assessorText, compliance, mappingText, mappingFilename, unitCodes } = parsed;

    const handleDownloadMapping = async () => {
        if (!mappingText) return;
        setDownloadingMapping(true);
        setMappingError(null);
        try {
            const filename = mappingFilename || (unitCodes.length > 0
                ? unitCodes.slice(0, 4).join('-') + '-mapping-document.docx'
                : 'mapping-document.docx');

            const res = await base44.functions.invoke('buildMappingDocument', {
                mapping_text: mappingText,
                unit_codes: unitCodes,
                filename,
            });
            if (res?.data?.error) throw new Error(res.data.error);
            const { file_base64, filename: outFilename } = res.data;
            const bytes = atob(file_base64);
            const buf = new Uint8Array(bytes.length);
            for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = outFilename;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            setMappingError('Download failed: ' + err.message);
        } finally {
            setDownloadingMapping(false);
        }
    };

    return (
        <div className="space-y-3 w-full">
            {/* Tab bar */}
            <div className="bg-white dark:bg-card border rounded-2xl shadow-sm overflow-hidden">
                <div className="flex border-b">
                    {[
                        { id: 'student', label: 'Student Assessment' },
                        { id: 'assessor', label: 'Assessor Pack' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="flex-1 px-5 py-3 text-sm font-medium transition-colors"
                            style={{
                                backgroundColor: activeTab === tab.id ? '#ffffff' : '#f9fafb',
                                color: activeTab === tab.id ? '#0d2444' : '#6b7280',
                                borderBottom: activeTab === tab.id ? '2px solid #c9a84c' : '2px solid transparent',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {activeTab === 'student' && (
                        <DocumentContent>{studentText}</DocumentContent>
                    )}
                    {activeTab === 'assessor' && (
                        <>
                            <ComplianceSummaryCard compliance={compliance} />
                            <DocumentContent>{assessorText}</DocumentContent>
                        </>
                    )}
                </div>
            </div>

            {/* Download — Assessment */}
            <Button
                className="w-full gap-2 transition-opacity hover:opacity-90"
                size="lg"
                style={{ backgroundColor: '#c9a84c', color: '#0d2444', border: 'none' }}
                onClick={() => downloadAsWord(studentText, assessorText)}
            >
                <Download className="h-4 w-4" />
                Download as Word document
            </Button>

            {/* Download — Mapping document (only shown when mapping data present) */}
            {mappingText && (
                <Button
                    className="w-full gap-2 transition-opacity hover:opacity-80"
                    size="lg"
                    variant="outline"
                    disabled={downloadingMapping}
                    style={{ border: '1px solid #0d2444', color: '#0d2444', backgroundColor: 'transparent' }}
                    onClick={handleDownloadMapping}
                >
                    {downloadingMapping ? (
                        <>
                            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Building mapping document…
                        </>
                    ) : (
                        <>
                            <FileText className="h-4 w-4" />
                            Download mapping document →
                        </>
                    )}
                </Button>
            )}

            {mappingError && (
                <p className="text-xs text-red-600 text-center">{mappingError}</p>
            )}
        </div>
    );
}