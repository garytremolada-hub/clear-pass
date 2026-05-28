import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { unzipSync, zipSync, strToU8, strFromU8 } from 'npm:fflate@0.8.2';

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { file_base64, rewrite_json, filename } = await req.json();
        if (!file_base64 || !rewrite_json || !filename) {
            return Response.json({ error: 'file_base64, rewrite_json, and filename are required' }, { status: 400 });
        }

        // Parse rewrite map: { paragraphId -> rewrittenText }
        let rewrites;
        try {
            const clean = rewrite_json.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
            const items = JSON.parse(clean);
            rewrites = {};
            for (const item of items) rewrites[item.id] = item.rewritten;
        } catch (e) {
            return Response.json({ error: 'Could not parse rewrite JSON: ' + e.message }, { status: 400 });
        }

        console.log(`[rewriteDocumentFormatted] ${Object.keys(rewrites).length} rewrites for "${filename}"`);

        // Decode base64 → Uint8Array
        const binaryStr = atob(file_base64);
        const inputBytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) inputBytes[i] = binaryStr.charCodeAt(i);

        // Unzip the .docx
        let zipEntries;
        try {
            zipEntries = unzipSync(inputBytes);
        } catch (e) {
            return Response.json({ error: 'Could not open .docx file: ' + e.message }, { status: 400 });
        }

        if (!zipEntries['word/document.xml']) {
            return Response.json({ error: 'Invalid .docx — word/document.xml not found' }, { status: 400 });
        }

        // Decode document.xml
        let documentXml = strFromU8(zipEntries['word/document.xml']);

        // Patch paragraphs in document order
        let paraIndex = 1;
        documentXml = documentXml.replace(
            /(<w:p[ >])([\s\S]*?)(<\/w:p>)/g,
            (match, open, content, close) => {
                const idx = paraIndex++;
                if (!rewrites[idx]) return match;

                const newText = rewrites[idx]
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');

                // Preserve paragraph properties (indent, numbering, spacing etc)
                const pPrMatch = content.match(/<w:pPr[\s\S]*?<\/w:pPr>/);
                const pPr = pPrMatch ? pPrMatch[0] : '';

                // Preserve run properties and inject yellow highlight
                const rPrMatch = content.match(/<w:rPr[\s\S]*?<\/w:rPr>/);
                const rPr = rPrMatch
                    ? rPrMatch[0].replace('</w:rPr>', '<w:highlight w:val="yellow"/></w:rPr>')
                    : '<w:rPr><w:highlight w:val="yellow"/></w:rPr>';

                return `${open}${pPr}<w:r>${rPr}<w:t xml:space="preserve">${newText}</w:t></w:r>${close}`;
            }
        );

        // Replace updated document.xml in zip entries
        zipEntries['word/document.xml'] = strToU8(documentXml);

        // Repack as .docx
        const outputBytes = zipSync(zipEntries, { level: 6 });

        // Encode to base64 safely (avoid call stack limit on large files)
        let b64 = '';
        const chunk = 8192;
        for (let i = 0; i < outputBytes.length; i += chunk) {
            b64 += String.fromCharCode(...outputBytes.slice(i, i + chunk));
        }

        const outputFilename = filename.replace(/\.docx$/i, '') + '-rewritten.docx';
        console.log(`[rewriteDocumentFormatted] Done. ${inputBytes.length} → ${outputBytes.length} bytes`);

        return Response.json({ file_base64: btoa(b64), filename: outputFilename });

    } catch (error) {
        console.error('[rewriteDocumentFormatted]', error.message, error.stack);
        return Response.json({ error: error.message }, { status: 500 });
    }
});