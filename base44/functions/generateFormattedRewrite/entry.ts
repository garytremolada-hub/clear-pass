import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType,
    VerticalAlign, PageNumber, PageBreak,
} from 'npm:docx@8.5.0';

// ── CONSTANTS ────────────────────────────────────────────────────────────────
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

// ── HELPERS ──────────────────────────────────────────────────────────────────
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
  const snsWidth = qWidth - labelWidth;

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
              new TextRun({ text: `Q${num}.  `, bold: true,
                size: 22, font: "Arial", color: "0D2444" }),
              new TextRun({ text: questionText, size: 22,
                font: "Arial", color: "1A1A1A" })
            ]
          })]
        })]
      }),
      new TableRow({
        children: [new TableCell({
          borders: {
            top: thinBorder,
            bottom: { style: BorderStyle.NONE },
            left: navyBorder,
            right: navyBorder
          },
          width: { size: qWidth, type: WidthType.DXA },
          margins: { top: 80, bottom: 40, left: 140, right: 140 },
          children: [new Paragraph({
            children: [new TextRun({
              text: "Your answer:", bold: true, size: 18,
              font: "Arial", color: "6B7280", italics: true
            })]
          })]
        })]
      }),
      new TableRow({
        height: { value: 1600, rule: "exact" },
        children: [new TableCell({
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: thinBorder,
            left: navyBorder,
            right: navyBorder
          },
          width: { size: qWidth, type: WidthType.DXA },
          margins: { top: 40, bottom: 80, left: 140, right: 140 },
          children: [new Paragraph({
            children: [new TextRun({ text: "", size: 20 })]
          })]
        })]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top: { style: BorderStyle.DASHED, size: 1, color: "D1D5DB" },
              bottom: navyBorder,
              left: navyBorder,
              right: thinBorder
            },
            width: { size: labelWidth, type: WidthType.DXA },
            shading: { fill: "F9FAFB", type: ShadingType.CLEAR },
            margins: { top: 60, bottom: 60, left: 140, right: 140 },
            children: [new Paragraph({
              children: [new TextRun({
                text: "Assessor use only", size: 16,
                font: "Arial", italics: true, color: "9CA3AF"
              })]
            })]
          }),
          new TableCell({
            borders: {
              top: { style: BorderStyle.DASHED, size: 1, color: "D1D5DB" },
              bottom: navyBorder,
              left: thinBorder,
              right: navyBorder
            },
            width: { size: snsWidth, type: WidthType.DXA },
            shading: { fill: "F9FAFB", type: ShadingType.CLEAR },
            margins: { top: 60, bottom: 60, left: 140, right: 140 },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "S", bold: true, size: 20,
                  font: "Arial", color: "14532D" }),
                new TextRun({ text: "            ", size: 20 }),
                new TextRun({ text: "NYS", bold: true, size: 20,
                  font: "Arial", color: "991B1B" })
              ]
            })]
          })
        ]
      })
    ]
  });
}

function resultTable() {
    return new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [Math.floor(PAGE_WIDTH * 0.4), Math.floor(PAGE_WIDTH * 0.6)],
        rows: [
            new TableRow({ children: [
                new TableCell({ borders: navyBorders, columnSpan: 2, width: { size: PAGE_WIDTH, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Assessment Result", bold: true, size: 20, color: WHITE, font: "Arial" })] })] })
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

// ── QUESTION EXTRACTOR ────────────────────────────────────────────────────────
// Step 1: Locate the written questions section
function locateQuestionsSection(text) {
    // Look for "ASSESSMENT 1: WRITTEN QUESTIONS" or "WRITTEN QUESTIONS"
    const sectionPattern = /ASSESSMENT\s+\d+[:\s]+WRITTEN\s+QUESTIONS|WRITTEN\s+QUESTIONS/i;
    const match = text.search(sectionPattern);
    if (match !== -1) {
        return text.slice(match);
    }
    return text; // fallback: use full text
}

// Step 2 & 3: Extract individual questions from the section
function extractQuestions(sectionText) {
    const modelAnswerPattern = /\*?(Model Answer|Suggested answer?|Marking guide|Model answer)[:\s*]/i;

    function stripModelAnswer(chunk) {
        const idx = chunk.search(modelAnswerPattern);
        return idx !== -1 ? chunk.slice(0, idx).trim() : chunk.trim();
    }

    function cleanQuestion(raw) {
        return raw
            .replace(/\bS\s*\/\s*N[Ss]\b/g, '')  // remove S/NS markers
            .replace(/\*\*/g, '')                   // remove markdown bold
            .trim();
    }

    const stopMarkers = [
        'ASSESSMENT TASK 1: OUTCOME',
        'Assessment Task 1: Outcome',
        'Assessment Task 1 Outcome',
        'TO BE COMPLETED BY THE ASSESSOR',
        'INSTRUCTIONS TO ASSESSORS',
        'ASSESSMENT TASK 2',
        'Assessment Task 2',
        'Did the student answer all questions correctly',
        'Feedback to the student',
        'arrangements have been made for reassessment',
        'Tick if Feedback provided',
    ];

    // Method 1: Split on S / NS or S/NS boundaries
    const snsPattern = /\bS\s*\/\s*N[Ss]\b/g;
    const snsMatches = [...sectionText.matchAll(snsPattern)];
    if (snsMatches.length >= 2) {
        const questions = [];
        let hitStopMarker = false;
        for (let i = 0; i < snsMatches.length - 1; i++) {
            if (hitStopMarker) break;
            const start = snsMatches[i].index + snsMatches[i][0].length;
            const end = snsMatches[i + 1].index;
            const chunk = sectionText.slice(start, end);
            const isStop = stopMarkers.some(marker => chunk.includes(marker));
            if (isStop) { hitStopMarker = true; break; }
            const cleaned = stripModelAnswer(cleanQuestion(chunk));
            if (cleaned.length > 5) questions.push(cleaned);
        }
        if (questions.length > 0) return questions;
    }

    // Method 2: Split on Q1., Q2., etc. (numbered questions)
    const qPattern = /(?:^|\n)\s*(?:\*\*)?Q(\d+)[.)]\s*/g;
    const qMatches = [...sectionText.matchAll(qPattern)];
    if (qMatches.length > 0) {
        const questions = [];
        for (let i = 0; i < qMatches.length; i++) {
            const start = qMatches[i].index + qMatches[i][0].length;
            const end = i + 1 < qMatches.length ? qMatches[i + 1].index : sectionText.length;
            const chunk = sectionText.slice(start, end);
            const cleaned = stripModelAnswer(cleanQuestion(chunk));
            if (cleaned.length > 5) questions.push(cleaned);
        }
        if (questions.length > 0) return questions;
    }

    // Method 3: Split on numbered list "1. " or "1) "
    const numPattern = /(?:^|\n)\s*(\d+)[.)]\s+/g;
    const numMatches = [...sectionText.matchAll(numPattern)];
    if (numMatches.length > 0) {
        const questions = [];
        for (let i = 0; i < numMatches.length; i++) {
            const start = numMatches[i].index + numMatches[i][0].length;
            const end = i + 1 < numMatches.length ? numMatches[i + 1].index : sectionText.length;
            const chunk = sectionText.slice(start, end);
            const cleaned = stripModelAnswer(cleanQuestion(chunk));
            if (cleaned.length > 5) questions.push(cleaned);
        }
        if (questions.length > 0) return questions;
    }

    return [];
}

// ── PROJECT EXTRACTOR ─────────────────────────────────────────────────────────
function extractProjectContent(rewrittenText) {
    const projectMarkers = [
        'ASSESSMENT 2: PROJECT',
        'ASSESSMENT 2 - PROJECT',
        'Assessment 2: Project',
        'Assessment 2 - Project',
        'ASSESSMENT TASK 2',
        'PART B: WORKPLACE PROJECT',
        'PART C: WORKPLACE PROJECT',
    ];

    let projectStart = -1;
    let projectMarker = '';
    for (const marker of projectMarkers) {
        const idx = rewrittenText.indexOf(marker);
        if (idx !== -1) { projectStart = idx; projectMarker = marker; break; }
    }
    if (projectStart === -1) return null;

    const projectSection = rewrittenText.substring(projectStart);

    const assessorMarkers = [
        'TO BE COMPLETED BY THE ASSESSOR',
        'ASSESSMENT 2: ASSESSOR',
        'ASSESSMENT 2: OUTCOME',
        'Did the student demonstrate',
    ];
    let projectEnd = projectSection.length;
    for (const marker of assessorMarkers) {
        const idx = projectSection.indexOf(marker);
        if (idx !== -1 && idx < projectEnd) projectEnd = idx;
    }

    const studentContent = projectSection.substring(0, projectEnd).trim();

    const parts = [];
    const partPattern = /Part [A-C]:|PART [A-C]:|Assessment 2 - Part [A-C]/g;
    const partMatches = [...studentContent.matchAll(partPattern)];

    if (partMatches.length > 1) {
        partMatches.forEach((match, i) => {
            const start = match.index;
            const end = i + 1 < partMatches.length ? partMatches[i + 1].index : studentContent.length;
            parts.push({ title: match[0], content: studentContent.substring(start, end).trim() });
        });
    } else {
        parts.push({ title: projectMarker, content: studentContent });
    }

    return parts;
}

// ── PROJECT TABLE BUILDERS ────────────────────────────────────────────────────
function buildSwotTable() {
    const colW = Math.floor(PAGE_WIDTH / 5);
    const headers = ['Limitation', 'Strengths', 'Weaknesses', 'Opportunities', 'Threats'];
    const headerRow = new TableRow({ children: headers.map(h => new TableCell({
        borders, width: { size: colW, type: WidthType.DXA },
        shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: cellMargins,
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: WHITE, font: 'Arial' })] })]
    }))});
    const dataRows = ['Limitation 1', '', 'Limitation 2', ''].map((label, i) => new TableRow({
        height: { value: 700, rule: 'atLeast' },
        children: [
            new TableCell({ borders, width: { size: colW, type: WidthType.DXA },
                shading: { fill: i % 2 === 0 ? LIGHT_GREY : WHITE, type: ShadingType.CLEAR },
                margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: label, bold: !!label, size: 19, font: 'Arial' })] })] }),
            ...[0,1,2,3].map(() => new TableCell({ borders, width: { size: colW, type: WidthType.DXA }, margins: cellMargins,
                children: [new Paragraph({ children: [new TextRun({ text: '', size: 19 })] })] }))
        ]
    }));
    return new Table({ width: { size: PAGE_WIDTH, type: WidthType.DXA }, columnWidths: [colW,colW,colW,colW,colW], rows: [headerRow, ...dataRows] });
}

function buildProposalTable() {
    const col1 = Math.floor(PAGE_WIDTH * 0.3);
    const col2 = PAGE_WIDTH - col1;
    const sections = ['Title', 'Background', 'Proposed Solutions', 'Benefits', 'Implementation Plan', 'Challenges and Mitigation'];
    return new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [col1, col2],
        rows: [
            new TableRow({ children: [new TableCell({ borders: navyBorders, columnSpan: 2, width: { size: PAGE_WIDTH, type: WidthType.DXA },
                shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: cellMargins,
                children: [new Paragraph({ children: [new TextRun({ text: 'Proposal Document', bold: true, size: 20, color: WHITE, font: 'Arial' })] })] })]}),
            ...sections.map((s, i) => new TableRow({
                height: { value: 700, rule: 'atLeast' },
                children: [
                    new TableCell({ borders, width: { size: col1, type: WidthType.DXA },
                        shading: { fill: i % 2 === 0 ? LIGHT_GREY : WHITE, type: ShadingType.CLEAR }, margins: cellMargins,
                        children: [new Paragraph({ children: [new TextRun({ text: s, bold: true, size: 19, font: 'Arial', color: NAVY })] })] }),
                    new TableCell({ borders, width: { size: col2, type: WidthType.DXA }, margins: cellMargins,
                        children: [new Paragraph({ children: [new TextRun({ text: '', size: 19 })] })] })
                ]
            }))
        ]
    });
}

function buildRevisedSolutionsTable() {
    const colW = Math.floor(PAGE_WIDTH / 4);
    const headers = ['Limitation', 'Original Solution', 'Feedback Received', 'Revised Solution'];
    const rows = ['Communication Breakdown', 'Resistance to Technology'];
    return new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [colW,colW,colW,colW],
        rows: [
            new TableRow({ children: headers.map(h => new TableCell({ borders, width: { size: colW, type: WidthType.DXA },
                shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: cellMargins,
                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: WHITE, font: 'Arial' })] })] }))}),
            ...rows.map((r, i) => new TableRow({
                height: { value: 800, rule: 'atLeast' },
                children: [
                    new TableCell({ borders, width: { size: colW, type: WidthType.DXA },
                        shading: { fill: i % 2 === 0 ? LIGHT_GREY : WHITE, type: ShadingType.CLEAR }, margins: cellMargins,
                        children: [new Paragraph({ children: [new TextRun({ text: r, bold: true, size: 19, font: 'Arial' })] })] }),
                    ...[0,1,2].map(() => new TableCell({ borders, width: { size: colW, type: WidthType.DXA }, margins: cellMargins,
                        children: [new Paragraph({ children: [new TextRun({ text: '', size: 19 })] })] }))
                ]
            }))
        ]
    });
}

function buildGenericAnswerTable() {
    return new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [PAGE_WIDTH],
        rows: [
            new TableRow({ children: [new TableCell({
                borders: { top: thinBorder, bottom: { style: BorderStyle.NONE }, left: navyBorder, right: navyBorder },
                width: { size: PAGE_WIDTH, type: WidthType.DXA },
                margins: { top: 80, bottom: 40, left: 140, right: 140 },
                children: [new Paragraph({ children: [new TextRun({ text: 'Your response:', bold: true, size: 18, font: 'Arial', color: '6B7280', italics: true })] })]
            })] }),
            new TableRow({
                height: { value: 2400, rule: 'exact' },
                children: [new TableCell({
                    borders: { top: { style: BorderStyle.NONE }, bottom: navyBorder, left: navyBorder, right: navyBorder },
                    width: { size: PAGE_WIDTH, type: WidthType.DXA },
                    margins: { top: 40, bottom: 80, left: 140, right: 140 },
                    children: [new Paragraph({ children: [new TextRun({ text: '', size: 20 })] })]
                })]
            })
        ]
    });
}

function buildProjectPart(partTitle, partContent) {
    const elements = [];

    // Part header
    elements.push(new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [PAGE_WIDTH],
        rows: [new TableRow({ children: [new TableCell({
            borders: navyBorders,
            width: { size: PAGE_WIDTH, type: WidthType.DXA },
            shading: { fill: NAVY, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 200, right: 200 },
            children: [new Paragraph({ children: [new TextRun({ text: partTitle.replace(/:/g, '').trim(), bold: true, size: 24, color: WHITE, font: 'Arial' })] })]
        })] })]
    }));
    elements.push(new Paragraph({ spacing: { before: 120 } }));

    // Instructions box
    const instructionText = partContent
        .replace(/\|[^|]*\|/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .substring(0, 2000)
        .trim();

    elements.push(new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [PAGE_WIDTH],
        rows: [
            new TableRow({ children: [new TableCell({
                borders: navyBorders,
                width: { size: PAGE_WIDTH, type: WidthType.DXA },
                shading: { fill: "F0F4FF", type: ShadingType.CLEAR },
                margins: cellMargins,
                children: [new Paragraph({ children: [new TextRun({ text: 'Instructions', bold: true, size: 20, font: 'Arial', color: NAVY })] })]
            })] }),
            new TableRow({ children: [new TableCell({
                borders: navyBorders,
                width: { size: PAGE_WIDTH, type: WidthType.DXA },
                margins: { top: 100, bottom: 100, left: 140, right: 140 },
                children: [new Paragraph({ children: [new TextRun({ text: instructionText, size: 19, font: 'Arial' })] })]
            })] })
        ]
    }));
    elements.push(new Paragraph({ spacing: { before: 160 } }));

    // Appropriate response table
    const hasSwot = /SWOT|Strengths.*Weaknesses/i.test(partContent);
    const hasProposal = /Proposal.*Section|Title.*Background/i.test(partContent);
    const hasRevised = /Revised Solution|Original Solution.*Feedback/i.test(partContent);

    if (hasSwot) elements.push(buildSwotTable());
    else if (hasProposal) elements.push(buildProposalTable());
    else if (hasRevised) elements.push(buildRevisedSolutionsTable());
    else elements.push(buildGenericAnswerTable());

    return elements;
}

// ── DOCUMENT BUILDER ──────────────────────────────────────────────────────────
async function buildFormattedRewrite({ unitCode, unitTitle, documentTitle, questions, rewrittenText }) {
    const children = [];

    // 1. Cover page
    children.push(new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [PAGE_WIDTH],
        rows: [new TableRow({
            children: [new TableCell({
                borders: navyBorders,
                width: { size: PAGE_WIDTH, type: WidthType.DXA },
                shading: { fill: NAVY, type: ShadingType.CLEAR },
                margins: { top: 300, bottom: 300, left: 200, right: 200 },
                children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: documentTitle || "STUDENT ASSESSMENT BOOKLET", bold: true, size: 36, color: WHITE, font: "Arial" })] }),
                    ...(unitCode ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: unitCode, bold: true, size: 28, color: GOLD, font: "Arial" })] })] : []),
                    ...(unitTitle ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: unitTitle, size: 24, color: "C8D6E8", font: "Arial" })] })] : []),
                ]
            })]
        })]
    }));

    // Student details table
    children.push(new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: "Student Details", bold: true, size: 24, font: "Arial", color: NAVY })] }));
    children.push(new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [Math.floor(PAGE_WIDTH * 0.35), Math.floor(PAGE_WIDTH * 0.65)],
        rows: [
            infoRow("Student Name", "", false),
            infoRow("Student ID", "", true),
            infoRow("Assessor Name", "", false),
            infoRow("Date Commenced", "", true),
            infoRow("Date Submitted", "", false),
        ]
    }));

    // 2. Student declaration
    children.push(new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: "Student Declaration", bold: true, size: 24, font: "Arial", color: NAVY })] }));
    children.push(new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [PAGE_WIDTH],
        rows: [new TableRow({
            children: [new TableCell({
                borders: navyBorders,
                width: { size: PAGE_WIDTH, type: WidthType.DXA },
                margins: { top: 120, bottom: 120, left: 140, right: 140 },
                children: [
                    new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "I declare that this work is my own. I have not copied anyone else's work and I understand what plagiarism means.", size: 20, font: "Arial" })] }),
                    new Table({
                        width: { size: PAGE_WIDTH - 280, type: WidthType.DXA },
                        columnWidths: [Math.floor((PAGE_WIDTH - 280) * 0.5), Math.floor((PAGE_WIDTH - 280) * 0.5)],
                        rows: [new TableRow({ children: [
                            new TableCell({ borders, width: { size: Math.floor((PAGE_WIDTH - 280) * 0.5), type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Student Signature: ___________________", size: 20, font: "Arial" })] })] }),
                            new TableCell({ borders, width: { size: Math.floor((PAGE_WIDTH - 280) * 0.5), type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Date: ___________________", size: 20, font: "Arial" })] })] })
                        ]})]
                    })
                ]
            })]
        })]
    }));

    // 3. Page break
    children.push(new Paragraph({ children: [new PageBreak()] }));

    // 4. WRITTEN QUESTIONS part header
    children.push(partHeader("WRITTEN QUESTIONS"));
    children.push(new Paragraph({ spacing: { before: 160, after: 80 } }));

    // 5. Assessment info table
    children.push(new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [Math.floor(PAGE_WIDTH * 0.35), Math.floor(PAGE_WIDTH * 0.65)],
        rows: [
            infoRow("Assessment type", "Written questions", false),
            infoRow("Open or closed book", "Open book — you may use notes and reference materials", true),
            infoRow("Instructions", "Answer each question in your own words. Write in full sentences. Ask your assessor if you have any questions.", false),
        ]
    }));

    children.push(new Paragraph({ spacing: { before: 160 } }));

    // 6. Each question in a bordered table
    if (questions.length > 0) {
        questions.forEach((q, i) => {
            children.push(questionTable(i + 1, q));
            children.push(new Paragraph({ spacing: { before: 160 } }));
        });
    } else {
        children.push(new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: "No questions could be extracted from the rewritten text.", size: 20, font: "Arial", color: "9CA3AF", italics: true })] }));
    }

    // 7. Project assessment (Assessment 2) if present
    const projectParts = rewrittenText ? extractProjectContent(rewrittenText) : null;
    if (projectParts && projectParts.length > 0) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
        children.push(partHeader("WORKPLACE PROJECT"));
        children.push(new Paragraph({ spacing: { before: 160 } }));
        projectParts.forEach((part, i) => {
            if (i > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
            buildProjectPart(part.title, part.content).forEach(el => children.push(el));
        });
        children.push(new Paragraph({ spacing: { before: 160 } }));
    }

    // 8. Assessment result table
    children.push(resultTable());

    // 8. Assemble document with header + footer on every page
    const doc = new Document({
        styles: { default: { document: { run: { font: "Arial", size: 20 } } } },
        sections: [{
            properties: {
                page: {
                    size: { width: 11906, height: 16838 },
                    margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
                }
            },
            headers: {
                default: new Header({
                    children: [
                        new Table({
                            width: { size: PAGE_WIDTH, type: WidthType.DXA },
                            columnWidths: [Math.floor(PAGE_WIDTH * 0.6), Math.floor(PAGE_WIDTH * 0.4)],
                            rows: [new TableRow({
                                children: [
                                    new TableCell({ borders: { bottom: thinBorder, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, width: { size: Math.floor(PAGE_WIDTH * 0.6), type: WidthType.DXA }, margins: { bottom: 80 }, children: [new Paragraph({ children: [new TextRun({ text: "Student Assessment Booklet", size: 16, font: "Arial", color: "6B7280" })] })] }),
                                    new TableCell({ borders: { bottom: thinBorder, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, width: { size: Math.floor(PAGE_WIDTH * 0.4), type: WidthType.DXA }, margins: { bottom: 80 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: unitCode || '', size: 16, font: "Arial", color: "6B7280", bold: true })] })] }),
                                ]
                            })]
                        })
                    ]
                })
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
        const rewrittenText = body.rewrittenText || '';

        // Step 1: Find the questions section
        const questionsSection = locateQuestionsSection(rewrittenText);

        // Step 2 & 3: Extract questions from that section
        const questions = extractQuestions(questionsSection);

        console.log(`Extracted ${questions.length} questions from rewritten text`);

        const result = await buildFormattedRewrite({
            unitCode: body.unitCode || '',
            unitTitle: body.unitTitle || '',
            documentTitle: body.documentTitle || '',
            questions,
            rewrittenText,
        });

        return Response.json(result);
    } catch (error) {
        console.error('generateFormattedRewrite error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});