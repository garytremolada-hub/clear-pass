import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import JSZip from 'npm:jszip@3.10.1';
import {
    newParagraphRegex,
    isSelfClosingParagraph,
    hasEmbeddedObject,
    rewriteParagraph,
    extractParagraphs,
    paragraphText,
} from '../../shared/paragraphUtils.js';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { file_base64, rewrite_json, filename } = await req.json();
        if (!file_base64) return Response.json({ error: 'file_base64 is required' }, { status: 400 });
        if (!rewrite_json) return Response.json({ error: 'rewrite_json is required' }, { status: 400 });

        // rewrite_json: [{id, original, rewritten}] — original is the paragraph's
        // full text (as extracted by extractParagraphs). We match rewrites to
        // paragraphs by their text so the correct paragraph is rewritten even
        // when the frontend's id numbering doesn't line up with XML order.
        let items = [];
        try {
            const clean = rewrite_json.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
            items = JSON.parse(clean);
        } catch (e) {
            return Response.json({ error: 'Could not parse rewrite JSON: ' + e.message }, { status: 400 });
        }

        // Build a lookup from original-text → rewritten-text.
        const rewriteByText = {};
        const rewriteById = {};
        for (const item of items) {
            rewriteById[item.id] = item.rewritten;
            if (item.original) rewriteByText[item.original] = item.rewritten;
        }

        console.log(`[rewriteDocumentInPlace] ${items.length} rewrites to apply, file="${filename}"`);

        // Decode base64 → bytes for robust zip loading.
        const binString = atob(file_base64);
        const fileBytes = new Uint8Array(binString.length);
        for (let i = 0; i < binString.length; i++) fileBytes[i] = binString.charCodeAt(i);
        const zip = await JSZip.loadAsync(fileBytes);
        const docFile = zip.file('word/document.xml');
        if (!docFile) return Response.json({ error: 'Not a valid .docx (no document.xml).' }, { status: 400 });
        let docXml = await docFile.async('string');

        // Extract the authoritative paragraph list from the docx itself, so we
        // can match rewrites by text (robust) and fall back to id alignment.
        const docParagraphs = extractParagraphs(docXml);
        // Map: paragraph index → rewritten text, resolved via text match first.
        const rewriteByIndex = {};
        for (const p of docParagraphs) {
            const byText = p.text && rewriteByText[p.text];
            if (byText != null) {
                rewriteByIndex[p.id] = byText;
            } else if (rewriteById[p.id] != null) {
                rewriteByIndex[p.id] = rewriteById[p.id];
            }
        }

        // Replace paragraphs by their stable index. Every <w:p> (including
        // self-closing and drawing paragraphs) increments the index, keeping
        // ids aligned with extractParagraphs.
        let idx = 0;
        let replaced = 0;
        const re = newParagraphRegex();
        docXml = docXml.replace(re, (pXml) => {
            idx++;
            if (isSelfClosingParagraph(pXml)) return pXml;
            if (hasEmbeddedObject(pXml)) return pXml;
            const rewritten = rewriteByIndex[idx];
            if (!rewritten) return pXml;
            replaced++;
            return rewriteParagraph(pXml, rewritten);
        });

        console.log(`[rewriteDocumentInPlace] replaced ${replaced} paragraphs (of ${docParagraphs.length} total)`);

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