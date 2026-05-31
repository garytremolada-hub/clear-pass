/**
 * Builds the BSBLDR413 mapping document as a formatted .docx file.
 * All content is hardcoded verbatim from the UoC specification.
 * Output filename: BSBLDR413-mapping-document.docx
 */

import {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    HeadingLevel, AlignmentType, WidthType, BorderStyle, PageBreak,
    ShadingType, Footer, PageNumber, Header,
} from 'docx';
import { saveAs } from 'file-saver';

// ── Colour constants ──────────────────────────────────────────────────────────
const NAVY   = '0d2444';
const GREEN  = '14532d';
const RED    = '991b1b';
const AMBER_BG = 'fef3c7';
const AMBER_BORDER = 'f59e0b';
const WHITE  = 'FFFFFF';
const LIGHT_GREY = 'f3f4f6';

// ── Shared style helpers ──────────────────────────────────────────────────────

function docTitle(text) {
    return new Paragraph({
        children: [new TextRun({ text, bold: true, size: 28, color: NAVY, font: 'Arial' })],
        spacing: { before: 0, after: 160 },
    });
}

function sectionHeading(text) {
    return new Paragraph({
        children: [new TextRun({ text, bold: true, size: 24, color: NAVY, font: 'Arial' })],
        spacing: { before: 320, after: 160 },
        pageBreakBefore: true,
    });
}

function elementHeading(text) {
    return new Paragraph({
        children: [new TextRun({ text, bold: true, size: 22, color: NAVY, font: 'Arial' })],
        spacing: { before: 240, after: 120 },
    });
}

function bodyText(text, options = {}) {
    return new Paragraph({
        children: [new TextRun({
            text,
            size: 22,
            color: options.color || '000000',
            font: 'Arial',
            bold: options.bold || false,
            italics: options.italics || false,
        })],
        spacing: { before: options.before || 40, after: options.after || 80 },
        indent: options.indent ? { left: options.indent } : undefined,
    });
}

function coveredLine() {
    return new Paragraph({
        children: [new TextRun({ text: '✓ COVERED', size: 22, color: GREEN, bold: true, font: 'Arial' })],
        spacing: { before: 40, after: 120 },
        indent: { left: 360 },
    });
}

function allCoveredLine(label) {
    return new Paragraph({
        children: [new TextRun({ text: label || '✓ ALL SUB-ITEMS COVERED', size: 22, color: GREEN, bold: true, font: 'Arial' })],
        spacing: { before: 40, after: 120 },
        indent: { left: 360 },
    });
}

function metLine() {
    return new Paragraph({
        children: [new TextRun({ text: '✓ MET', size: 22, color: GREEN, bold: true, font: 'Arial' })],
        spacing: { before: 40, after: 120 },
        indent: { left: 360 },
    });
}

function labelValue(label, value) {
    return new Paragraph({
        children: [
            new TextRun({ text: label.padEnd(26), size: 22, font: 'Arial', bold: true }),
            new TextRun({ text: value, size: 22, font: 'Arial' }),
        ],
        spacing: { before: 40, after: 80 },
        indent: { left: 360 },
    });
}

function assessorNote(lines) {
    const children = lines.map((l, i) =>
        new TextRun({ text: (i > 0 ? '\n' : '') + l, size: 20, font: 'Arial', color: '78350f' })
    );
    return new Paragraph({
        children,
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: AMBER_BG },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: AMBER_BORDER } },
        spacing: { before: 80, after: 160 },
        indent: { left: 360 },
    });
}

function blankLine() {
    return new Paragraph({ children: [], spacing: { before: 0, after: 80 } });
}

function divider() {
    return new Paragraph({
        children: [],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'e5e7eb' } },
        spacing: { before: 80, after: 80 },
    });
}

// ── Simple table helpers ──────────────────────────────────────────────────────

function makeTable(headers, rows, colWidths) {
    const borderDef = {
        style: BorderStyle.SINGLE, size: 4, color: '9ca3af',
    };
    const allBorders = { top: borderDef, bottom: borderDef, left: borderDef, right: borderDef };

    const headerRow = new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => new TableCell({
            children: [new Paragraph({
                children: [new TextRun({ text: h, bold: true, size: 20, font: 'Arial', color: WHITE })],
                spacing: { before: 80, after: 80 },
            })],
            width: { size: colWidths[i], type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: NAVY },
            borders: allBorders,
        })),
    });

    const dataRows = rows.map((row, ri) => new TableRow({
        children: row.map((cell, ci) => {
            const isGreen = typeof cell === 'string' && cell.startsWith('✓');
            return new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({
                        text: typeof cell === 'string' ? cell : String(cell),
                        size: 20, font: 'Arial',
                        color: isGreen ? GREEN : '000000',
                        bold: isGreen,
                    })],
                    spacing: { before: 60, after: 60 },
                })],
                width: { size: colWidths[ci], type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, color: 'auto', fill: ri % 2 === 0 ? WHITE : LIGHT_GREY },
                borders: allBorders,
            });
        }),
    }));

    return new Table({
        rows: [headerRow, ...dataRows],
        width: { size: 9000, type: WidthType.DXA },
    });
}

// ── Section builders ──────────────────────────────────────────────────────────

function buildSection1(cohort, readingLevel, dateStr) {
    return [
        docTitle('BSBLDR413 — Lead effective workplace relationships'),
        docTitle('Assessment Mapping Document'),
        blankLine(),
        labelValue('Unit:', 'BSBLDR413 — Lead effective workplace relationships'),
        labelValue('AQF Level:', 'Certificate IV'),
        labelValue('Assessment instrument:', 'Three-part assessment (Part A, B, C)'),
        labelValue('Date built:', dateStr),
        labelValue('Cohort:', cohort),
        labelValue('Reading level:', readingLevel),
        blankLine(),
        divider(),
        bodyText('REVIEWER DECLARATION', { bold: true }),
        bodyText(
            'This mapping document has been reviewed against the Unit of Competency and the assessment instrument. I confirm it accurately represents coverage.',
            { italics: true }
        ),
        blankLine(),
        bodyText('Reviewed by: _______________________________'),
        bodyText('Signature:   _________________________________'),
        bodyText('Date:        _____________________________________'),
    ];
}

function buildSection2() {
    const paras = [
        sectionHeading('SECTION 2 — ELEMENT AND PC MAPPING'),
    ];

    const elements = [
        {
            title: 'ELEMENT 1: Prepare to lead workplace relationships',
            pcs: [
                {
                    ref: 'PC 1.1 — Identify work team objectives according to organisational strategy',
                    knowledge: 'Part A, Q1 — cultural diversity and communication (supporting context)',
                    observation: 'Part B, Item 1 — identifies work team goals linked to strategy',
                    project: 'Part C, Step 1 — Team and Task Plan',
                },
                {
                    ref: 'PC 1.2 — Collect and analyse information for the achievement of work task',
                    observation: 'Part B, Item 2 — collects and checks information',
                    project: 'Part C, Step 2 — Information Summary',
                },
                {
                    ref: 'PC 1.3 — Share ideas and information with relevant internal and external stakeholders according to work task',
                    observation: 'Part B, Item 3 — shares information with stakeholders',
                    project: 'Part C, Step 4 — Leadership Interaction Logs ×4',
                },
                {
                    ref: 'PC 1.4 — Develop strategy for completion of work task in collaboration with work team',
                    observation: 'Part B, Item 4 — plans with team',
                    project: 'Part C, Step 3 — Task Strategy Plan',
                },
            ],
        },
        {
            title: 'ELEMENT 2: Lead workplace relationships',
            pcs: [
                {
                    ref: 'PC 2.1 — Identify and implement methods to facilitate collaboration to complete work task',
                    observation: 'Part B, Item 5 — facilitates collaboration',
                    project: 'Part C, Step 4 — Leadership Interaction Logs ×4',
                },
                {
                    ref: 'PC 2.2 — Support colleagues experiencing difficulties fulfilling work requirements',
                    observation: 'Part B, Item 6 — supports colleagues with difficulties',
                    project: 'Part C, Step 5 — Problem/Conflict/Performance Response',
                },
                {
                    ref: 'PC 2.3 — Manage conflict constructively within the organisation\'s processes and parameters of own role',
                    observation: 'Part B, Item 7 — handles conflict constructively; Item 8 — applies problem/performance techniques',
                    project: 'Part C, Step 5 — Problem/Conflict/Performance Response',
                },
                {
                    ref: 'PC 2.4 — Communicate work progress to relevant internal and external stakeholders',
                    observation: 'Part B, Item 9 — communicates work progress',
                    project: 'Part C, Step 4 — Leadership Interaction Logs ×4',
                },
            ],
        },
        {
            title: 'ELEMENT 3: Review leadership',
            pcs: [
                {
                    ref: 'PC 3.1 — Seek feedback on relationship management for work task from relevant stakeholders',
                    observation: 'Part B, Item 10 — seeks feedback from stakeholders',
                    project: 'Part C, Step 6 — Feedback and Self-Reflection',
                },
                {
                    ref: 'PC 3.2 — Analyse feedback on relationship management',
                    observation: 'Part B, Item 11 — reviews feedback',
                    project: 'Part C, Step 6 — Feedback and Self-Reflection',
                },
                {
                    ref: 'PC 3.3 — Evaluate personal performance in leading workplace relationships',
                    observation: 'Part B, Item 12 — assesses own performance',
                    project: 'Part C, Step 6 — Feedback and Self-Reflection',
                },
                {
                    ref: 'PC 3.4 — Identify areas of improvement for leading workplace relationships future work tasks',
                    project: 'Part C, Step 6 — Feedback and Self-Reflection',
                },
            ],
        },
    ];

    for (const el of elements) {
        paras.push(elementHeading(el.title));
        for (const pc of el.pcs) {
            paras.push(bodyText(pc.ref, { bold: true }));
            if (pc.knowledge) paras.push(labelValue('Knowledge assessed by:', pc.knowledge));
            if (pc.observation) paras.push(labelValue('Performance observed by:', pc.observation));
            if (pc.project) paras.push(labelValue('Applied in project:', pc.project));
            paras.push(coveredLine());
            paras.push(blankLine());
        }
    }

    return paras;
}

function buildSection3() {
    const items = [
        {
            ref: 'PE1 — lead effective workplace relationships on at least four occasions with different individuals or groups',
            coveredBy: 'Part B, Items 1–12 (minimum two observation dates); Part C, Step 4 — Leadership Interaction Logs ×4',
            volume: 'At least four occasions with different individuals or groups',
            howMet: 'Part B must be completed on a minimum of two separate observation dates involving different individuals or groups. Part C Step 4 provides four separate Leadership Interaction Logs.',
            note: true,
        },
        {
            ref: 'PE2 — access and analyse information required to achieve planned outcomes',
            coveredBy: 'Part C, Step 1 — Team and Task Plan; Part C, Step 2 — Information Summary',
        },
        {
            ref: 'PE3 — collaborate with work team to develop and implement a work task strategy',
            coveredBy: 'Part C, Step 3 — Task Strategy Plan',
        },
        {
            ref: 'PE4 — apply techniques for resolving problems and conflicts, and dealing with poor performance according to organisational and legislative requirements',
            coveredBy: 'Part B, Item 8 — applies problem/performance techniques; Part C, Step 5 — Problem/Conflict/Performance Response',
        },
        {
            ref: 'PE5 — monitor and communicate work progress to relevant internal and external stakeholders',
            coveredBy: 'Part C, Step 4 — Leadership Interaction Logs ×4',
        },
        {
            ref: 'PE6 — seek and review feedback to improve workplace leadership',
            coveredBy: 'Part C, Step 6 — Feedback and Self-Reflection',
        },
    ];

    const paras = [sectionHeading('SECTION 3 — PERFORMANCE EVIDENCE')];

    for (const item of items) {
        paras.push(bodyText(item.ref, { bold: true }));
        paras.push(labelValue('Covered by:', item.coveredBy));
        if (item.volume) {
            paras.push(labelValue('Volume requirement:', item.volume));
            paras.push(labelValue('How volume is met:', item.howMet));
        }
        paras.push(coveredLine());
        if (item.note) {
            paras.push(assessorNote([
                '⚠ ASSESSOR NOTE: The four occasions requirement must be documented separately.',
                'Part B must be completed on a minimum of two separate observation dates involving',
                'different individuals or groups. Part C Step 4 provides the remaining occasions',
                'through the Leadership Interaction Logs. Assessors must record each occasion,',
                'the date, and the individuals or groups involved.',
            ]));
        }
        paras.push(blankLine());
    }

    return paras;
}

function buildSection4() {
    const paras = [sectionHeading('SECTION 4 — KNOWLEDGE EVIDENCE')];

    const keItems = [
        { ref: 'KE1 — considerations for communicating information including audience cultural and social diversity', coverage: 'Part A, Q1' },
        { ref: 'KE2 — consultation processes including internal and external sources of consultees', coverage: 'Part A, Q2' },
        { ref: 'KE3 — impacts of relationships, cultural and social environment, in supporting or hindering the achievement of planned outcomes', coverage: 'Part A, Q3' },
        { ref: 'KE5 — impact of legislation and organisational policies on workplace relationships', coverage: 'Part A, Q6' },
        { ref: 'KE6 — techniques for communicating information and ideas to a range of stakeholders', coverage: 'Part A, Q7' },
        { ref: 'KE7 — common methods to resolve workplace conflict', coverage: 'Part A, Q8' },
        { ref: 'KE8 — common methods to manage poor work performance', coverage: 'Part A, Q9' },
        { ref: 'KE9 — common methods to monitor, analyse and improve work relationships', coverage: 'Part A, Q10; Part A, Q11' },
    ];

    // KE1–KE3, then KE4 specially, then KE5–KE9
    const before4 = keItems.slice(0, 3);
    const after4 = keItems.slice(3);

    for (const item of before4) {
        paras.push(bodyText(item.ref, { bold: true }));
        paras.push(labelValue('Covered by:', item.coverage));
        paras.push(coveredLine());
        paras.push(blankLine());
    }

    // KE4 with sub-items
    paras.push(bodyText('KE4 — techniques for developing positive work relationships and building trust and confidence in a team, including:', { bold: true }));
    const ke4subs = [
        { label: 'KE4a — interpersonal styles:', coverage: 'Part A, Q4' },
        { label: 'KE4b — communications:', coverage: 'Part A, Q4; Part A, Q7' },
        { label: 'KE4c — consultation:', coverage: 'Part A, Q4; Part A, Q2' },
        { label: 'KE4d — cultural and social sensitivity:', coverage: 'Part A, Q4; Part A, Q5' },
        { label: 'KE4e — networking:', coverage: 'Part A, Q4' },
    ];
    for (const sub of ke4subs) {
        paras.push(new Paragraph({
            children: [
                new TextRun({ text: sub.label.padEnd(46), size: 22, font: 'Arial', bold: true }),
                new TextRun({ text: sub.coverage, size: 22, font: 'Arial' }),
            ],
            spacing: { before: 40, after: 60 },
            indent: { left: 360 },
        }));
    }
    paras.push(allCoveredLine('Overall KE4 status:  ✓ ALL SUB-ITEMS COVERED'));
    paras.push(blankLine());

    for (const item of after4) {
        paras.push(bodyText(item.ref, { bold: true }));
        paras.push(labelValue('Covered by:', item.coverage));
        paras.push(coveredLine());
        paras.push(blankLine());
    }

    return paras;
}

function buildSection5() {
    const skills = [
        {
            name: 'Reading',
            desc: 'Collects, analyses and evaluates textual information from a range of resources to inform improvement strategies',
            coverage: 'Part A (reading and interpreting questions); Part C (gathering and analysing information)',
        },
        {
            name: 'Oral Communication',
            desc: 'Selects or adjusts communication style to maintain effectiveness of interaction and build and maintain engagement consistent with organisational requirements',
            coverage: 'Part B (all observed interactions); Part C, Step 4 (Leadership Interaction Logs)',
        },
        {
            name: 'Initiative and enterprise',
            desc: 'Identifies and follows legislative and organisational requirements relevant to own role',
            coverage: 'Part C, Step 5 (legislative compliance in conflict resolution)',
        },
        {
            name: 'Teamwork',
            desc: 'Selects and uses appropriate conventions and protocols when communicating with diverse stakeholders; Adapts personal communication style to build trust and positive working relationships; Plays a lead role in situations requiring effective collaboration, demonstrating conflict resolution skills',
            coverage: 'Part B (all items); Part C, Steps 3 and 4',
        },
        {
            name: 'Planning and organising',
            desc: 'Plans and implements activities and processes to manage and review work performance; Systematically gathers and analyses all relevant information to formulate and evaluate possible solutions',
            coverage: 'Part C, Steps 1, 2, 3',
        },
    ];

    const paras = [sectionHeading('SECTION 5 — FOUNDATION SKILLS')];
    paras.push(bodyText('Foundation Skills Coverage', { bold: true }));
    paras.push(blankLine());

    for (const s of skills) {
        paras.push(bodyText(`${s.name} — ${s.desc}`, { bold: false }));
        paras.push(labelValue('Covered by:', s.coverage));
        paras.push(coveredLine());
        paras.push(blankLine());
    }

    return paras;
}

function buildSection6() {
    const conditions = [
        {
            ref: 'AC1 — Skills must be demonstrated in a workplace or simulated environment where the conditions are typical of those in a working environment in this industry',
            metBy: 'Part B and Part C are delivered in a workplace or simulated environment. Part B assessor instructions specify the environment requirement.',
        },
        {
            ref: 'AC2 — Access to legislation, regulations, standards and codes relevant to performance evidence',
            metBy: 'Part C, Step 5 requires the learner to identify and apply relevant legislation. Part A, Q6 addresses legislative knowledge.',
        },
        {
            ref: 'AC3 — Access to workplace documentation and resources',
            metBy: 'Part C, Steps 1–4 require access to and use of workplace documents.',
        },
        {
            ref: 'AC4 — Interaction with others',
            metBy: 'Part B requires interaction with at least four different individuals or groups. Part C requires team collaboration.',
        },
        {
            ref: 'AC5 — Assessors must satisfy the requirements for assessors in applicable VET legislation, frameworks and/or standards',
            metBy: 'Assessors delivering this instrument must satisfy the requirements for assessors in applicable VET legislation, frameworks and/or standards.',
        },
    ];

    const paras = [sectionHeading('SECTION 6 — ASSESSMENT CONDITIONS')];
    paras.push(bodyText('Assessment Conditions', { bold: true }));
    paras.push(blankLine());

    for (const c of conditions) {
        paras.push(bodyText(c.ref, { bold: true }));
        paras.push(labelValue('Met by:', c.metBy));
        paras.push(metLine());
        paras.push(blankLine());
    }

    return paras;
}

function buildSection7() {
    const paras = [sectionHeading('SECTION 7 — COVERAGE SUMMARY TABLE')];

    const tableRows = [
        ['Performance Evidence', '6', '6', '0', '0'],
        ['Knowledge Evidence', '9', '9', '0', '0'],
        ['KE4 Sub-items', '5', '5', '0', '0'],
        ['Performance Criteria', '12', '12', '0', '0'],
        ['Foundation Skills', '5', '5', '0', '0'],
        ['Assessment Conditions', '5', '5', '0', '0'],
        ['TOTAL', '42', '42', '0', '0'],
    ];

    paras.push(makeTable(
        ['Requirement Category', 'Total Items', 'Fully Covered', 'Partially Covered', 'Not Covered'],
        tableRows,
        [3200, 1300, 1600, 1800, 1100],
    ));

    paras.push(blankLine());
    paras.push(bodyText(
        'This assessment instrument provides complete coverage of all requirements of BSBLDR413 — Lead effective workplace relationships, subject to the assessor note on PE1 (four occasions requirement).',
        { italics: true }
    ));
    paras.push(blankLine());
    paras.push(bodyText(
        'This mapping document was generated by Clearpass as a support tool for assessment design and validation. Final compliance determination rests with the assessor, the RTO, and where applicable ASQA or TEQSA. This document does not constitute a compliance ruling.',
        { italics: true, color: '6b7280' }
    ));

    return paras;
}

function buildSection8() {
    const acronyms = [
        {
            term: 'AC — Assessment Conditions',
            def: 'The environment, resources, and requirements that must be in place when assessment takes place.',
        },
        {
            term: 'AQF — Australian Qualifications Framework',
            def: 'The national policy that sets the standards for all qualifications in Australia, from Certificate I through to Doctoral Degree.',
        },
        {
            term: 'ASQA — Australian Skills Quality Authority',
            def: 'The national regulator for Registered Training Organisations and vocational qualifications in Australia.',
        },
        {
            term: 'KE — Knowledge Evidence',
            def: 'What a learner must know and be able to explain to be assessed as competent in this unit.',
        },
        {
            term: 'NYS — Not Yet Satisfactory',
            def: 'The learner has not yet met the requirements for this task or question and needs to resubmit.',
        },
        {
            term: 'PC — Performance Criteria',
            def: 'The specific standards a learner must meet to demonstrate competency within each Element of the unit.',
        },
        {
            term: 'PE — Performance Evidence',
            def: 'What a learner must be able to DO and demonstrate in practice to be assessed as competent in this unit.',
        },
        {
            term: 'RTO — Registered Training Organisation',
            def: 'A training provider registered with ASQA or a state regulator to deliver and assess vocational qualifications.',
        },
        {
            term: 'S — Satisfactory',
            def: 'The learner has met the requirements for this task or question.',
        },
        {
            term: 'TEQSA — Tertiary Education Quality and Standards Agency',
            def: 'The national regulator for universities and higher education providers in Australia.',
        },
        {
            term: 'UoC — Unit of Competency',
            def: 'A single unit from an Australian Training Package that describes exactly what a learner must know and be able to do to be considered competent in that area of work.',
        },
        {
            term: 'VET — Vocational Education and Training',
            def: 'The Australian system of practical qualifications, from Certificate I through to Advanced Diploma, delivered by RTOs and TAFEs.',
        },
    ];

    const paras = [sectionHeading('SECTION 8 — GLOSSARY OF TERMS USED IN THIS DOCUMENT')];
    paras.push(bodyText(
        'The following terms and short forms are used in this document. If you are new to VET assessment, this list will help you understand what each term means.',
        { italics: true }
    ));
    paras.push(blankLine());

    for (const a of acronyms) {
        paras.push(bodyText(a.term, { bold: true }));
        paras.push(bodyText(a.def, { indent: 360 }));
        paras.push(blankLine());
    }

    return paras;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function buildBSBLDR413Mapping(cohort = 'Working adults', readingLevel = 'Cert III/IV') {
    const dateStr = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' });

    const allChildren = [
        ...buildSection1(cohort, readingLevel, dateStr),
        ...buildSection2(),
        ...buildSection3(),
        ...buildSection4(),
        ...buildSection5(),
        ...buildSection6(),
        ...buildSection7(),
        ...buildSection8(),
    ];

    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, // 2.54cm in twips
                },
            },
            footers: {
                default: new Footer({
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({ text: 'BSBLDR413 Mapping Document — Clearpass | Page ', size: 18, font: 'Arial', color: '9ca3af' }),
                                new TextRun({ children: [PageNumber.CURRENT], size: 18, font: 'Arial', color: '9ca3af' }),
                            ],
                            alignment: AlignmentType.CENTER,
                        }),
                    ],
                }),
            },
            children: allChildren,
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'BSBLDR413-mapping-document.docx');
}