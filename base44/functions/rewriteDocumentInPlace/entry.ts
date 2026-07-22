import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import JSZip from 'npm:jszip@3.10.1';

// Normalise text into a compact key for matching:
// - strip a leading manual list number ("1. " / "1) ")
// - remove ALL whitespace (handles <w:br>, nbsp, extra spaces from extraction)
// - lowercase
function textKey(s) {
    return (s || '')
        .replace(/\u00a0/g, ' ')
        .replace(/^\s*\d+[.)]\s*/, '')
        .replace(/\s+/g, '')
        .toLowerCase();
}

function escapeXml(s) {
    return (s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Concatenate all <w:t> contents inside a <w:p>
function paragraphText(pXml) {
    const matches = [...pXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)];
    return matches.map(m => m[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
    ).join('');
}

// Rebuild a <w:p> so its text becomes `rewritten`, preserving paragraph
// properties (pPr) and the first run's formatting (rPr). Paragraphs that
// contain drawings/objects are left untouched (handled by the caller).
function rewriteParagraph(pXml, rewritten) {
    const pPrMatch = pXml.match(/<w:pPr\b[^>]*>[\s\S]*?<\/w:pPr>/);
    const pPr = pPrMatch ? pPrMatch[0] : '';

    const openTagMatch = pXml.match(/^<w:p\b[^>]*>/);
    const openTag = openTagMatch ? openTagMatch[0] : '<w:p>';

    let rPr = '';
    const firstRun = pXml.match(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/);
    if (firstRun) {
        const r = firstRun[0].match(/<w:rPr\b[^>]*>[\s\S]*?<\/w:rPr>/);
        rPr = r ? r[0] : '';
    }

    const newRun = `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(rewritten)}</w:t></w:r>`;
    return `${openTag}${pPr}${newRun}</w:p>`;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { file_base64, original_paragraphs, rewrite_json, filename } = await req.json();
        if (!file_base64) return Response.json({ error: 'file_base64 is required' }, { status: 400 });
        if (!original_paragraphs || !rewrite_json) {
            return Response.json({ error: 'original_paragraphs and rewrite_json are required' }, { status: 400 });
        }

        // Build rewrite map: id -> rewritten text
        let items = [];
        try {
            const clean = rewrite_json.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
            items = JSON.parse(clean);
        } catch (e) {
            return Response.json({ error: 'Could not parse rewrite JSON: ' + e.message }, { status: 400 });
        }
        const rewriteById = {};
        for (const item of items) rewriteById[item.id] = item.rewritten;

        // Build text-key -> rewritten map from the original paragraphs that were rewritten
        const keyToRewritten = {};
        let applied = 0;
        for (const p of original_paragraphs) {
            if (p.protected) continue;
            const rewritten = rewriteById[p.id];
            if (!rewritten) continue;
            keyToRewritten[textKey(p.text)] = rewritten;
            applied++;
        }

        console.log(`[rewriteDocumentInPlace] ${applied} rewrites to apply, file="${filename}"`);

        // Load the original docx (decode base64 to bytes first for robust loading)
        const binString = atob(file_base64);
        const fileBytes = new Uint8Array(binString.length);
        for (let i = 0; i < binString.length; i++) fileBytes[i] = binString.charCodeAt(i);
        const zip = await JSZip.loadAsync(fileBytes);
        const docFile = zip.file('word/document.xml');
        if (!docFile) return Response.json({ error: 'Not a valid .docx (no document.xml).' }, { status: 400 });
        let docXml = await docFile.async('string');

        // Replace each <w:p> whose text matches a rewritten paragraph
        let replaced = 0;
        docXml = docXml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (pXml) => {
            // Skip paragraphs that embed images/objects — don't risk destroying them
            if (/<w:drawing\b|<w:pict\b|<w:object\b/.test(pXml)) return pXml;

            const norm = textKey(paragraphText(pXml));
            if (!norm) return pXml;
            const rewritten = keyToRewritten[norm];
            if (!rewritten) return pXml;

            replaced++;
            return rewriteParagraph(pXml, rewritten);
        });

        console.log(`[rewriteDocumentInPlace] replaced ${replaced} paragraphs`);

        zip.file('word/document.xml', docXml);
        const outB64 = await zip.generateAsync({
            type: 'base64',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 },
        });

        const outputFilename = filename.replace(/\.docx$/i, '') + '-rewritten.docx';
        return Response.json({ file_base64: outB64, filename: outputFilename });
    } catch (error) {
        console.error('[rewriteDocumentInPlace]', error.message, error.stack);
        return Response.json({ error: error.message }, { status: 500 });
    }
});