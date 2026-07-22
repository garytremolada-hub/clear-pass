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

        // Normalize text for fuzzy comparison (collapses whitespace, smart
        // quotes, NBSP, ellipses). Used for the fallback text-match map and the
        // diagnostic comparison below.
        const normalizeForCompare = (s: string) => (s || '')
            .replace(/\s+/g, ' ')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/\u2026/g, '...')
            .replace(/[\u00A0\u200B]/g, ' ')
            .trim();

        // Build lookups for matching rewrites to paragraphs. ID is primary
        // (stable & unique per paragraph); a normalized-text map is kept only
        // as a fallback for the rare case where the frontend's paragraph ids
        // don't line up with the docx (e.g. mammoth-based fallback numbering).
        const rewriteById = {};
        const rewriteByNormText = {};
        for (const item of items) {
            rewriteById[item.id] = item.rewritten;
            if (item.original) rewriteByNormText[normalizeForCompare(item.original)] = item.rewritten;
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

        // === DIAGNOSTIC LOGGING (temporary — verify rewrite matching) ===
        console.log('=== REWRITE DEBUG ===');
        console.log('Number of paragraphs extracted from docx XML:', docParagraphs.length);
        console.log('Number of rewrite items received from frontend:', items.length);

        let exactFalseCount = 0;
        let normalizedMatchCount = 0;
        const noMatchSamples: any[] = [];
        items.forEach((r: any, i: number) => {
            const orig = r.original || '';
            const exactMatchFound = docParagraphs.some(p => p.text === orig);
            if (!exactMatchFound) {
                exactFalseCount++;
                const normMatchFound = docParagraphs.some(p => normalizeForCompare(p.text) === normalizeForCompare(orig));
                if (normMatchFound) normalizedMatchCount++;
                const closest = docParagraphs.find(p => p.text.substring(0, 30) === orig.substring(0, 30));
                const sample = {
                    index: i,
                    id: r.id,
                    originalTextPreview: orig.substring(0, 80),
                    originalTextLength: orig.length,
                    rewrittenPreview: (r.rewritten || '').substring(0, 80),
                    rewrittenLength: (r.rewritten || '').length,
                    exactMatchFound: false,
                    normalizedMatchFound: normMatchFound,
                    closestParagraphPreview: closest ? closest.text.substring(0, 80) : 'none',
                };
                noMatchSamples.push(sample);
                console.log(`Rewrite ${i} (id=${r.id}):`, JSON.stringify(sample));
            }
        });

        const textCounts: Record<string, number> = {};
        items.forEach((r: any) => { const t = r.original || ''; if (t) textCounts[t] = (textCounts[t] || 0) + 1; });
        const duplicates = Object.entries(textCounts).filter(([, c]) => c > 1);
        const docTextCounts: Record<string, number> = {};
        docParagraphs.forEach(p => { if (p.text) docTextCounts[p.text] = (docTextCounts[p.text] || 0) + 1; });
        const docDups = Object.entries(docTextCounts).filter(([, c]) => c > 1);

        console.log(`Rewrite items with NO exact text match: ${exactFalseCount} / ${items.length}`);
        console.log(`Of those, matched after normalization: ${normalizedMatchCount}`);
        console.log(`Duplicate original texts among rewrite items: ${duplicates.length} distinct (covering ${duplicates.reduce((n, [, c]) => n + c, 0)} items)`);
        if (duplicates.length) duplicates.slice(0, 8).forEach(([t, c]) => console.log(`  rewrite dup x${c}: "${t.substring(0, 60)}"`));
        console.log(`Duplicate texts among docx paragraphs: ${docDups.length} distinct (covering ${docDups.reduce((n, [, c]) => n + c, 0)} paragraphs)`);
        if (docDups.length) docDups.slice(0, 8).forEach(([t, c]) => console.log(`  docx dup x${c}: "${t.substring(0, 60)}"`));
        console.log('=== END REWRITE DEBUG ===');

        const _debug = {
            docxParagraphCount: docParagraphs.length,
            rewriteItemCount: items.length,
            exactFalseCount,
            normalizedMatchCount,
            duplicateRewriteTexts: duplicates.length,
            duplicateDocxTexts: docDups.length,
            noMatchSamples: noMatchSamples.slice(0, 10),
        };

        // Match by paragraph ID first (each id → its own rewrite, so duplicate
        // paragraphs are rewritten independently). Fall back to normalized text
        // only when no rewrite exists for that id — this avoids the old bug
        // where a text-keyed lookup collapsed duplicates and applied the wrong
        // rewrite to the first occurrence, and where encoding/whitespace
        // differences silently broke exact text matching.
        const rewriteByIndex = {};
        for (const p of docParagraphs) {
            if (rewriteById[p.id] != null) {
                rewriteByIndex[p.id] = rewriteById[p.id];
            } else if (p.text) {
                const norm = normalizeForCompare(p.text);
                if (rewriteByNormText[norm] != null) {
                    rewriteByIndex[p.id] = rewriteByNormText[norm];
                }
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
        return Response.json({ file_base64: outB64, filename: outputFilename, _debug: { ..._debug, replaced } });
    } catch (error) {
        console.error('[rewriteDocumentInPlace]', error.message, error.stack);
        return Response.json({ error: error.message }, { status: 500 });
    }
});