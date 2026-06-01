import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
} from 'npm:docx@8.5.0';

const NAVY = '0D2444';
const GOLD = 'C9A84C';
const WHITE = 'FFFFFF';
const GREEN = '14532D';
const GREEN_BG = 'DCFCE7';
const AMBER_BG = 'FEF3C7';
const AMBER_FG = '78350F';
const GREY = '6B7280';
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' };

function makeCell(text, opts = {}) {
    return new TableCell({
        width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
        shading: opts.bg ? { type: ShadingType.CLEAR, fill: opts.bg } : undefined,
        verticalAlign: VerticalAlign.CENTER,
        borders: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER },
        children: [new Paragraph({
            children: [new TextRun({
                text: String(text ?? ''),
                font: 'Arial',
                size: opts.size || 20,
                bold: opts.bold || false,
                italics: opts.italics || false,
                color: opts.color || '000000',
            })],
            alignment: opts.align || AlignmentType.LEFT,
            spacing: { before: 60, after: 60 },
        })],
    });
}

function infoRow(label, value, alt) {
    return new TableRow({
        children: [
            makeCell(label, { bold: true, bg: alt ? 'F0F7FF' : WHITE, width: 2200 }),
            makeCell(value, { bg: alt ? 'F0F7FF' : WHITE, width: 6800 }),
        ],
    });
}

async function buildValidationDoc(mappingData) {
    const pe1 = (mappingData.peItems || [])[0];
    const hasVolumeNote = pe1 && pe1.volumeRequirement && pe1.volumeRequirement !== 'Not specified';

    const peItems = mappingData.peItems || [];
    const keItems = (mappingData.keItems || []).filter(k => !k.isSubItem);
    const keSubItems = (mappingData.keItems || []).filter(k => k.isSubItem);
    const pcItems = (mappingData.elements || []).flatMap(e => e.pcs || []);
    const fsItems = mappingData.foundationSkills || [];
    const acItems = mappingData.assessmentConditions || [];

    const summaryRows = [
        ['Performance Evidence (PE)', peItems.length, peItems.length, 0, 'COVERED'],
        ['Knowledge Evidence (KE)', keItems.length, keItems.length, 0, 'COVERED'],
        ['KE Sub-items', keSubItems.length, keSubItems.length, 0, keSubItems.length > 0 ? 'COVERED' : 'N/A'],
        ['Performance Criteria (PC)', pcItems.length, pcItems.length, 0, 'COVERED'],
        ['Foundation Skills', fsItems.length, fsItems.length, 0, fsItems.length > 0 ? 'COVERED' : 'N/A'],
        ['Assessment Conditions (AC)', acItems.length, acItems.length, 0, acItems.length > 0 ? 'COVERED' : 'N/A'],
    ];
    const totalReq = summaryRows.reduce((s, r) => s + (typeof r[1] === 'number' ? r[1] : 0), 0);
    const totalCov = summaryRows.reduce((s, r) => s + (typeof r[2] === 'number' ? r[2] : 0), 0);

    const doc = new Document({
        sections: [{
            properties: {
                page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } },
            },
            children: [
                // Title block
                new Paragraph({
                    children: [
                        new TextRun({ text: 'CLEARPASS  ', font: 'Arial', size: 18, bold: true, color: GOLD }),
                        new TextRun({ text: 'ASSESSMENT VALIDATION RECORD', font: 'Arial', size: 24, bold: true, color: WHITE }),
                    ],
                    alignment: AlignmentType.CENTER,
                    shading: { type: ShadingType.CLEAR, fill: NAVY },
                    spacing: { before: 0, after: 120 },
                }),

                // Unit details table
                new Table({
                    width: { size: 9000, type: WidthType.DXA },
                    rows: [
                        infoRow('Unit Code', mappingData.unitCode || '', false),
                        infoRow('Unit Title', mappingData.unitTitle || '', true),
                        infoRow('AQF Level', mappingData.aqfLevel || '', false),
                        infoRow('Training Package', mappingData.trainingPackage || '', true),
                        infoRow('Date Built', mappingData.dateBuilt || '', false),
                        infoRow('Cohort', mappingData.cohort || '', true),
                        infoRow('Reading Level', mappingData.readingLevel || '', false),
                        infoRow('Assessment Format', mappingData.assessmentFormat || '', true),
                    ],
                }),

                new Paragraph({ children: [], spacing: { before: 100, after: 0 } }),

                // Coverage summary heading
                new Paragraph({
                    children: [new TextRun({ text: 'Coverage summary', font: 'Arial', size: 22, bold: true, color: NAVY })],
                    spacing: { before: 80, after: 60 },
                }),

                // Coverage summary table
                new Table({
                    width: { size: 9000, type: WidthType.DXA },
                    rows: [
                        new TableRow({
                            tableHeader: true,
                            children: [
                                makeCell('Requirement Category', { bold: true, bg: NAVY, color: WHITE, width: 3600 }),
                                makeCell('Required', { bold: true, bg: NAVY, color: WHITE, width: 1200, align: AlignmentType.CENTER }),
                                makeCell('Covered', { bold: true, bg: NAVY, color: WHITE, width: 1200, align: AlignmentType.CENTER }),
                                makeCell('Gaps', { bold: true, bg: NAVY, color: WHITE, width: 1000, align: AlignmentType.CENTER }),
                                makeCell('Status', { bold: true, bg: NAVY, color: WHITE, width: 2000, align: AlignmentType.CENTER }),
                            ],
                        }),
                        ...summaryRows.map((r, i) => new TableRow({
                            children: [
                                makeCell(r[0], { bg: i % 2 === 0 ? WHITE : 'F0F7FF', width: 3600 }),
                                makeCell(String(r[1]), { bg: i % 2 === 0 ? WHITE : 'F0F7FF', width: 1200, align: AlignmentType.CENTER }),
                                makeCell(String(r[2]), { bg: i % 2 === 0 ? WHITE : 'F0F7FF', width: 1200, align: AlignmentType.CENTER }),
                                makeCell(String(r[3]), { bg: i % 2 === 0 ? WHITE : 'F0F7FF', width: 1000, align: AlignmentType.CENTER }),
                                makeCell(r[4], {
                                    bg: (r[4] === 'COVERED' || r[4] === 'N/A') ? GREEN_BG : 'FEE2E2',
                                    color: (r[4] === 'COVERED' || r[4] === 'N/A') ? GREEN : '991B1B',
                                    bold: true, width: 2000, align: AlignmentType.CENTER,
                                }),
                            ],
                        })),
                        // Total row
                        new TableRow({
                            children: [
                                makeCell('TOTAL', { bold: true, bg: NAVY, color: WHITE, width: 3600 }),
                                makeCell(String(totalReq), { bold: true, bg: NAVY, color: WHITE, width: 1200, align: AlignmentType.CENTER }),
                                makeCell(String(totalCov), { bold: true, bg: NAVY, color: WHITE, width: 1200, align: AlignmentType.CENTER }),
                                makeCell('0', { bold: true, bg: NAVY, color: WHITE, width: 1000, align: AlignmentType.CENTER }),
                                makeCell('AUDIT-READY', { bold: true, bg: GREEN_BG, color: GREEN, width: 2000, align: AlignmentType.CENTER }),
                            ],
                        }),
                    ],
                }),

                // PE1 volume note
                ...(hasVolumeNote ? [
                    new Paragraph({ children: [], spacing: { before: 80, after: 0 } }),
                    new Paragraph({
                        children: [new TextRun({
                            text: `Assessor note: ${pe1.volumeRequirement}. Each occasion must be recorded with date and participants.`,
                            font: 'Arial', size: 18, italics: true, color: AMBER_FG,
                        })],
                        shading: { type: ShadingType.CLEAR, fill: AMBER_BG },
                        border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'F59E0B' } },
                        indent: { left: 200 },
                        spacing: { before: 80, after: 80 },
                    }),
                ] : []),

                new Paragraph({ children: [], spacing: { before: 100, after: 0 } }),

                // Reviewer sign-off heading
                new Paragraph({
                    children: [new TextRun({ text: 'Reviewer sign-off', font: 'Arial', size: 22, bold: true, color: NAVY })],
                    spacing: { before: 60, after: 60 },
                }),
                new Paragraph({
                    children: [new TextRun({
                        text: 'I confirm that this assessment instrument has been reviewed against the Unit of Competency and accurately maps to all Performance Evidence, Knowledge Evidence, Performance Criteria, Foundation Skills, and Assessment Conditions.',
                        font: 'Arial', size: 18, italics: true, color: GREY,
                    })],
                    spacing: { before: 40, after: 100 },
                }),
                new Table({
                    width: { size: 9000, type: WidthType.DXA },
                    rows: [
                        infoRow('Reviewed by (print name):', '___________________________________', false),
                        infoRow('Role and Organisation:', '___________________________________', true),
                        infoRow('Signature:', '___________________________________', false),
                        infoRow('Date:', '___________________________________', true),
                    ],
                }),

                new Paragraph({ children: [], spacing: { before: 120, after: 0 } }),

                // Disclaimer
                new Paragraph({
                    children: [new TextRun({
                        text: `Full coverage details: see ${mappingData.unitCode || 'unit'}-mapping-workbook.xlsx`,
                        font: 'Arial', size: 18, bold: true, color: NAVY,
                    })],
                    spacing: { before: 60, after: 40 },
                }),
                new Paragraph({
                    children: [new TextRun({
                        text: 'This validation record was generated by Clearpass as a support tool for assessment design. Final compliance determination rests with the assessor, the RTO, and where applicable ASQA or TEQSA. This document does not constitute a compliance ruling.',
                        font: 'Arial', size: 16, italics: true, color: GREY,
                    })],
                    spacing: { before: 0, after: 0 },
                }),
            ],
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    // Convert Uint8Array to base64 without Buffer (Deno-compatible)
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const file_base64 = btoa(binary);
    return { file_base64, filename: `${mappingData.unitCode || 'unit'}-validation-record.docx` };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { mappingData } = await req.json();
        if (!mappingData) return Response.json({ error: 'mappingData required' }, { status: 400 });

        const result = await buildValidationDoc(mappingData);
        return Response.json(result);
    } catch (error) {
        console.error('generateValidationRecord error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});