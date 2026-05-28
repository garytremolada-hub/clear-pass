import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    TableRow,
    TableCell,
    Table,
    WidthType,
    BorderStyle,
} from 'docx';
import { saveAs } from 'file-saver';

// Detect line type
function lineType(line) {
    if (/^#{1}\s/.test(line)) return 'h1';
    if (/^#{2}\s/.test(line)) return 'h2';
    if (/^#{3,}\s/.test(line)) return 'h3';
    if (/^\s*[-*•]\s/.test(line)) return 'bullet';
    if (/^\s*\d+\.\s/.test(line)) return 'numberedList';
    if (/^\|.+\|/.test(line)) return 'tableRow';
    return 'normal';
}

function stripMarkdown(text) {
    return text
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/^#{1,6}\s+/, '')
        .replace(/^\s*[-*•]\s+/, '')
        .replace(/^\s*\d+\.\s+/, '');
}

function makeParagraph(text, options = {}) {
    const clean = stripMarkdown(text);
    return new Paragraph({
        children: [new TextRun({
            text: clean,
            font: 'Arial',
            size: options.size || 22,       // half-points: 22 = 11pt
            bold: options.bold || false,
        })],
        heading: options.heading || undefined,
        spacing: { line: 276, before: options.spaceBefore || 0, after: options.spaceAfter || 120 },
        alignment: AlignmentType.LEFT,
    });
}

function parseTableLines(lines) {
    // Filter out separator rows (e.g. |---|---|)
    const dataRows = lines.filter(l => !/^\s*\|[\s\-|:]+\|\s*$/.test(l));
    const rows = dataRows.map(l => {
        const cells = l.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
        return new TableRow({
            children: cells.map(cellText => new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({ text: stripMarkdown(cellText), font: 'Arial', size: 20 })],
                    spacing: { before: 60, after: 60 },
                })],
                width: { size: Math.floor(9000 / cells.length), type: WidthType.DXA },
                borders: {
                    top:    { style: BorderStyle.SINGLE, size: 4, color: '999999' },
                    bottom: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
                    left:   { style: BorderStyle.SINGLE, size: 4, color: '999999' },
                    right:  { style: BorderStyle.SINGLE, size: 4, color: '999999' },
                },
            })),
        });
    });
    return new Table({ rows, width: { size: 9000, type: WidthType.DXA } });
}

/**
 * Convert plain/markdown text to a .docx and trigger download.
 * @param {string} text  - The rewritten document text
 * @param {string} filename - Desired filename (without extension)
 */
export async function downloadAsDocx(text, filename = 'document') {
    const lines = text.split('\n');
    const children = [];

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) {
            // Empty line → small spacer paragraph
            children.push(new Paragraph({ children: [], spacing: { before: 0, after: 80 } }));
            i++;
            continue;
        }

        const type = lineType(trimmed);

        if (type === 'tableRow') {
            // Collect all consecutive table lines
            const tableLines = [];
            while (i < lines.length && lineType(lines[i].trim()) === 'tableRow') {
                tableLines.push(lines[i]);
                i++;
            }
            children.push(parseTableLines(tableLines));
            // Space after table
            children.push(new Paragraph({ children: [], spacing: { before: 0, after: 120 } }));
            continue;
        }

        if (type === 'h1') {
            children.push(makeParagraph(trimmed, { heading: HeadingLevel.HEADING_1, size: 26, bold: true, spaceBefore: 240, spaceAfter: 120 }));
        } else if (type === 'h2') {
            children.push(makeParagraph(trimmed, { heading: HeadingLevel.HEADING_2, size: 24, bold: true, spaceBefore: 200, spaceAfter: 100 }));
        } else if (type === 'h3') {
            children.push(makeParagraph(trimmed, { size: 22, bold: true, spaceBefore: 160, spaceAfter: 80 }));
        } else if (type === 'bullet') {
            children.push(new Paragraph({
                children: [new TextRun({ text: stripMarkdown(trimmed), font: 'Arial', size: 22 })],
                bullet: { level: 0 },
                spacing: { line: 276, before: 0, after: 80 },
            }));
        } else if (type === 'numberedList') {
            children.push(new Paragraph({
                children: [new TextRun({ text: stripMarkdown(trimmed), font: 'Arial', size: 22 })],
                numbering: { reference: 'default-numbering', level: 0 },
                spacing: { line: 276, before: 0, after: 80 },
            }));
        } else {
            children.push(makeParagraph(trimmed, { size: 22, spaceAfter: 120 }));
        }

        i++;
    }

    const doc = new Document({
        numbering: {
            config: [{
                reference: 'default-numbering',
                levels: [{
                    level: 0,
                    format: 'decimal',
                    text: '%1.',
                    alignment: AlignmentType.LEFT,
                    style: { paragraph: { indent: { left: 720, hanging: 360 } } },
                }],
            }],
        },
        sections: [{
            properties: {
                page: {
                    margin: { top: 1418, bottom: 1418, left: 1418, right: 1418 }, // ~2.5cm in twips
                },
            },
            children,
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${filename}.docx`);
}