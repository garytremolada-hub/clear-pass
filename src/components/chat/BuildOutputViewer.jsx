import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Download, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Parse the AI output into student + assessor sections ────────────────────

function parseBuildOutput(text) {
    if (!text) return null;

    // Detect BUILD output: must have assessor section markers
    const hasAssessor = /ASSESSOR|MARKING GUIDE|EVIDENCE COVERAGE|COMPLIANCE/i.test(text);
    if (!hasAssessor) return null;

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
            return null; // Can't parse as build output
        }
    }

    // Parse compliance stats from assessor section
    const compliance = parseCompliance(assessorText);

    return { studentText, assessorText, compliance };
}

function parseCompliance(text) {
    // Look for coverage counts like "4/5" or "4 of 5"
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
        ke && { label: 'Knowledge Evidence', covered: ke.covered, total: ke.total },
        pe && { label: 'Performance Evidence', covered: pe.covered, total: pe.total },
        pc && { label: 'Performance Criteria', covered: pc.covered, total: pc.total },
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

// ─── Download handler ─────────────────────────────────────────────────────────

function downloadAsWord(studentText, assessorText) {
    // Build a minimal HTML doc that Word can open
    const escHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Convert basic markdown to HTML for Word
    function mdToHtml(md) {
        return md
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
    }

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
    const parsed = parseBuildOutput(text);
    if (!parsed) return null;

    const { studentText, assessorText, compliance } = parsed;

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

            {/* Download button */}
            <Button
                className="w-full gap-2 transition-opacity hover:opacity-90"
                size="lg"
                style={{ backgroundColor: '#c9a84c', color: '#0d2444', border: 'none' }}
                onClick={() => downloadAsWord(studentText, assessorText)}
            >
                <Download className="h-4 w-4" />
                Download as Word document
            </Button>
        </div>
    );
}