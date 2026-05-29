import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {
    Document,
    Paragraph,
    TextRun,
    HeadingLevel,
    Packer,
    AlignmentType,
    PageBreak,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    ShadingType,
} from 'npm:docx@8.5.0';

// ── Colour constants ──────────────────────────────────────────────────────────
const NAVY   = '0d2444';
const GREEN  = '14532d';
const RED    = '991b1b';
const AMBER  = '713f12';
const BLACK  = '000000';
const GREY   = '6b7280';

// ── Full acronym glossary ─────────────────────────────────────────────────────
const ALL_ACRONYMS = {
    AC:   { term: 'AC — Assessment Conditions',       def: 'The environment, resources, and requirements that must be in place when assessment takes place.' },
    AQF:  { term: 'AQF — Australian Qualifications Framework', def: 'The national policy that sets the standards for all qualifications in Australia, from Certificate I through to Doctoral Degree.' },
    ASQA: { term: 'ASQA — Australian Skills Quality Authority', def: 'The national regulator for Registered Training Organisations and vocational qualifications in Australia.' },
    C:    { term: 'C — Competent',                    def: 'The learner has successfully completed all assessment requirements for this unit.' },
    ESL:  { term: 'ESL — English as a Second Language', def: 'Learners whose first language is not English.' },
    FK:   { term: 'FK — Flesch-Kincaid',              def: 'A readability formula that measures how easy a text is to read, based on sentence length and word complexity.' },
    FKGL: { term: 'FKGL — Flesch-Kincaid Grade Level', def: 'A number that shows the school grade level a reader needs to comfortably understand a text. A higher number means harder to read.' },
    FRE:  { term: 'FRE — Flesch Reading Ease Score',  def: 'A score from 0 to 100 that shows how easy a text is to read. A higher number means the text is easier to read.' },
    KE:   { term: 'KE — Knowledge Evidence',          def: 'What a learner must know and be able to explain to be assessed as competent in this unit.' },
    LLNP: { term: 'LLNP — Language Literacy Numeracy and Participation', def: 'An Australian government program that supports adults who need help with reading, writing, numeracy, or English language skills.' },
    NS:   { term: 'NS — Not Satisfactory',            def: 'The learner has not met the requirements for this task or question. Also written as NYS in some documents.' },
    NYC:  { term: 'NYC — Not Yet Competent',          def: 'The learner has not yet successfully completed all assessment requirements for this unit.' },
    NYS:  { term: 'NYS — Not Yet Satisfactory',       def: 'The learner has not yet met the requirements for this task or question and needs to resubmit.' },
    PC:   { term: 'PC — Performance Criteria',        def: 'The specific standards a learner must meet to demonstrate competency within each Element of the unit.' },
    PE:   { term: 'PE — Performance Evidence',        def: 'What a learner must be able to DO and demonstrate in practice to be assessed as competent in this unit.' },
    RTO:  { term: 'RTO — Registered Training Organisation', def: 'A training provider registered with ASQA or a state regulator to deliver and assess vocational qualifications.' },
    S:    { term: 'S — Satisfactory',                 def: 'The learner has met the requirements for this task or question.' },
    TEQSA:{ term: 'TEQSA — Tertiary Education Quality and Standards Agency', def: 'The national regulator for universities and higher education providers in Australia.' },
    UoC:  { term: 'UoC — Unit of Competency',        def: 'A single unit from an Australian Training Package that describes exactly what a learner must know and be able to do to be considered competent in that area of work.' },
    VET:  { term: 'VET — Vocational Education and Training', def: 'The Australian system of practical qualifications, from Certificate I through to Advanced Diploma, delivered by RTOs and TAFEs.' },
};

// Detect which acronyms are actually used in a text block
function detectUsedAcronyms(text) {
    const used = new Set();
    for (const key of Object.keys(ALL_ACRONYMS)) {
        // Match standalone acronym (word boundary)
        const re = new RegExp(`\\b${key}\\b`);
        if (re.test(text)) used.add(key);
    }
    return Array.from(used).sort();
}

// ── Helper: make a paragraph ──────────────────────────────────────────────────
function para(runs, opts = {}) {
    return new Paragraph({
        children: Array.isArray(runs) ? runs : [runs],
        spacing: { after: opts.spacingAfter ?? 120, before: opts.spacingBefore ?? 0 },
        pageBreakBefore: opts.pageBreak ?? false,
        alignment: opts.alignment ?? AlignmentType.LEFT,
        heading: opts.heading ?? undefined,
    });
}

function run(text, { bold = false, color = BLACK, size = 22, italic = false, font = 'Arial' } = {}) {
    return new TextRun({ text, bold, color, size, italics: italic, font });
}

function sectionHeading(text, pageBreak = true) {
    return para(
        [run(text, { bold: true, color: NAVY, size: 24 })],
        { pageBreak, spacingBefore: 240, spacingAfter: 160, heading: HeadingLevel.HEADING_1 }
    );
}

function subHeading(text) {
    return para([run(text, { bold: true, color: NAVY, size: 22 })], { spacingBefore: 160, spacingAfter: 80 });
}

function bodyText(text, color = BLACK) {
    return para([run(text, { color })]);
}

function statusRun(text) {
    const isGreen  = /COVERED ✓|MAPPED ✓|MET ✓/i.test(text);
    const isRed    = /NOT COVERED ✗|NOT MAPPED ✗|NOT MET ✗/i.test(text);
    const isAmber  = /ADVISORY ⚠/i.test(text);
    const color = isGreen ? GREEN : isRed ? RED : isAmber ? AMBER : BLACK;
    return run(text, { bold: true, color });
}

// ── Simple table builder ──────────────────────────────────────────────────────
function makeTable(headers, rows) {
    const colCount = headers.length;
    const headerCells = headers.map(h =>
        new TableCell({
            children: [para([run(h, { bold: true, color: NAVY, size: 20 })])],
            shading: { type: ShadingType.SOLID, color: 'f0f4f8' },
        })
    );

    const dataRows = rows.map(cells =>
        new TableRow({
            children: cells.map((cellText, i) =>
                new TableCell({
                    children: [para([statusRun(String(cellText))])],
                    width: i === 0 ? { size: 40, type: WidthType.PERCENTAGE } : undefined,
                })
            ),
        })
    );

    return new Table({
        rows: [
            new TableRow({ children: headerCells, tableHeader: true }),
            ...dataRows,
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
    });
}

// ── Acronym legend page ───────────────────────────────────────────────────────
function buildAcronymLegendPage(usedKeys) {
    const elements = [];

    elements.push(para([new PageBreak()]));

    elements.push(para(
        [run('GLOSSARY OF TERMS USED IN THIS DOCUMENT', { bold: true, color: NAVY, size: 24 })],
        { alignment: AlignmentType.CENTER, spacingAfter: 80 }
    ));

    // Divider paragraph (top border via spacing)
    elements.push(para(
        [run('The following terms and short forms are used in this document. If you are new to VET assessment, this list will help you understand what each term means.', { italic: true, color: GREY, size: 20 })],
        { spacingAfter: 200 }
    ));

    for (const key of usedKeys) {
        const entry = ALL_ACRONYMS[key];
        if (!entry) continue;
        elements.push(para([run(entry.term, { bold: true, color: NAVY, size: 22 })], { spacingAfter: 40, spacingBefore: 120 }));
        elements.push(para([run(entry.def, { color: BLACK, size: 22 })], { spacingAfter: 80 }));
    }

    return elements;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { mapping_text, unit_codes, filename } = body;

        if (!mapping_text || !filename) {
            return Response.json({ error: 'mapping_text and filename are required' }, { status: 400 });
        }

        console.log(`[buildMappingDocument] Building mapping doc for "${filename}"`);

        // ── Parse the AI-produced mapping text into sections ──────────────────
        // The mapping text from the AI is structured markdown. We'll render it
        // into a properly styled .docx using the docx package.

        const children = [];
        const lines = mapping_text.split('\n');

        // Title page
        children.push(para(
            [run('ASSESSMENT MAPPING DOCUMENT', { bold: true, color: NAVY, size: 32 })],
            { alignment: AlignmentType.CENTER, spacingAfter: 160, spacingBefore: 480 }
        ));

        if (unit_codes && unit_codes.length > 0) {
            children.push(para(
                [run(unit_codes.join(' + '), { bold: true, color: NAVY, size: 24 })],
                { alignment: AlignmentType.CENTER, spacingAfter: 480 }
            ));
        }

        // Parse lines into doc elements
        let inSection = false;
        let tableBuffer = null;
        let tableHeaders = null;

        const flushTable = () => {
            if (tableBuffer && tableHeaders) {
                children.push(makeTable(tableHeaders, tableBuffer));
                tableBuffer = null;
                tableHeaders = null;
            }
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // Detect table rows (markdown: | col | col |)
            if (trimmed.startsWith('|')) {
                const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
                // Skip separator rows like |---|---|
                if (cells.every(c => /^[-: ]+$/.test(c))) continue;
                if (!tableHeaders) {
                    tableHeaders = cells;
                    tableBuffer = [];
                } else {
                    tableBuffer.push(cells);
                }
                continue;
            } else {
                flushTable();
            }

            if (!trimmed) { children.push(para([run('')])); continue; }

            // Heading 1 (# or SECTION N —)
            if (/^#\s+/.test(trimmed) || /^SECTION\s+\d+\s*[—-]/i.test(trimmed)) {
                const text = trimmed.replace(/^#+\s*/, '').replace(/^\*+/, '').replace(/\*+$/, '');
                const isFirst = /^SECTION\s+1\b/i.test(trimmed) || /^#\s+.*HEADER/i.test(trimmed);
                children.push(sectionHeading(text, !isFirst));
                inSection = true;
                continue;
            }

            // Heading 2 (## or bold lines)
            if (/^##\s+/.test(trimmed)) {
                const text = trimmed.replace(/^#+\s*/, '');
                children.push(subHeading(text));
                continue;
            }

            // Heading 3 (###)
            if (/^###\s+/.test(trimmed)) {
                const text = trimmed.replace(/^#+\s*/, '');
                children.push(para([run(text, { bold: true, color: NAVY, size: 22 })], { spacingBefore: 120, spacingAfter: 60 }));
                continue;
            }

            // Bold heading heuristic (**SOMETHING:**)
            if (/^\*\*[A-Z].*\*\*$/.test(trimmed) || /^\*\*[A-Z].*:\*\*$/.test(trimmed)) {
                const text = trimmed.replace(/\*\*/g, '');
                children.push(subHeading(text));
                continue;
            }

            // Status lines
            if (/COVERED ✓|NOT COVERED ✗|MAPPED ✓|NOT MAPPED ✗|MET ✓|NOT MET ✗|ADVISORY ⚠/i.test(trimmed)) {
                children.push(para([statusRun(trimmed.replace(/^\s*[-•]\s*/, ''))], { spacingAfter: 60 }));
                continue;
            }

            // List item
            if (/^[-•*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
                const text = trimmed.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, '');
                children.push(para([run(text)], { spacingAfter: 60 }));
                continue;
            }

            // Plain body
            const stripped = trimmed.replace(/\*\*/g, '').replace(/\*/g, '');
            children.push(bodyText(stripped));
        }

        flushTable();

        // Compliance disclaimer
        children.push(sectionHeading('COMPLIANCE DISCLAIMER', true));
        children.push(bodyText(
            'This mapping document was generated by Clearpass as a support tool for assessment design and validation. ' +
            'Final compliance determination rests with the assessor, the RTO, and where applicable ASQA or TEQSA. ' +
            'This document does not constitute a compliance ruling.'
        ));

        // Reviewer fields
        children.push(subHeading('Reviewer Details'));
        children.push(bodyText('Name: _______________________________________'));
        children.push(bodyText('Signature: ___________________________________'));
        children.push(bodyText('Date: _______________________________________'));
        children.push(para([run('Note: This document must be reviewed and signed by a qualified assessor before use.', { italic: true, color: GREY, size: 20 })], { spacingAfter: 120 }));

        // ── Acronym legend ────────────────────────────────────────────────────
        const usedKeys = detectUsedAcronyms(mapping_text);
        // Always include core acronyms for a mapping doc
        for (const k of ['AQF', 'ASQA', 'PE', 'KE', 'PC', 'AC', 'UoC', 'RTO', 'FKGL', 'FRE', 'VET']) {
            if (!usedKeys.includes(k)) usedKeys.push(k);
        }
        usedKeys.sort();
        const legendElements = buildAcronymLegendPage(usedKeys);
        children.push(...legendElements);

        // ── Build document ────────────────────────────────────────────────────
        const doc = new Document({
            styles: {
                default: {
                    document: { run: { font: 'Arial', size: 22 } },
                },
            },
            sections: [{
                properties: {
                    page: {
                        margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
                    },
                },
                children,
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        const bytes = new Uint8Array(buffer);
        const CHUNK = 0x8000;
        let b64 = '';
        for (let i = 0; i < bytes.length; i += CHUNK) {
            b64 += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
        }
        const file_base64 = btoa(b64);

        console.log(`[buildMappingDocument] Done. ${bytes.length} bytes.`);
        return Response.json({ file_base64, filename });

    } catch (error) {
        console.error('[buildMappingDocument]', error.message, error.stack);
        return Response.json({ error: error.message }, { status: 500 });
    }
});