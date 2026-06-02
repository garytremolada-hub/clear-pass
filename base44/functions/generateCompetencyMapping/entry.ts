import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType,
    VerticalAlign, TabStopType, PageNumber, PageBreak,
} from 'npm:docx@8.5.0';

// ── Style constants ───────────────────────────────────────────────────────────
const NAVY = '0D2444';
const ELEM_BG = 'E0EFFF';
const ALT_BG = 'F9FAFB';
const BORDER_COLOR = 'D1D5DB';
const THIN = { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR };
const ALL_BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN };
const CELL_MARGINS = { top: 85, bottom: 85, left: 140, right: 140 };
const TABLE_WIDTH = 9026; // DXA for A4 with 2.54cm margins

// ── Cell helpers ──────────────────────────────────────────────────────────────
function headerCell(text, width) {
    return new TableCell({
        width: { size: width, type: WidthType.DXA },
        shading: { fill: NAVY, type: ShadingType.CLEAR },
        margins: CELL_MARGINS,
        borders: ALL_BORDERS,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
            children: [new TextRun({ text: String(text || ''), bold: true, color: 'FFFFFF', size: 18, font: 'Arial' })],
        })],
    });
}

function dataCell(text, width, alt, opts = {}) {
    return new TableCell({
        width: { size: width, type: WidthType.DXA },
        shading: alt ? { fill: ALT_BG, type: ShadingType.CLEAR } : undefined,
        margins: CELL_MARGINS,
        borders: ALL_BORDERS,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
            children: [new TextRun({
                text: String(text || ''),
                size: 18,
                font: 'Arial',
                bold: opts.bold || false,
                color: opts.color || '000000',
            })],
        })],
    });
}

function boldLabelCell(text, width) {
    return new TableCell({
        width: { size: width, type: WidthType.DXA },
        margins: CELL_MARGINS,
        borders: ALL_BORDERS,
        children: [new Paragraph({
            children: [new TextRun({ text: String(text || ''), bold: true, size: 18, font: 'Arial' })],
        })],
    });
}

function elementRow(text, colCount, widths) {
    return new TableRow({
        children: [new TableCell({
            columnSpan: colCount,
            width: { size: TABLE_WIDTH, type: WidthType.DXA },
            shading: { fill: ELEM_BG, type: ShadingType.CLEAR },
            margins: CELL_MARGINS,
            borders: ALL_BORDERS,
            children: [new Paragraph({
                children: [new TextRun({ text: String(text || ''), bold: true, size: 18, font: 'Arial', color: NAVY })],
            })],
        })],
    });
}

function sectionHeading(text) {
    return new Paragraph({
        children: [new TextRun({ text, bold: true, size: 20, font: 'Arial', color: NAVY })],
        spacing: { before: 200, after: 80 },
    });
}

function bodyText(text) {
    return new Paragraph({
        children: [new TextRun({ text, size: 18, font: 'Arial' })],
        spacing: { before: 0, after: 80 },
    });
}

// ── Lookup helpers (new flat format: q.ke, q.pc, q.pe — not q.covers.*) ──────

// BUG 4 FIX: KE lookup uses new flat format, supports taskType
function qNumsForKE(keRef, taskType, mappingIndex) {
    // If called with old 2-arg signature (keRef, mappingIndex), handle gracefully
    if (taskType && typeof taskType === 'object') {
        mappingIndex = taskType;
        taskType = 'knowledge';
    }
    if (taskType === 'knowledge' || taskType === 'verbal') {
        const list = taskType === 'verbal' ? (mappingIndex.verbalQuestions || []) : (mappingIndex.knowledgeQuestions || []);
        const nums = [];
        list.forEach(q => {
            const keArr = q.ke || q.covers?.ke || [];
            if (keArr.includes(keRef)) nums.push(String(q.num));
        });
        return nums.join(', ');
    }
    return '';
}

// BUG 1 FIX: PE lookup uses new flat format
function qNumsForPE(peRef, taskType, mappingIndex) {
    if (taskType === 'knowledge') {
        const nums = [];
        (mappingIndex.knowledgeQuestions || []).forEach(q => {
            const peArr = q.pe || q.covers?.pe || [];
            if (peArr.includes(peRef)) nums.push(String(q.num));
        });
        return nums.join(', ');
    }
    if (taskType === 'observation') {
        const nums = [];
        (mappingIndex.observationItems || []).forEach(item => {
            const peArr = item.pe || item.covers?.pe || [];
            if (peArr.includes(peRef)) nums.push(String(item.num));
        });
        return nums.join(', ');
    }
    if (taskType === 'project') {
        const nums = [];
        (mappingIndex.projectSteps || []).forEach(step => {
            const peArr = step.pe || step.covers?.pe || [];
            if (peArr.includes(peRef)) nums.push(String(step.num));
        });
        return nums.join(', ');
    }
    if (taskType === 'verbal') {
        const nums = [];
        (mappingIndex.verbalQuestions || []).forEach(q => {
            const peArr = q.pe || q.covers?.pe || [];
            if (peArr.includes(peRef)) nums.push(String(q.num));
        });
        return nums.join(', ');
    }
    return '';
}

// BUG 1 FIX: PC lookup uses new flat format
function qNumsForPC(pcRef, taskType, mappingIndex) {
    if (taskType === 'knowledge') {
        const nums = [];
        (mappingIndex.knowledgeQuestions || []).forEach(q => {
            const pcArr = q.pc || q.covers?.pc || [];
            if (pcArr.includes(pcRef)) nums.push(String(q.num));
        });
        return nums.join(', ');
    }
    if (taskType === 'observation') {
        const nums = [];
        (mappingIndex.observationItems || []).forEach(item => {
            const pcArr = item.pc || item.covers?.pc || [];
            if (pcArr.includes(pcRef)) nums.push(String(item.num));
        });
        return nums.join(', ');
    }
    if (taskType === 'project') {
        const nums = [];
        (mappingIndex.projectSteps || []).forEach(step => {
            const pcArr = step.pc || step.covers?.pc || [];
            if (pcArr.includes(pcRef)) nums.push(String(step.num));
        });
        return nums.join(', ');
    }
    if (taskType === 'verbal') {
        const nums = [];
        (mappingIndex.verbalQuestions || []).forEach(q => {
            const pcArr = q.pc || q.covers?.pc || [];
            if (pcArr.includes(pcRef)) nums.push(String(q.num));
        });
        return nums.join(', ');
    }
    return '';
}

// FS lookup (fallback to old covers.fs format for backwards compat)
function qNumsForFS(fsRef, taskType, mappingIndex) {
    if (taskType === 'knowledge') {
        const nums = [];
        (mappingIndex.knowledgeQuestions || []).forEach(q => {
            const fsArr = q.fs || q.covers?.fs || [];
            if (fsArr.includes(fsRef)) nums.push(String(q.num));
        });
        return nums.join(', ');
    }
    if (taskType === 'observation') {
        const nums = [];
        (mappingIndex.observationItems || []).forEach(item => {
            const fsArr = item.fs || item.covers?.fs || [];
            if (fsArr.includes(fsRef)) nums.push(String(item.num));
        });
        return nums.join(', ');
    }
    if (taskType === 'project') {
        const nums = [];
        (mappingIndex.projectSteps || []).forEach(step => {
            const fsArr = step.fs || step.covers?.fs || [];
            if (fsArr.includes(fsRef)) nums.push(String(step.num));
        });
        return nums.join(', ');
    }
    return '';
}

// ── getCellContent: look up task item refs for a given PC ref and task slot ───
function getCellContent(pcRef, taskType, mappingIndex) {
    if (!mappingIndex) return '';
    const results = [];
    if (taskType === 'task1' && mappingIndex.knowledgeQuestions) {
        mappingIndex.knowledgeQuestions
            .filter(q => q.pc && q.pc.includes(pcRef))
            .forEach(q => results.push(String(q.num)));
    }
    if (taskType === 'task2' && mappingIndex.observationItems) {
        mappingIndex.observationItems
            .filter(item => item.pc && item.pc.includes(pcRef))
            .forEach(item => results.push(String(item.num)));
    }
    if (taskType === 'task3' && mappingIndex.projectSteps) {
        mappingIndex.projectSteps
            .filter(s => s.pc && s.pc.includes(pcRef))
            .forEach(s => results.push(String(s.num)));
    }
    if (taskType === 'task4' && mappingIndex.verbalQuestions) {
        mappingIndex.verbalQuestions
            .filter(v => v.pc && v.pc.includes(pcRef))
            .forEach(v => results.push(String(v.num)));
    }
    return results.join(', ');
}

// ── Group PCs by element number (works for any UoC) ───────────────────────────
function groupPCsByElement(allPCs) {
    const groups = {};
    allPCs.forEach(pc => {
        const elementNum = String(pc.ref || '').split('.')[0] || '1';
        if (!groups[elementNum]) groups[elementNum] = [];
        groups[elementNum].push(pc);
    });
    return groups;
}

// Determine task type from section id
function taskTypeFromId(id) {
    if (id === 'knowledge_questions') return 'knowledge';
    if (id === 'practical_observation') return 'observation';
    if (id === 'workplace_project' || id === 'case_study') return 'project';
    if (id === 'supervisor_report') return 'supervisor';
    if (id === 'work_documents') return 'portfolio';
    if (id === 'verbal_questions') return 'verbal';
    return 'other';
}

// ── Build document ────────────────────────────────────────────────────────────
async function buildCompetencyMappingDoc(md) {
    const {
        unitCode, unitTitle, releaseNumber, prerequisites, corequisites,
        targetGroup, assessmentConditions, legislativeRequirements,
        specificResources, cohort, readingLevel, dateBuilt,
        elements, peItems, keItems, foundationSkills,
        assessmentSections, mappingIndex, rtoName,
    } = md;

    const sections = assessmentSections || [];
    const numTaskCols = sections.length;
    const totalCols = numTaskCols + 2; // Element + PC text + tasks

    // Column widths for PC/FS/PE/KE tables
    const elemW = 1354;
    const pcTextW = 3250;
    const remaining = TABLE_WIDTH - elemW - pcTextW;
    const taskColW = numTaskCols > 0 ? Math.floor(remaining / numTaskCols) : remaining;

    // Two-column table widths (for unit info, AC, versions)
    const labelW = 2500;
    const valueW = TABLE_WIDTH - labelW;

    // ── Footer ────────────────────────────────────────────────────────────────
    const docFooter = new Footer({
        children: [new Paragraph({
            tabStops: [
                { type: TabStopType.CENTER, position: 4513 },
                { type: TabStopType.RIGHT, position: 9026 },
            ],
            children: [
                new TextRun({ text: `Document: Competency Mapping: ${unitCode} ${unitTitle}`, size: 16, font: 'Arial' }),
                new TextRun({ text: '\t', size: 16, font: 'Arial' }),
                new TextRun({ text: 'Version: 1.0', size: 16, font: 'Arial' }),
                new TextRun({ text: '\t', size: 16, font: 'Arial' }),
                new TextRun({ text: `RTO: ${rtoName || 'Clearpass'} | Page `, size: 16, font: 'Arial' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Arial' }),
                new TextRun({ text: ' of ', size: 16, font: 'Arial' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: 'Arial' }),
            ],
        })],
    });

    const children = [];

    // ── SECTION 1 — Title ─────────────────────────────────────────────────────
    children.push(new Paragraph({
        children: [new TextRun({ text: rtoName || 'Clearpass Assessment Tool', size: 16, font: 'Arial', color: '6B7280' })],
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 60 },
    }));
    children.push(new Paragraph({
        children: [new TextRun({ text: 'Competency Mapping', bold: true, size: 36, font: 'Arial', color: NAVY })],
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 40 },
    }));
    children.push(new Paragraph({
        children: [new TextRun({ text: 'Assessment Tool', size: 24, font: 'Arial', color: '6B7280' })],
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 200 },
    }));

    // ── SECTION 2 — Introduction paragraph ───────────────────────────────────
    children.push(sectionHeading('Introduction'));
    const introText = `The competency mapping tool aligns all assessment tools in use against the relevant unit(s) of competency to demonstrate how all assessment requirements are being met. All areas of the mapping document are to be completed as per the table below through a thorough review and analysis of the unit of competency document and assessment resources engaged.\n\nIt is an expectation that, in order to meet the principles of assessment and rules of evidence, all units of competency will maintain at a minimum, two methods of evidence collection to confirm competency for each element within a unit. At least one of these evidence types should be a form of direct evidence (it should be noted that evidence pieces may overlap elements within the unit).\n\nGuidance must be provided where appropriate on the characteristics of evidence, evidence options and amount of the evidence to be collected for specific assessment tasks mapped to the unit of competency.\n\nAssessment methods overall must address the whole unit of competency as outlined below. All items listed in the mapping documentation are considered mandatory. Assessment methods overall must ensure that consistent performance of the unit is demonstrated, in multiple instances of performance over a period of time.`;
    introText.split('\n\n').forEach(para => {
        children.push(new Paragraph({
            children: [new TextRun({ text: para, size: 18, font: 'Arial' })],
            spacing: { before: 0, after: 100 },
        }));
    });

    // ── SECTION 3 — Unit information table ───────────────────────────────────
    children.push(sectionHeading('Unit Information'));
    const resourcesList = sections.length > 0
        ? `Assessment instrument (${sections.map((s, i) => `Part ${String.fromCharCode(65 + i)}: ${s.name}`).join(', ')}), Marking Guide`
        : 'Assessment instrument, Marking Guide';

    const unitInfoRows = [
        ['Unit Code and Name', `${unitCode} ${unitTitle}`],
        ['Release Number', releaseNumber || '1'],
        ['Prerequisites', prerequisites || 'Not applicable'],
        ['Co-requisites', corequisites || 'Not applicable'],
        ['Target Group', targetGroup || cohort || ''],
        ['Assessment Conditions and Context', assessmentConditions || ''],
        ['Legislative and Licensing Requirements', legislativeRequirements || 'No licensing, legislative or certification requirements apply to this unit at the time of publication.'],
        ['Specific Resource Requirements', specificResources || resourcesList],
    ];

    children.push(new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [labelW, valueW],
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        columnSpan: 2,
                        shading: { fill: NAVY, type: ShadingType.CLEAR },
                        margins: CELL_MARGINS,
                        borders: ALL_BORDERS,
                        children: [new Paragraph({
                            children: [new TextRun({ text: 'Unit Information', bold: true, size: 20, font: 'Arial', color: 'FFFFFF' })],
                        })],
                    }),
                ],
            }),
            ...unitInfoRows.map(([label, value], i) => new TableRow({
                children: [
                    boldLabelCell(label, labelW),
                    dataCell(value, valueW, i % 2 !== 0),
                ],
            })),
        ],
    }));

    // ── SECTION 4 — PC Mapping table ─────────────────────────────────────────
    children.push(sectionHeading('Element and Performance Criteria Mapping'));
    if (elements && elements.length > 0) {
        const pcHeaderCells = [
            headerCell('Element', elemW),
            headerCell('Performance Criteria', pcTextW),
            ...sections.map((s, i) => headerCell(`Assessment Task ${i + 1}: ${s.name}`, taskColW)),
        ];
        const pcRows = [new TableRow({ children: pcHeaderCells })];

        // Flatten all PCs from elements, then group by element number from PC ref
        const allPCs = elements.flatMap(el =>
            (el.pcs || []).map(pc => ({ ...pc, elTitle: el.title }))
        );

        // BUG 2 FIX: group by first digit of pc.ref so each element gets its own header
        const groups = groupPCsByElement(allPCs);
        Object.keys(groups).sort((a, b) => Number(a) - Number(b)).forEach(elementNum => {
            const pcsInGroup = groups[elementNum];
            // Use the elTitle from the first PC in the group, or fall back to generic
            const elTitle = pcsInGroup[0]?.elTitle || `Element ${elementNum}`;
            pcRows.push(elementRow(`${elementNum}. ${elTitle}`, totalCols));

            pcsInGroup.forEach((pc, pcI) => {
                const alt = pcI % 2 !== 0;
                // BUG 1 FIX: use getCellContent with task slot keys
                // BUG 3 FIX: show pc.ref only — no row index prefix
                const task1 = getCellContent(pc.ref, 'task1', mappingIndex || {});
                const task2 = getCellContent(pc.ref, 'task2', mappingIndex || {});
                const task3 = getCellContent(pc.ref, 'task3', mappingIndex || {});
                const task4 = getCellContent(pc.ref, 'task4', mappingIndex || {});
                const taskVals = [task1, task2, task3, task4];

                pcRows.push(new TableRow({
                    children: [
                        dataCell('', elemW, alt),
                        dataCell(`${pc.ref}  ${pc.text}`, pcTextW, alt),
                        ...sections.map((s, si) => dataCell(taskVals[si] || '', taskColW, alt)),
                    ],
                }));
            });
        });

        children.push(new Table({
            width: { size: TABLE_WIDTH, type: WidthType.DXA },
            columnWidths: [elemW, pcTextW, ...sections.map(() => taskColW)],
            rows: pcRows,
        }));
    }

    // ── SECTION 5 — Foundation Skills table ──────────────────────────────────
    children.push(sectionHeading('Foundation Skills'));
    const fsItems = foundationSkills || [];
    const fsCols = 3 + numTaskCols; // Skill + PC + Description + tasks
    const fsSkillW = 1200;
    const fsPCW = 1200;
    const fsDescW = TABLE_WIDTH - fsSkillW - fsPCW - (taskColW * numTaskCols);

    const fsHeaderCells = [
        headerCell('Skill', fsSkillW),
        headerCell('Performance Criteria', fsPCW),
        headerCell('Description', fsDescW),
        ...sections.map((s, i) => headerCell(`Task ${i + 1}`, taskColW)),
    ];

    const fsRows = [new TableRow({ children: fsHeaderCells })];

    // BUG 5 FIX: prefer mappingIndex.foundationSkills (from 7th AI call), fall back to fsItems
    const miFsItems = (mappingIndex || {}).foundationSkills || [];
    const effectiveFsItems = miFsItems.length > 0 ? miFsItems : fsItems;

    if (effectiveFsItems.length === 0) {
        fsRows.push(new TableRow({
            children: [new TableCell({
                columnSpan: fsCols,
                margins: CELL_MARGINS,
                borders: ALL_BORDERS,
                children: [new Paragraph({
                    children: [new TextRun({ text: 'Foundation Skills not listed in this unit', size: 18, font: 'Arial', italics: true })],
                })],
            })],
        }));
    } else {
        effectiveFsItems.forEach((fs, i) => {
            const alt = i % 2 !== 0;
            // Handle both mappingIndex format and legacy format
            const skillName = fs.skill || fs.name || '';
            const pcRefs = Array.isArray(fs.pcRefs) ? fs.pcRefs.join(', ') : (fs.pcs || '');
            const desc = fs.description || fs.text || '';
            const coveredBy = fs.coveredBy || {};

            fsRows.push(new TableRow({
                children: [
                    dataCell(skillName, fsSkillW, alt),
                    dataCell(pcRefs, fsPCW, alt),
                    dataCell(desc, fsDescW, alt),
                    ...sections.map((s, si) => {
                        // Use coveredBy from mapping index if available
                        const taskKey = `task${si + 1}`;
                        const val = coveredBy[taskKey] !== undefined
                            ? coveredBy[taskKey]
                            : qNumsForFS(fs.ref || `FS${i + 1}`, taskTypeFromId(s.id), mappingIndex || {});
                        return dataCell(val, taskColW, alt);
                    }),
                ],
            }));
        });
    }

    children.push(new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [fsSkillW, fsPCW, fsDescW, ...sections.map(() => taskColW)],
        rows: fsRows,
    }));

    // ── SECTION 6 — Performance Evidence table ────────────────────────────────
    children.push(sectionHeading('Performance Evidence'));
    const peItems2 = peItems || [];
    const peTextW = TABLE_WIDTH - taskColW * numTaskCols;

    const peRows = [
        // Spanning header
        new TableRow({
            children: [new TableCell({
                columnSpan: 1 + numTaskCols,
                shading: { fill: NAVY, type: ShadingType.CLEAR },
                margins: CELL_MARGINS,
                borders: ALL_BORDERS,
                children: [new Paragraph({
                    children: [new TextRun({ text: 'Performance Evidence: Evidence required to demonstrate competence in this unit must be relevant to and satisfy all of the requirements of the elements and performance criteria and include:', bold: true, size: 18, font: 'Arial', color: 'FFFFFF' })],
                })],
            })],
        }),
        // Column headers
        new TableRow({
            children: [
                headerCell('Performance Evidence Requirement', peTextW),
                ...sections.map((s, i) => headerCell(`Task ${i + 1}`, taskColW)),
            ],
        }),
        ...peItems2.map((pe, i) => {
            const alt = i % 2 !== 0;
            return new TableRow({
                children: [
                    dataCell(`${pe.ref} ${pe.text}`, peTextW, alt),
                    ...sections.map(s => {
                        const tt = taskTypeFromId(s.id);
                        const val = qNumsForPE(pe.ref, tt, mappingIndex || {});
                        return dataCell(val, taskColW, alt);
                    }),
                ],
            });
        }),
    ];

    children.push(new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [peTextW, ...sections.map(() => taskColW)],
        rows: peRows,
    }));

    // ── SECTION 7 — Knowledge Evidence table ─────────────────────────────────
    children.push(sectionHeading('Knowledge Evidence'));
    const keItems2 = (keItems || []).filter(k => !k.isSubItem);
    const keTextW = TABLE_WIDTH - taskColW * numTaskCols;

    const keRows = [
        new TableRow({
            children: [new TableCell({
                columnSpan: 1 + numTaskCols,
                shading: { fill: NAVY, type: ShadingType.CLEAR },
                margins: CELL_MARGINS,
                borders: ALL_BORDERS,
                children: [new Paragraph({
                    children: [new TextRun({ text: 'Knowledge Evidence: Evidence required to demonstrate competence in this unit must be relevant to and satisfy all of the requirements of the elements and performance criteria and include knowledge of:', bold: true, size: 18, font: 'Arial', color: 'FFFFFF' })],
                })],
            })],
        }),
        new TableRow({
            children: [
                headerCell('Knowledge Evidence Requirement', keTextW),
                ...sections.map((s, i) => headerCell(`Task ${i + 1}`, taskColW)),
            ],
        }),
        ...keItems2.map((ke, i) => {
            const alt = i % 2 !== 0;
            return new TableRow({
                children: [
                    dataCell(`${ke.ref} ${ke.text}`, keTextW, alt),
                    ...sections.map(s => {
                        const tt = taskTypeFromId(s.id);
                        // KE is primarily covered by knowledge questions; also check other task types
                        const val = qNumsForKE(ke.ref, tt, mappingIndex || {});
                        return dataCell(val, taskColW, alt);
                    }),
                ],
            });
        }),
    ];

    children.push(new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [keTextW, ...sections.map(() => taskColW)],
        rows: keRows,
    }));

    // ── SECTION 8 — Assessment Conditions table ───────────────────────────────
    children.push(sectionHeading('Assessment Conditions'));
    const acTextW = Math.floor(TABLE_WIDTH * 0.6);
    const acCommentsW = TABLE_WIDTH - acTextW;

    // BUG 6 FIX: prefer mappingIndex.assessmentConditions (verbatim + howMet from 7th AI call)
    const miAcItems = (mappingIndex || {}).assessmentConditions || [];
    const acLegacy = md.acItems || [];
    // mappingIndex format: { condition, howMet }; legacy format: { text, howMet }
    const effectiveAcItems = miAcItems.length > 0
        ? miAcItems.map(ac => ({ text: ac.condition || ac.text || '', howMet: ac.howMet || '' }))
        : acLegacy;

    const acRows = [
        new TableRow({
            children: [
                headerCell('Assessment Condition (verbatim from UoC)', acTextW),
                headerCell('How This Assessment Meets the Condition', acCommentsW),
            ],
        }),
        ...effectiveAcItems.map((ac, i) => new TableRow({
            children: [
                dataCell(ac.text || '', acTextW, i % 2 !== 0),
                dataCell(ac.howMet || '', acCommentsW, i % 2 !== 0),
            ],
        })),
    ];
    if (effectiveAcItems.length === 0) {
        acRows.push(new TableRow({
            children: [
                dataCell('See unit of competency for assessment conditions.', acTextW, false),
                dataCell('', acCommentsW, false),
            ],
        }));
    }

    children.push(new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [acTextW, acCommentsW],
        rows: acRows,
    }));

    // ── SECTION 9 — Dimensions of Competency ─────────────────────────────────
    children.push(sectionHeading('Dimensions of Competency'));
    const dimRows = [
        new TableRow({
            children: [new TableCell({
                shading: { fill: NAVY, type: ShadingType.CLEAR },
                margins: CELL_MARGINS,
                borders: ALL_BORDERS,
                children: [new Paragraph({
                    children: [new TextRun({ text: 'Dimensions of Competency', bold: true, size: 20, font: 'Arial', color: 'FFFFFF' })],
                })],
            })],
        }),
        ...[
            'Task Skills: the ability to perform individual tasks. The student must perform the skills to complete work tasks to the industry standard. These skills are specified in the unit of competency and are often the easiest to identify when preparing an assessment tool.',
            'Task Management Skills: demonstrating the ability to manage several different tasks, operations, or activities within the job role or work environment. The student must plan and coordinate different tasks to complete a work task. These skills are required at all AQF levels and become increasingly complex at higher AQF levels.',
            'Contingency Management Skills: the requirement to respond to irregularities and breakdowns in routine. The student must use problem-solving skills when things do not go to plan. If you do not have access to the student\'s workplace to assess these skills, use a scenario or questions that ask "What would you do if?"',
            'Job and Role Environment Skills: demonstrating the ability to deal with responsibilities and expectations of the workplace, including working with others. The student must be able to follow workplace procedures, deal with workplace expectations such as interruptions or distractions, and work well with all colleagues.',
        ].map((text, i) => new TableRow({
            children: [new TableCell({
                shading: i % 2 !== 0 ? { fill: ALT_BG, type: ShadingType.CLEAR } : undefined,
                margins: CELL_MARGINS,
                borders: ALL_BORDERS,
                children: [new Paragraph({
                    children: [new TextRun({ text, size: 18, font: 'Arial' })],
                })],
            })],
        })),
    ];

    children.push(new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [TABLE_WIDTH],
        rows: dimRows,
    }));

    // ── SECTION 10 — Version Control table ───────────────────────────────────
    children.push(sectionHeading('Version Control'));
    const vcColW = Math.floor(TABLE_WIDTH / 4);
    const vcRows = [
        new TableRow({
            children: [new TableCell({
                columnSpan: 4,
                shading: { fill: NAVY, type: ShadingType.CLEAR },
                margins: CELL_MARGINS,
                borders: ALL_BORDERS,
                children: [new Paragraph({
                    children: [
                        new TextRun({ text: 'Version Control ', bold: true, size: 18, font: 'Arial', color: 'FFFFFF' }),
                        new TextRun({ text: 'ADMIN USE ONLY', bold: true, size: 18, font: 'Arial', color: 'FFC107' }),
                    ],
                })],
            })],
        }),
        new TableRow({
            children: ['Version', 'Date', 'Author', 'Detail'].map(h => headerCell(h, vcColW)),
        }),
        new TableRow({
            children: [
                dataCell('1.0', vcColW, false),
                dataCell(dateBuilt || '', vcColW, false),
                dataCell('Clearpass', vcColW, false),
                dataCell('Mapping document generated by Clearpass Assessment Tool', vcColW, false),
            ],
        }),
        // 5 blank rows
        ...Array.from({ length: 5 }, (_, i) => new TableRow({
            children: [dataCell('', vcColW, i % 2 !== 0), dataCell('', vcColW, i % 2 !== 0), dataCell('', vcColW, i % 2 !== 0), dataCell('', vcColW, i % 2 !== 0)],
        })),
    ];

    children.push(new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [vcColW, vcColW, vcColW, vcColW],
        rows: vcRows,
    }));

    // ── Build document ────────────────────────────────────────────────────────
    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
                    size: { width: 11906, height: 16838 }, // A4
                },
            },
            footers: { default: docFooter },
            children,
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const CHUNK = 8192;
    for (let i = 0; i < bytes.byteLength; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return { file_base64: btoa(binary), filename: `${unitCode || 'unit'}-competency-mapping.docx` };
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { mappingData } = await req.json();
        if (!mappingData) return Response.json({ error: 'mappingData required' }, { status: 400 });

        const result = await buildCompetencyMappingDoc(mappingData);
        return Response.json(result);
    } catch (error) {
        console.error('generateCompetencyMapping error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});