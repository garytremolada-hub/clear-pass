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
const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const navyBorders = { top: navyBorder, bottom: navyBorder, left: navyBorder, right: navyBorder };
const cellMargins = { top: 80, bottom: 80, left: 140, right: 140 };
const tallMargins = { top: 120, bottom: 120, left: 140, right: 140 };

// ── HELPERS ──────────────────────────────────────────────────────────────────
function navyHeaderRow(text, colSpan) {
    return new TableRow({
        children: [new TableCell({
            borders: navyBorders,
            columnSpan: colSpan || 1,
            width: { size: PAGE_WIDTH, type: WidthType.DXA },
            shading: { fill: NAVY, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [new TextRun({ text, bold: true, size: 26, color: WHITE, font: "Arial" })]
            })]
        })]
    });
}

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
                            new TextRun({ text: `Q${num}.  `, bold: true, size: 22, font: "Arial", color: NAVY }),
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
                        borders: { top: { style: BorderStyle.DASHED, size: 1, color: BORDER_GREY }, bottom: navyBorder, left: navyBorder, right: thinBorder },
                        width: { size: labelWidth, type: WidthType.DXA },
                        shading: { fill: LIGHT_GREY, type: ShadingType.CLEAR },
                        margins: { top: 60, bottom: 60, left: 140, right: 140 },
                        children: [new Paragraph({
                            children: [new TextRun({ text: "Assessor use only", size: 16, font: "Arial", italics: true, color: "9CA3AF" })]
                        })]
                    }),
                    new TableCell({
                        borders: { top: { style: BorderStyle.DASHED, size: 1, color: BORDER_GREY }, bottom: navyBorder, left: thinBorder, right: navyBorder },
                        width: { size: snsWidth, type: WidthType.DXA },
                        shading: { fill: LIGHT_GREY, type: ShadingType.CLEAR },
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

function buildObsTable(obsItems) {
    const col1 = 500;
    const col2 = 4200;
    const col3 = 800;
    const col4 = 800;
    const col5 = PAGE_WIDTH - col1 - col2 - col3 - col4;

    const rows = [
        new TableRow({
            tableHeader: true,
            children: [
                new TableCell({ borders, width: { size: col1, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Item", bold: true, size: 18, color: WHITE, font: "Arial" })] })] }),
                new TableCell({ borders, width: { size: col2, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Observable Behaviour", bold: true, size: 18, color: WHITE, font: "Arial" })] })] }),
                new TableCell({ borders, width: { size: col3, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "S", bold: true, size: 18, color: WHITE, font: "Arial" })] })] }),
                new TableCell({ borders, width: { size: col4, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "NYS", bold: true, size: 18, color: WHITE, font: "Arial" })] })] }),
                new TableCell({ borders, width: { size: col5, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Comments", bold: true, size: 18, color: WHITE, font: "Arial" })] })] }),
            ]
        })
    ];

    obsItems.forEach((item, i) => {
        const bg = i % 2 === 1 ? LIGHT_GREY : WHITE;
        rows.push(new TableRow({
            height: { value: 600, rule: "atLeast" },
            children: [
                new TableCell({ borders, width: { size: col1, type: WidthType.DXA }, shading: { fill: bg, type: ShadingType.CLEAR }, margins: cellMargins, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(i + 1), bold: true, size: 20, font: "Arial" })] })] }),
                new TableCell({ borders, width: { size: col2, type: WidthType.DXA }, shading: { fill: bg, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: item, size: 19, font: "Arial" })] })] }),
                new TableCell({ borders, width: { size: col3, type: WidthType.DXA }, shading: { fill: bg, type: ShadingType.CLEAR }, margins: cellMargins, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "\u2610", size: 22 })] })] }),
                new TableCell({ borders, width: { size: col4, type: WidthType.DXA }, shading: { fill: bg, type: ShadingType.CLEAR }, margins: cellMargins, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "\u2610", size: 22 })] })] }),
                new TableCell({ borders, width: { size: col5, type: WidthType.DXA }, shading: { fill: bg, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "", size: 19 })] })] }),
            ]
        }));
    });

    return new Table({ width: { size: PAGE_WIDTH, type: WidthType.DXA }, columnWidths: [col1, col2, col3, col4, col5], rows });
}

// ── BUILD DOCUMENT ────────────────────────────────────────────────────────────
async function buildStudentBooklet({ unitCode, unitTitle, questions, obsItems, projectSteps, occasionCount }) {
    occasionCount = occasionCount || 4;
    const children = [];

    // ── COVER PAGE ──────────────────────────────────────────────────────────
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
                    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "STUDENT ASSESSMENT BOOKLET", bold: true, size: 36, color: WHITE, font: "Arial" })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: unitCode, bold: true, size: 28, color: GOLD, font: "Arial" })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: unitTitle, size: 24, color: "C8D6E8", font: "Arial" })] }),
                ]
            })]
        })]
    }));

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
            infoRow("Delivery Mode", "Workplace / Classroom / Online", true),
        ]
    }));

    children.push(new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: "About this booklet", bold: true, size: 24, font: "Arial", color: NAVY })] }));
    children.push(bodyPara(`This booklet contains all assessment tasks for ${unitCode} ${unitTitle}. Read all instructions carefully before you begin. Ask your assessor if you have any questions.`, { after: 160 }));

    children.push(new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [PAGE_WIDTH],
        rows: [
            navyHeaderRow("Student Declaration"),
            new TableRow({
                children: [new TableCell({
                    borders: navyBorders,
                    width: { size: PAGE_WIDTH, type: WidthType.DXA },
                    margins: { top: 120, bottom: 120, left: 140, right: 140 },
                    children: [
                        bodyPara("I declare that this work is my own. I have not copied anyone else's work and I understand what plagiarism means.", { after: 120 }),
                        new Table({
                            width: { size: PAGE_WIDTH - 280, type: WidthType.DXA },
                            columnWidths: [Math.floor((PAGE_WIDTH - 280) * 0.5), Math.floor((PAGE_WIDTH - 280) * 0.5)],
                            rows: [new TableRow({ children: [
                                new TableCell({ borders, width: { size: Math.floor((PAGE_WIDTH - 280) * 0.5), type: WidthType.DXA }, margins: cellMargins, children: [bodyPara("Student Signature: ___________________", {})] }),
                                new TableCell({ borders, width: { size: Math.floor((PAGE_WIDTH - 280) * 0.5), type: WidthType.DXA }, margins: cellMargins, children: [bodyPara("Date: ___________________", {})] })
                            ]})]
                        })
                    ]
                })]
            })
        ]
    }));

    // ── PART A ──────────────────────────────────────────────────────────────
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(partHeader("PART A: KNOWLEDGE QUESTIONS"));
    children.push(new Paragraph({ spacing: { before: 160, after: 80 } }));

    children.push(new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [Math.floor(PAGE_WIDTH * 0.35), Math.floor(PAGE_WIDTH * 0.65)],
        rows: [
            infoRow("Assessment type", "Written questions", false),
            infoRow("Open or closed book", "Open book — you may use notes and reference materials", true),
            infoRow("Instructions", "Answer each question in your own words. Write in full sentences. Your assessor will tell you if you can answer verbally instead of in writing.", false),
        ]
    }));

    children.push(new Paragraph({ spacing: { before: 160 } }));

    questions.forEach((q, i) => {
        children.push(questionTable(i + 1, q));
        children.push(new Paragraph({ spacing: { before: 160 } }));
    });

    children.push(resultTable("Part A"));

    // ── PART B ──────────────────────────────────────────────────────────────
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(partHeader("PART B: PRACTICAL OBSERVATION"));
    children.push(new Paragraph({ spacing: { before: 160, after: 80 } }));

    children.push(new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [Math.floor(PAGE_WIDTH * 0.35), Math.floor(PAGE_WIDTH * 0.65)],
        rows: [
            infoRow("Unit", `${unitCode} ${unitTitle}`, false),
            infoRow("Student Name", "", true),
            infoRow("Assessor Name", "", false),
            infoRow("Workplace / Location", "", true),
            infoRow("Date(s) of Observation", "", false),
            infoRow("Assessment Method", "Direct observation in workplace or simulation", true),
        ]
    }));

    children.push(new Paragraph({ spacing: { before: 160, after: 80 }, children: [new TextRun({ text: "Instructions for Assessor", bold: true, size: 22, font: "Arial", color: NAVY })] }));
    children.push(bodyPara(`Observe the learner across at least ${occasionCount} separate occasions with different individuals or groups. Tick S (Satisfactory) or NYS (Not Yet Satisfactory) for each item. Record your observations in the Comments column.`, { after: 160 }));

    children.push(buildObsTable(obsItems));
    children.push(new Paragraph({ spacing: { before: 160 } }));

    children.push(new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [Math.floor(PAGE_WIDTH * 0.08), Math.floor(PAGE_WIDTH * 0.2), Math.floor(PAGE_WIDTH * 0.25), Math.floor(PAGE_WIDTH * 0.47)],
        rows: [
            new TableRow({ children: [
                new TableCell({ borders, columnSpan: 4, width: { size: PAGE_WIDTH, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Occasion Record", bold: true, size: 20, color: WHITE, font: "Arial" })] })] })
            ]}),
            new TableRow({ children: [
                new TableCell({ borders, width: { size: Math.floor(PAGE_WIDTH * 0.08), type: WidthType.DXA }, shading: { fill: LIGHT_GREY, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "#", bold: true, size: 18, font: "Arial" })] })] }),
                new TableCell({ borders, width: { size: Math.floor(PAGE_WIDTH * 0.2), type: WidthType.DXA }, shading: { fill: LIGHT_GREY, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Date", bold: true, size: 18, font: "Arial" })] })] }),
                new TableCell({ borders, width: { size: Math.floor(PAGE_WIDTH * 0.25), type: WidthType.DXA }, shading: { fill: LIGHT_GREY, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Location", bold: true, size: 18, font: "Arial" })] })] }),
                new TableCell({ borders, width: { size: Math.floor(PAGE_WIDTH * 0.47), type: WidthType.DXA }, shading: { fill: LIGHT_GREY, type: ShadingType.CLEAR }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "Individual or Group Observed", bold: true, size: 18, font: "Arial" })] })] }),
            ]}),
            ...Array.from({ length: occasionCount }, (_, i) => i + 1).map(n => new TableRow({
                height: { value: 500, rule: "atLeast" },
                children: [
                    new TableCell({ borders, width: { size: Math.floor(PAGE_WIDTH * 0.08), type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(n), bold: true, size: 20, font: "Arial" })] })] }),
                    new TableCell({ borders, width: { size: Math.floor(PAGE_WIDTH * 0.2), type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "", size: 19 })] })] }),
                    new TableCell({ borders, width: { size: Math.floor(PAGE_WIDTH * 0.25), type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "", size: 19 })] })] }),
                    new TableCell({ borders, width: { size: Math.floor(PAGE_WIDTH * 0.47), type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: "", size: 19 })] })] }),
                ]
            }))
        ]
    }));

    children.push(new Paragraph({ spacing: { before: 160 } }));
    children.push(resultTable("Part B"));

    // ── PART C ──────────────────────────────────────────────────────────────
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(partHeader("PART C: WORKPLACE PROJECT"));
    children.push(new Paragraph({ spacing: { before: 160, after: 80 } }));

    children.push(new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [Math.floor(PAGE_WIDTH * 0.35), Math.floor(PAGE_WIDTH * 0.65)],
        rows: [
            infoRow("Student Name", "", false),
            infoRow("Assessor Name", "", true),
            infoRow("Date Commenced", "", false),
            infoRow("Date Submitted", "", true),
        ]
    }));

    children.push(new Paragraph({ spacing: { before: 160, after: 80 }, children: [new TextRun({ text: "Scenario", bold: true, size: 24, font: "Arial", color: NAVY })] }));
    children.push(bodyPara("You are working as a team leader or leading hand in your workplace. Your supervisor has asked you to lead a small project with your work team. The project involves planning a new work task, working with your team to carry it out, and reporting on how it went. This project will take place over several weeks at your real workplace. You will work with at least four different people or groups during this time.", { after: 200 }));

    projectSteps.forEach(step => {
        children.push(new Table({
            width: { size: PAGE_WIDTH, type: WidthType.DXA },
            columnWidths: [PAGE_WIDTH],
            rows: [
                new TableRow({ children: [new TableCell({ borders: navyBorders, width: { size: PAGE_WIDTH, type: WidthType.DXA }, shading: { fill: "F0F4FF", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: step.title, bold: true, size: 22, font: "Arial", color: NAVY })] })] })] }),
                new TableRow({ children: [new TableCell({ borders: navyBorders, width: { size: PAGE_WIDTH, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: step.desc, size: 20, font: "Arial" })] })] })] }),
            ]
        }));
        children.push(new Paragraph({ spacing: { before: 120 } }));
    });

    children.push(resultTable("Part C"));

    // ── ASSEMBLE ─────────────────────────────────────────────────────────────
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
                                    new TableCell({ borders: { bottom: thinBorder, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, width: { size: Math.floor(PAGE_WIDTH * 0.4), type: WidthType.DXA }, margins: { bottom: 80 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: unitCode, size: 16, font: "Arial", color: "6B7280", bold: true })] })] }),
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
                                    new TableCell({ borders: { top: thinBorder, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, width: { size: Math.floor(PAGE_WIDTH * 0.5), type: WidthType.DXA }, margins: { top: 80 }, children: [new Paragraph({ children: [new TextRun({ text: unitTitle, size: 16, font: "Arial", color: "6B7280" })] })] }),
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
        const result = await buildStudentBooklet({
            unitCode: body.unitCode || 'UNKNOWN',
            unitTitle: body.unitTitle || '',
            questions: body.questions || [],
            obsItems: body.obsItems || [],
            projectSteps: body.projectSteps || [],
            occasionCount: body.occasionCount || 4,
        });
        return Response.json(result);
    } catch (error) {
        console.error('generateStudentBooklet error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});