import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import JSZip from 'npm:jszip@3.10.1';
import {
    newParagraphRegex,
    isSelfClosingParagraph,
    hasEmbeddedObject,
    rewriteParagraph,
    extractParagraphs,
} from '../../shared/paragraphUtils.js';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { file_url, file_base64, rewrite_json, filename } = await req.json();
        if (!rewrite_json) return Response.json({ error: 'rewrite_json is required' }, { status: 400 });
        if (!file_url && !file_base64) return Response.json({ error: 'file_url or file_base64 is required' }, { status: 400 });

        // rewrite_json: [{id, original, rewritten}] from the frontend. Each id is
        // the docx-accurate paragraph index (extractDocumentText →
        // extractParagraphs), which aligns exactly with the ids enumerated below
        // from the same document.xml — so we match by id only.
        let items = [];
        try {
            const clean = rewrite_json.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
            items = JSON.parse(clean);
        } catch (e) {
            return Response.json({ error: 'Could not parse rewrite JSON: ' + e.message }, { status: 400 });
        }

        const rewriteById = {};
        for (const item of items) {
            rewriteById[item.id] = item.rewritten;
        }

        console.log(`[rewriteDocumentInPlace] ${items.length} rewrites to apply, file="${filename}" url="${!!file_url}" b64="${!!file_base64}"`);

        // Load the original document bytes. Prefer file_url (the frontend always
        // has it from UploadFile), fetched server-side — this avoids the
        // browser-side fetch that failed with "Original document not found"
        // (CORS / lost in-memory base64 on refresh). file_base64 is a fallback.
        let fileBytes;
        if (file_url) {
            const fileRes = await fetch(file_url);
            if (!fileRes.ok) return Response.json({ error: `Could not fetch original document (status ${fileRes.status}).` }, { status: 502 });
            const ab = await fileRes.arrayBuffer();
            fileBytes = new Uint8Array(ab);
        } else {
            const binString = atob(file_base64);
            fileBytes = new Uint8Array(binString.length);
            for (let i = 0; i < binString.length; i++) fileBytes[i] = binString.charCodeAt(i);
        }
        const zip = await JSZip.loadAsync(fileBytes);
        const docFile = zip.file('word/document.xml');
        if (!docFile) return Response.json({ error: 'Not a valid .docx (no document.xml).' }, { status: 400 });
        let docXml = await docFile.async('string');

        // Extract the authoritative paragraph list from the docx. The ids here
        // are the same 1-based indices the frontend used to key its rewrites.
        const docParagraphs = extractParagraphs(docXml);

        // Match by paragraph id ONLY. The frontend sends docx-accurate ids
        // (extractDocumentText → extractParagraphs), which align exactly with
        // the ids enumerated here from the same document.xml. The previous
        // normalized-text fallback applied each rewrite to EVERY paragraph
        // sharing that text — rewriting duplicate table cells / labels the user
        // never selected and collapsing each to a single run, which destroyed
        // their formatting. id-only matching guarantees applied == received and
        // leaves every other paragraph (and its formatting) untouched.
        const rewriteByIndex = {};
        for (const p of docParagraphs) {
            if (rewriteById[p.id] != null) {
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
        console.log(`[rewriteDocumentInPlace] SUMMARY: docxParagraphs=${docParagraphs.length} rewriteItems=${items.length} applied=${replaced}`);

        return Response.json({ file_base64: outB64, filename: outputFilename });
    } catch (error) {
        console.error('[rewriteDocumentInPlace]', error.message, error.stack);
        return Response.json({ error: error.message }, { status: 500 });
    }
});