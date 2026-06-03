import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType,
    VerticalAlign, PageNumber,
} from 'npm:docx@8.5.0';

// ── CONSTANTS (copied from generateStudentBooklet) ────────────────────────────
const NAVY = "0D2444";
const GOLD = "C9A84C";
const WHITE = "FFFFFF";
const LIGHT_GREY = "F9FAFB";
const BORDER_GREY = "D1D5DB";
const PAGE_WIDTH = 9026;

const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: BORDER_GREY };
const navyBorder = { style: BorderStyle.SINGLE, size: 2, color: NAVY };
const navyBorders = { top: navyBorder, bottom: navyBorder, left: navyBorder, right: navyBorder };
const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const cellMargins = { top: 80, bottom: 80, left: 140, right: 140 };
const tallMargins = { top: 120, bottom: 120, left: 140, right: 140 };

// ── HELPERS (copied from generateStudentBooklet) ──────────────────────────────
function infoRow(label, value, alt) {
    return new TableRow({
        children: [
            new TableCell({
                borders,
                width: { size: Math.floor(PAGE_WIDTH * 0.35), type: WidthType.DXA },
                shading: { fill: alt ? LIGHT_GREY : WHITE, type: ShadingType.CLEAR },
                margins: cellMargins,
                children: [new Paragraph({
                    children: [new TextRun({ text: label, bold: true, size: 20, font: "Arial", color: NAVY })]
                })]
            }),
            new TableCell({
                borders,
                width: { size: Math.floor(PAGE_WIDTH * 0.65), type: WidthType.DXA },
                shading: { fill: alt ? LIGHT_GREY : WHITE, type: ShadingType.CLEAR },
                margins: cellMargins,
                children: [new Paragraph({
                    children: [new TextRun({ text: value || "", size: 20, font: "Arial" })]
                })]
            })
        ]
    });
}

function bodyPara(text, opts) {
    opts = opts || {};
    return new Paragraph({
        spacing: { before: opts.before || 80, after: opts.after || 80 },
        children: [new TextRun({
            text,
            size: opts.size || 20,
            font: "Arial",
            bold: opts.bold || false,
            color: opts.color || "000000",
            italics: opts.italic || false
        })]
    });
}

function partHeader(text) {
    return new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [PAGE_WIDTH],
        rows: [new TableRow({
            children: [new TableCell({
                borders: navyBorders,
                width: { size: PAGE_WIDTH, type: WidthType.DXA },
                shading: { fill: NAVY, type: ShadingType.CLEAR },
                margins: { top: 120, bottom: 120, left: 200, right: 200 },
                children: [new Paragraph({
                    children: [new TextRun({ text, bold: true, size: 28, color: WHITE, font: "Arial" })]
                })]
            })]
        })]
    });
}

function questionTable(num, questionText) {
    const qWidth = PAGE_WIDTH;
    const labelWidth = Math.floor(qWidth * 0.55);
    const snsWidth = Math.floor(qWidth * 0.45);

    return new Table({
        width: { size: qWidth, type: WidthType.DXA },
        columnWidths: [qWidth],
        rows: [
            new TableRow({
                children: [new TableCell({
                    borders: navyBorders,
                    width: { size: qWidth, type: WidthType.DXA },
                    shading: { fill: "F0F4FF", type: ShadingType.CLEAR },
                    margins: { top: 100, bottom: 100, left: 140, right: 140 },
                    children: [new Paragraph({
                        children: [
                            new TextRun({ text: `Q${num}.  `, bold: true, size: 22, font: "Arial", color: "0D2444" }),
                            new TextRun({ text: questionText, size: 22, font: "Arial", color: "1A1A1A" })
                        ]
                    })]
                })]
            }),
            new TableRow({
                children: [new TableCell({
                    borders: { top: thinBorder, bottom: { style: BorderStyle.NONE }, left: navyBorder, right: navyBorder },
                    width: { size: qWidth, type: WidthType.DXA },
                    margins: { top: 80, bottom: 40, left: 140, right: 140 },
                    children: [new Paragraph({
                        children: [new TextRun({ text: "Your answer:", bold: true, size: 18, font: "Arial", color: "6B7280", italics: true })]
                    })]
                })]
            }),
            new TableRow({
                height: { value: 1600, rule: "exact" },
                children: [new TableCell({
                    borders: { top: { style: BorderStyle.NONE }, bottom: thinBorder, left: navyBorder, right: navyBorder },
                    width: { size: qWidth, type: WidthType.DXA },
                    margins: { top: 40, bottom: 80, left: 140, right: 140 },
                    children: [new Paragraph({ children: [new TextRun({ text: "", size: 20 })] })]
                })]
            }),
            new TableRow({
                children: [
                    new TableCell({
                        borders: { top: { style: BorderStyle.DASHED, size: 1, color: "D1D5DB" }, bottom: navyBorder, left: navyBorder, right: thinBorder },
                        width: { size: labelWidth, type: WidthType.DXA },
                        shading: { fill: "F9FAFB", type: ShadingType.CLEAR },
                        margins: { top: 60, bottom: 60, left: 140, right: 140 },
                        children: [new Paragraph({
                            children: [new TextRun({ text: "Assessor use only", size: 16, font: "Arial", italics: true, color: "9CA3AF" })]
                        })]
                    }),
                    new TableCell({
                        borders: { top: { style: BorderStyle.DASHED, size: 1, color: "D1D5DB" }, bottom: navyBorder, left: thinBorder, right: navyBorder },
                        width: { size: snsWidth, type: WidthType.DXA },
                        shading: { fill: "F9FAFB", type: ShadingType.CLEAR },
                        margins: { top: 60, bottom: 60, left: 140, right: 140 },
                        verticalAlign: VerticalAlign.CENTER,
                        children: [new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({ text: "S  ", bold: true, size: 20, font: "Arial", color: "14532D" }),
                                new TextRun({ text: "          ", size: 20 }),
                                new TextRun({ text: "NYS", bold: true, size: 20, font: "Arial", color: "991B1B" })
                            ]
                        })]
                    })
                ]
            })
        ]
    });
}

function resultTable(partLabel) {
    return new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [Math.floor(PAGE_WIDTH * 0.4), Math.floor(PAGE_WIDTH * 0.6)],
        rows: [
            new TableRow({ children: [
                new TableCell({ borders: navyBorders, columnSpan: 2, width: { size: PAGE_WIDTH, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: `${partLabel} Result`, bold: true, size: 20, color: WHITE, font: "Arial" })] })] })
            ]}),
            new TableRow({ children: [
                new TableCell({ borders, width: { size: Math.floor(PAGE_WIDTH * 0.4), type: WidthType.DXA }, shading: { fill: LIGHT_GREY, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Overall Result", bold: true, size: 20, font: "Arial", color: NAVY })] })] }),
                new TableCell({ borders, width: { size: Math.floor(PAGE_WIDTH * 0.6), type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Satisfactory     /     Not Yet Satisfactory", size: 20, font: "Arial" })] })] })
            ]}),
            new TableRow({ children: [
                new TableCell({ borders, width: { size: Math.floor(PAGE_WIDTH * 0.4), type: WidthType.DXA }, shading: { fill: LIGHT_GREY, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Assessor Name", bold: true, size: 20, font: "Arial", color: NAVY })] })] }),
                new TableCell({ borders, width: { size: Math.floor(PAGE_WIDTH * 0.6), type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "", size: 20, font: "Arial" })] })] })
            ]}),
            new TableRow({ children: [
                new TableCell({ borders, width: { size: Math.floor(PAGE_WIDTH * 0.4), type: WidthType.DXA }, shading: { fill: LIGHT_GREY, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Assessor Signature", bold: true, size: 20, font: "Arial", color: NAVY })] })] }),
                new TableCell({ borders, width: { size: Math.floor(PAGE_WIDTH * 0.6), type: WidthType.DXA }, margins: tallMargins, children: [new Paragraph({ children: [new TextRun({ text: "", size: 20, font: "Arial" })] })] })
            ]}),
            new TableRow({ children: [
                new TableCell({ borders, width: { size: Math.floor(PAGE_WIDTH * 0.4), type: WidthType.DXA }, shading: { fill: LIGHT_GREY, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Date", bold: true, size: 20, font: "Arial", color: NAVY })] })] }),
                new TableCell({ borders, width: { size: Math.floor(PAGE_WIDTH * 0.6), type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "", size: 20, font: "Arial" })] })] })
            ]})
        ]
    });
}

// ── QUESTION PARSER ───────────────────────────────────────────────────────────
function parseQuestions(text) {
    const modelAnswerPattern = /\*?(Model Answer|Suggested answer|Marking guide|Model answer)[:\s*]/i;

    // Strip model answers from a chunk
    function stripModelAnswer(chunk) {
        const idx = chunk.search(modelAnswerPattern);
        return idx !== -1 ? chunk.slice(0, idx).trim() : chunk.trim();
    }

    // Method 1: Split on S / NS or S/NS markers
    const snsPattern = /\bS\s*\/\s*N[Ss]\b/g;
    const snsMatches = [...text.matchAll(snsPattern)];
    if (snsMatches.length >= 2) {
        const questions = [];
        for (let i = 0; i < snsMatches.length - 1; i++) {
            const start = snsMatches[i].index + snsMatches[i][0].length;
            const end = snsMatches[i + 1].index;
            const chunk = text.slice(start, end).replace(/\bS\s*\/\s*N[Ss]\b/g, '').trim();
            const cleaned = stripModelAnswer(chunk);
            if (cleaned.length > 5) questions.push(cleaned);
        }
        if (questions.length > 0) return questions;
    }

    // Method 2: Split on Q1., Q2., etc.
    const qPattern = /(?:^|\n)\s*(?:\*\*)?Q(\d+)[.)]\s*/g;
    const qMatches = [...text.matchAll(qPattern)];
    if (qMatches.length > 0) {
        const questions = [];
        for (let i = 0; i < qMatches.length; i++) {
            const start = qMatches[i].index + qMatches[i][0].length;
            const end = i + 1 < qMatches.length ? qMatches[i + 1].index : text.length;
            const chunk = text.slice(start, end).replace(/\*\*/g, '').trim();
            const cleaned = stripModelAnswer(chunk);
            if (cleaned.length > 5) questions.push(cleaned);
        }
        if (questions.length > 0) return questions;
    }

    // Method 3: No questions detected
    return [];
}

// ── DOCUMENT BUILDER ──────────────────────────────────────────────────────────
async function buildFormattedRewrite({ unitCode, unitTitle, questions, documentTitle, rewrittenText }) {
    const children = [];

    // 1. Cover section
    children.push(new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [PAGE_WIDTH],
        rows: [new TableRow({
            children: [new TableCell({
                borders: navyBorders,
                width: { size: PAGE_WIDTH, type: WidthType.DXA },
                shading: { fill: NAVY, type: ShadingType.CLEAR },
                margins: { top: 240, bottom: 240, left: 200, right: 200 },
                children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: documentTitle || unitCode || "Assessment", bold: true, size: 32, color: WHITE, font: "Arial" })] }),
                    ...(unitCode ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: unitCode, bold: true, size: 24, color: GOLD, font: "Arial" })] })] : []),
                ]
            })]
        })]
    }));

    children.push(new Paragraph({ spacing: { before: 200, after: 120 }, children: [new TextRun({ text: "Student Details", bold: true, size: 24, font: "Arial", color: NAVY })] }));

    children.push(new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [Math.floor(PAGE_WIDTH * 0.35), Math.floor(PAGE_WIDTH * 0.65)],
        rows: [
            infoRow("Student Name", "", false),
            infoRow("Assessor Name", "", true),
            infoRow("Date", "", false),
        ]
    }));

    // 2. Non-question content (body paragraphs before questions)
    if (rewrittenText) {
        // Extract any leading non-question content
        const firstQMatch = rewrittenText.match(/(?:^|\n)\s*(?:\*\*)?Q\d+[.)]/);
        const firstSNS = rewrittenText.search(/\bS\s*\/\s*N[Ss]\b/);
        const contentEnd = firstQMatch
            ? rewrittenText.indexOf(firstQMatch[0])
            : firstSNS > 0 ? firstSNS : (questions.length === 0 ? rewrittenText.length : 0);

        if (contentEnd > 0) {
            const bodyText = rewrittenText.slice(0, contentEnd).trim();
            if (bodyText) {
                children.push(new Paragraph({ spacing: { before: 200 } }));
                bodyText.split('\n').filter(l => l.trim()).forEach(line => {
                    children.push(bodyPara(line.replace(/\*\*/g, '').trim(), { after: 120 }));
                });
            }
        }

        // If no questions found at all, output all content as body paragraphs
        if (questions.length === 0) {
            rewrittenText.split('\n').filter(l => l.trim()).forEach(line => {
                children.push(bodyPara(line.replace(/\*\*/g, '').trim(), { after: 120 }));
            });
        }
    }

    // 3. Questions section
    if (questions.length > 0) {
        children.push(new Paragraph({ spacing: { before: 200 } }));
        children.push(partHeader("WRITTEN QUESTIONS"));
        children.push(new Paragraph({ spacing: { before: 160, after: 80 } }));

        children.push(new Table({
            width: { size: PAGE_WIDTH, type: WidthType.DXA },
            columnWidths: [Math.floor(PAGE_WIDTH * 0.35), Math.floor(PAGE_WIDTH * 0.65)],
            rows: [
                infoRow("Assessment type", "Written questions", false),
                infoRow("Instructions", "Answer each question in your own words. Write in full sentences.", true),
            ]
        }));

        children.push(new Paragraph({ spacing: { before: 160 } }));

        questions.forEach((q, i) => {
            children.push(questionTable(i + 1, q));
            children.push(new Paragraph({ spacing: { before: 160 } }));
        });

        // 4. Result table
        children.push(resultTable("Assessment"));
    }

    // 5. Footer + assemble
    const doc = new Document({
        styles: { default: { document: { run: { font: "Arial", size: 20 } } } },
        sections: [{
            properties: {
                page: {
                    size: { width: 11906, height: 16838 },
                    margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
                }
            },
            footers: {
                default: new Footer({
                    children: [
                        new Table({
                            width: { size: PAGE_WIDTH, type: WidthType.DXA },
                            columnWidths: [Math.floor(PAGE_WIDTH * 0.5), Math.floor(PAGE_WIDTH * 0.25), Math.floor(PAGE_WIDTH * 0.25)],
                            rows: [new TableRow({
                                children: [
                                    new TableCell({ borders: { top: thinBorder, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, width: { size: Math.floor(PAGE_WIDTH * 0.5), type: WidthType.DXA }, margins: { top: 80 }, children: [new Paragraph({ children: [new TextRun({ text: [unitCode, unitTitle].filter(Boolean).join(' '), size: 16, font: "Arial", color: "6B7280" })] })] }),
                                    new TableCell({ borders: { top: thinBorder, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, width: { size: Math.floor(PAGE_WIDTH * 0.25), type: WidthType.DXA }, margins: { top: 80 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Version 1.0", size: 16, font: "Arial", color: "6B7280" })] })] }),
                                    new TableCell({ borders: { top: thinBorder, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, width: { size: Math.floor(PAGE_WIDTH * 0.25), type: WidthType.DXA }, margins: { top: 80 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Page ", size: 16, font: "Arial", color: "6B7280" }), new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Arial", color: "6B7280" })] })] }),
                                ]
                            })]
                        })
                    ]
                })
            },
            children
        }]
    });

    const buffer = await Packer.toBuffer(doc);
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const CHUNK = 8192;
    for (let i = 0; i < bytes.byteLength; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return { file_base64: btoa(binary) };
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const questions = parseQuestions(body.rewrittenText || '');
        const result = await buildFormattedRewrite({
            unitCode: body.unitCode || '',
            unitTitle: body.unitTitle || '',
            questions,
            documentTitle: body.documentTitle || '',
            rewrittenText: body.rewrittenText || '',
        });
        return Response.json(result);
    } catch (error) {
        console.error('generateFormattedRewrite error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});