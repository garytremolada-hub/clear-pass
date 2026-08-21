import {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    BorderStyle, WidthType,
} from 'docx';

const NAVY = '0D2444';
const WHITE = 'FFFFFF';
const LIGHT_GREY = 'F9FAFB';
const BORDER_GREY = 'D1D5DB';
const PAGE_WIDTH = 9026;

function navyHeader(text) {
    const navyB = { style: BorderStyle.SINGLE, size: 2, color: NAVY };
    return new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [PAGE_WIDTH],
        rows: [new TableRow({
            children: [new TableCell({
                borders: { top: navyB, bottom: navyB, left: navyB, right: navyB },
                shading: { fill: NAVY, type: 'clear' },
                margins: { top: 120, bottom: 120, left: 200, right: 200 },
                children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 26, color: WHITE, font: 'Arial' })] })],
            })],
        })],
    });
}

function para(t, opts = {}) {
    return new Paragraph({
        spacing: { before: opts.before || 80, after: opts.after || 80 },
        children: [new TextRun({ text: t, size: opts.size || 20, font: 'Arial', color: opts.color || '1A1A1A', bold: opts.bold || false, italics: opts.italic || false })],
    });
}

function tableRow(cells, isHeader = false) {
    const thin = { style: BorderStyle.SINGLE, size: 1, color: BORDER_GREY };
    const borders = { top: thin, bottom: thin, left: thin, right: thin };
    const cm = { top: 80, bottom: 80, left: 140, right: 140 };
    return new TableRow({
        children: cells.map((t, i) => new TableCell({
            borders,
            margins: cm,
            shading: { fill: isHeader ? NAVY : (i % 2 === 0 ? LIGHT_GREY : WHITE), type: 'clear' },
            children: [new Paragraph({ children: [new TextRun({ text: String(t || ''), size: 18, font: 'Arial', color: isHeader ? WHITE : '1A1A1A', bold: isHeader })] })],
        })),
    });
}

function makeTable(headers, trows) {
    return new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: Array(headers.length).fill(Math.floor(PAGE_WIDTH / headers.length)),
        rows: [tableRow(headers, true), ...trows.map(r => tableRow(r))],
    });
}

function sp() {
    return new Paragraph({ spacing: { before: 120, after: 120 }, children: [new TextRun({ text: '' })] });
}

function buildReadabilityChart(sectionList, targetFKGL, bandLabel) {
    const MAX_FKGL = 20;
    const LABEL_COL = Math.floor(PAGE_WIDTH * 0.35);
    const BAR_ZONE_TOTAL = PAGE_WIDTH - LABEL_COL;
    const FKGL_LABEL_W = 600;
    const BAR_ZONE = BAR_ZONE_TOTAL - FKGL_LABEL_W;
    const none = { style: BorderStyle.NONE };
    const thin = { style: BorderStyle.SINGLE, size: 1, color: BORDER_GREY };
    const noBorder = { top: none, bottom: none, left: none, right: none };
    const bottomOnly = { top: none, bottom: thin, left: none, right: none };

    const chartRows = [
        new TableRow({
            children: [
                new TableCell({ width: { size: LABEL_COL, type: WidthType.DXA }, borders: bottomOnly, margins: { top: 60, bottom: 60, left: 0, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: 'Section', bold: true, size: 18, font: 'Arial', color: '6B7280' })] })] }),
                new TableCell({ width: { size: BAR_ZONE_TOTAL, type: WidthType.DXA }, borders: bottomOnly, margins: { top: 60, bottom: 60, left: 0, right: 0 }, children: [new Paragraph({ children: [new TextRun({ text: `Reading level. Target: ${bandLabel}`, bold: true, size: 18, font: 'Arial', color: '6B7280' })] })] }),
            ],
        }),
    ];

    sectionList.forEach(section => {
        const fkgl = parseFloat(section._readability?.fkgl) || 0;
        const diff = section._readability ? Math.abs(fkgl - targetFKGL) : null;
        const status = diff === null ? 'not scored' : diff <= 1.5 ? 'within' : diff <= 2.5 ? 'advisory' : 'refer';
        const barColour = status === 'within' ? '639922' : status === 'advisory' ? 'BA7517' : status === 'refer' ? 'A32D2D' : 'D1D5DB';
        const barPct = Math.min(fkgl / MAX_FKGL, 1);
        const filledW = Math.max(Math.floor(BAR_ZONE * barPct), 20);
        const emptyW = Math.max(BAR_ZONE - filledW, 20);

        chartRows.push(new TableRow({
            height: { value: 380, rule: 'exact' },
            children: [
                new TableCell({
                    width: { size: LABEL_COL, type: WidthType.DXA }, borders: noBorder,
                    margins: { top: 80, bottom: 0, left: 0, right: 140 }, verticalAlign: 'center',
                    children: [new Paragraph({ children: [new TextRun({ text: section.name || 'Section', size: 17, font: 'Arial', color: '374151' })] })],
                }),
                new TableCell({
                    width: { size: BAR_ZONE_TOTAL, type: WidthType.DXA }, borders: noBorder,
                    margins: { top: 80, bottom: 0, left: 0, right: 0 }, verticalAlign: 'center',
                    children: [new Table({
                        width: { size: BAR_ZONE_TOTAL, type: WidthType.DXA },
                        columnWidths: [filledW, emptyW, FKGL_LABEL_W],
                        rows: [new TableRow({
                            height: { value: 200, rule: 'exact' },
                            children: [
                                new TableCell({ width: { size: filledW, type: WidthType.DXA }, shading: { fill: barColour, type: 'clear' }, borders: noBorder, children: [new Paragraph({ children: [] })] }),
                                new TableCell({ width: { size: emptyW, type: WidthType.DXA }, shading: { fill: 'F3F4F6', type: 'clear' }, borders: noBorder, children: [new Paragraph({ children: [] })] }),
                                new TableCell({ width: { size: FKGL_LABEL_W, type: WidthType.DXA }, borders: noBorder, margins: { left: 80 }, children: [new Paragraph({ children: [new TextRun({ text: fkgl > 0 ? fkgl.toFixed(1) : 'N/A', size: 17, bold: true, font: 'Arial', color: barColour })] })] }),
                            ],
                        })],
                    })],
                }),
            ],
        }));
    });

    return new Table({ width: { size: PAGE_WIDTH, type: WidthType.DXA }, columnWidths: [LABEL_COL, BAR_ZONE_TOTAL], rows: chartRows });
}

function buildChartLegend() {
    const legendItems = [
        { fill: '639922', label: 'Within range (FKGL within 1.5 of target)' },
        { fill: 'BA7517', label: 'Advisory (1.6 to 2.5 above target)' },
        { fill: 'A32D2D', label: 'Refer for review (more than 2.5 above target)' },
    ];
    const colW = Math.floor(PAGE_WIDTH / 3);
    const none = { style: BorderStyle.NONE };
    return new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [colW, colW, colW],
        rows: [new TableRow({
            children: legendItems.map(item => new TableCell({
                width: { size: colW, type: WidthType.DXA },
                borders: { top: none, bottom: none, left: none, right: none },
                margins: { top: 60, bottom: 60, left: 0, right: 40 },
                children: [new Paragraph({
                    children: [
                        new TextRun({ text: '\u25A0 ', size: 18, font: 'Arial', color: item.fill, bold: true }),
                        new TextRun({ text: item.label, size: 16, font: 'Arial', color: '6B7280' }),
                    ],
                })],
            })),
        })],
    });
}

function buildReadingEaseTable(sectionList) {
    const freLabel = (fre) => {
        if (fre >= 70) return 'Easy';
        if (fre >= 50) return 'Standard';
        if (fre >= 30) return 'Difficult';
        return 'Very difficult';
    };
    const colW = Math.floor(PAGE_WIDTH / 3);
    return new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [colW, colW, colW],
        rows: [
            tableRow(['Section', 'Reading Ease', 'Plain English'], true),
            ...sectionList.map(s => {
                const fre = s._readability?.fre;
                const freVal = typeof fre === 'number' ? fre.toFixed(0) : 'N/A';
                const label = typeof fre === 'number' ? freLabel(fre) : 'Not scored';
                return tableRow([s.name || 'Section', freVal, label]);
            }),
        ],
    });
}

function buildExampleBox(gap) {
    if (!gap.exampleContent) return null;
    const thin = { style: BorderStyle.SINGLE, size: 1, color: BORDER_GREY };
    const blueLeft = { style: BorderStyle.SINGLE, size: 8, color: '185FA5' };
    const lines = gap.exampleContent.split('\n');
    const boldStarts = ['Model answer', 'Assessor decision', 'What to look', 'Example question', 'Example task'];
    return new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [PAGE_WIDTH],
        rows: [new TableRow({
            children: [new TableCell({
                borders: { top: thin, bottom: thin, left: blueLeft, right: thin },
                shading: { fill: 'EFF6FF', type: 'clear' },
                margins: { top: 100, bottom: 100, left: 160, right: 140 },
                children: [
                    new Paragraph({ children: [new TextRun({ text: 'Example addition:', bold: true, size: 18, font: 'Arial', color: '185FA5' })] }),
                    ...lines.map(line => new Paragraph({
                        spacing: { before: 40 },
                        children: [new TextRun({ text: line, size: 18, font: 'Arial', color: '374151', bold: boldStarts.some(s => line.startsWith(s)) })],
                    })),
                ],
            })],
        })],
    });
}

export async function generateAuditDocx(units, results, cohortProfile, disclaimer) {
    const { sections = [], units: unitResults = [], overallVerdict = 'REQUIRES DEVELOPMENT', summaryStatement = '' } = results;
    const isAdequate = overallVerdict === 'ADEQUATE';
    const withinRangeCount = sections.filter(s => s._readability && Math.abs((s._readability.fkgl || 0) - cohortProfile.targetFKGL) <= 1.5).length;

    const children = [
        navyHeader('COMPLIANCE AUDIT REPORT'), sp(),
        para(`${units.map(u => u.code).join(', ')}`, { bold: true, size: 24 }),
        para(`Units: ${units.map(u => u.title).join('; ')}`, { color: '6B7280' }),
        para(`Cohort: ${cohortProfile.band} level`, { color: '6B7280' }),
        para(`Date: ${new Date().toLocaleDateString('en-AU')}`, { color: '6B7280' }),
        para(`Overall verdict: ${overallVerdict}`, { bold: true, color: isAdequate ? '16A34A' : 'D97706' }), sp(),
        navyHeader('Executive Summary'), sp(),
        para(summaryStatement || ''), sp(),
        navyHeader('Readability Analysis'), sp(),
        para(`Target reading level: ${cohortProfile.band}. ${withinRangeCount} of ${sections.length} sections are within the acceptable range.`, { color: '374151' }), sp(),
        buildReadabilityChart(sections, cohortProfile.targetFKGL ?? 10.5, cohortProfile.band), sp(),
        buildChartLegend(), sp(),
        para('Reading Ease Scores (0 to 100, higher is easier)', { bold: true, size: 18, color: '0D2444' }), sp(),
        buildReadingEaseTable(sections), sp(),
    ];

    unitResults.forEach(unit => {
        const unitAdequate = unit.unitVerdict === 'ADEQUATE';
        children.push(navyHeader(`${unit.unitCode} — ${unit.unitTitle}`), sp());
        children.push(para(`Unit verdict: ${unit.unitVerdict}`, { bold: true, color: unitAdequate ? '16A34A' : 'D97706' }), sp());
        children.push(para('Performance Evidence Coverage', { bold: true, size: 18, color: '0D2444' }), sp());
        children.push(makeTable(['Requirement', 'Status', 'Coverage cited', 'Gap'], (unit.peResults || []).map(r => [r.requirement || '', r.status || '', r.coverage || '', r.gap || ''])), sp());
        children.push(para('Knowledge Evidence Coverage', { bold: true, size: 18, color: '0D2444' }), sp());
        children.push(makeTable(['Requirement', 'Status', 'Coverage cited', 'Gap'], (unit.keResults || []).map(r => [r.requirement || '', r.status || '', r.coverage || '', r.gap || ''])), sp());
        children.push(para('Element and Performance Criteria Mapping', { bold: true, size: 18, color: '0D2444' }), sp());
        children.push(makeTable(['Element', 'PC', 'Status', 'Mapped to', 'Gap'], (unit.elementsResults || []).flatMap(el => (el.performanceCriteria || []).map(pc => [el.title || '', pc.ref || '', pc.status || '', pc.mappedTo || '', pc.gap || '']))), sp());
        children.push(para('Gaps and Recommendations', { bold: true, size: 18, color: '0D2444' }), sp());
        if ((unit.gaps || []).length === 0) {
            children.push(para('No gaps identified for this unit.'), sp());
        } else {
            unit.gaps.forEach(g => {
                children.push(para(`${g.requirement}: ${g.recommendation} (add: ${g.recommendedSectionType})`, { before: 80, after: 60 }));
                const exBox = buildExampleBox(g);
                if (exBox) { children.push(exBox); children.push(sp()); }
            });
        }
    });

    children.push(navyHeader('Instrument Adequacy'), sp());
    children.push(para(overallVerdict, { bold: true, size: 24, color: isAdequate ? '16A34A' : 'D97706' }));
    children.push(sp(), navyHeader('Compliance Disclaimer'), sp());
    children.push(para(disclaimer, { italic: true, color: '6B7280', size: 18 }));

    const doc = new Document({
        styles: { default: { document: { run: { font: 'Arial', size: 20 } } } },
        sections: [{
            properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
            children,
        }],
    });

    return await Packer.toBlob(doc);
}