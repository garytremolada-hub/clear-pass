import JSZip from 'jszip';

// Reads a .docx in document order, including table rows (cells joined with " | ").
// Returns { text, warnings, notes } so the caller can tell the user what could not be read.

const clean = (s) => s.replace(/\s+/g, ' ').trim();

function paraText(node) {
    let out = '';
    const walk = (n) => {
        for (const c of Array.from(n.childNodes)) {
            if (c.nodeType !== 1) continue;
            const name = c.nodeName;
            if (name === 'mc:Fallback' || name === 'w:delText') continue;
            if (name === 'w:t') out += c.textContent;
            else if (name === 'w:tab' || name === 'w:br' || name === 'w:cr') out += ' ';
            else walk(c);
        }
    };
    walk(node);
    return clean(out);
}

function readBlocks(node, ctx, lines) {
    for (const c of Array.from(node.childNodes)) {
        if (c.nodeType !== 1) continue;
        const name = c.nodeName;
        if (name === 'w:p') {
            const t = paraText(c);
            if (t) lines.push(t);
        } else if (name === 'w:tbl') {
            ctx.tables++;
            for (const tr of Array.from(c.childNodes).filter(n => n.nodeName === 'w:tr')) {
                ctx.rows++;
                const cells = Array.from(tr.childNodes)
                    .filter(n => n.nodeName === 'w:tc')
                    .map(tc => {
                        const sub = [];
                        readBlocks(tc, ctx, sub);
                        return clean(sub.join(' '));
                    })
                    .filter(Boolean);
                if (cells.length) lines.push(cells.join(' | '));
            }
        } else if (['w:sdt', 'w:sdtContent', 'w:customXml', 'w:ins', 'w:smartTag'].includes(name)) {
            readBlocks(c, ctx, lines);
        }
    }
}

export async function extractDocxStructured(file) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const docFile = zip.file('word/document.xml');
    if (!docFile) throw new Error('Could not find document.xml inside this .docx file');
    const xml = await docFile.async('string');

    const dom = new DOMParser().parseFromString(xml, 'application/xml');
    if (dom.getElementsByTagName('parsererror').length) throw new Error('The Word file content could not be parsed');
    const body = dom.getElementsByTagName('w:body')[0];
    if (!body) throw new Error('The Word file has no readable body');

    const ctx = { tables: 0, rows: 0 };
    const lines = [];
    readBlocks(body, ctx, lines);

    const images = (xml.match(/<w:drawing[ >]/g) || []).length + (xml.match(/<w:pict[ >]/g) || []).length;
    const warnings = [];
    const notes = [];
    if (ctx.tables > 0) notes.push(`Read ${ctx.tables} table${ctx.tables !== 1 ? 's' : ''} (${ctx.rows} rows), including any question and checklist tables.`);
    if (images > 0) warnings.push(`This document contains ${images} image${images !== 1 ? 's' : ''} or drawing${images !== 1 ? 's' : ''} whose content cannot be read. Anything that only appears inside an image was not audited.`);

    return { text: lines.join('\n'), warnings, notes };
}