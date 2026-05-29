import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {
    Document,
    Paragraph,
    TextRun,
    HeadingLevel,
    Packer,
    AlignmentType,
} from 'npm:docx@8.5.0';

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { original_paragraphs, rewrite_json, filename } = await req.json();
        if (!original_paragraphs || !rewrite_json || !filename) {
            return Response.json({ error: 'original_paragraphs, rewrite_json, and filename are required' }, { status: 400 });
        }

        // Parse rewrite map: { paragraphId -> rewrittenText }
        let rewriteMap;
        try {
            const clean = rewrite_json.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
            const items = JSON.parse(clean);
            rewriteMap = {};
            for (const item of items) rewriteMap[item.id] = item.rewritten;
        } catch (e) {
            return Response.json({ error: 'Could not parse rewrite JSON: ' + e.message }, { status: 400 });
        }

        console.log(`[rewriteDocumentFormatted] ${Object.keys(rewriteMap).length} rewrites, ${original_paragraphs.length} paragraphs, file="${filename}"`);

        // Build document children
        const children = [];

        for (const para of original_paragraphs) {
            const isChanged = !para.protected && !!rewriteMap[para.id];
            const text = isChanged ? rewriteMap[para.id] : para.text;

            if (!text || !text.trim()) {
                // Empty paragraph — add spacing
                children.push(new Paragraph({ spacing: { after: 80 } }));
                continue;
            }

            // Detect heading style from original text
            const trimmed = para.text.trim();
            const isHeading1 = /^[A-Z][A-Z\s]{4,}$/.test(trimmed) && trimmed.length < 80;
            const isHeading2 = trimmed.endsWith(':') && trimmed.length < 60 && !trimmed.includes('\n');

            if (isHeading1) {
                children.push(new Paragraph({
                    text: text,
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 240, after: 120 },
                }));
            } else if (isHeading2) {
                children.push(new Paragraph({
                    text: text,
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 160, after: 80 },
                }));
            } else {
                children.push(new Paragraph({
                    children: [new TextRun({
                        text: text,
                        highlight: isChanged ? 'yellow' : undefined,
                        size: 22,
                        font: 'Arial',
                    })],
                    spacing: { after: 120 },
                }));
            }
        }

        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: { font: 'Arial', size: 22 },
                    },
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

        // Convert Node Buffer / Uint8Array to base64 safely
        const bytes = new Uint8Array(buffer);
        const CHUNK = 0x8000;
        let b64 = '';
        for (let i = 0; i < bytes.length; i += CHUNK) {
            b64 += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
        }
        const file_base64 = btoa(b64);

        const outputFilename = filename.replace(/\.docx$/i, '') + '-rewritten.docx';
        console.log(`[rewriteDocumentFormatted] Done. Output ${bytes.length} bytes → "${outputFilename}"`);

        return Response.json({ file_base64, filename: outputFilename });

    } catch (error) {
        console.error('[rewriteDocumentFormatted]', error.message, error.stack);
        return Response.json({ error: error.message }, { status: 500 });
    }
});