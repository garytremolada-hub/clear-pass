import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import mammoth from 'npm:mammoth@1.9.0';
import JSZip from 'npm:jszip@3.10.1';
import { extractParagraphs } from '../../shared/paragraphUtils.js';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file_url, file_name, label } = await req.json();
        if (!file_url) {
            return Response.json({ error: 'file_url is required' }, { status: 400 });
        }

        console.log(`[extractDocumentText] label="${label}" file_name="${file_name}" url="${file_url}"`);

        const isDocx = file_name?.toLowerCase().endsWith('.docx') ||
                       file_url.toLowerCase().includes('.docx');

        let text = '';
        let paragraphs = [];

        if (isDocx) {
            // Fetch the file bytes and extract text with mammoth (for scoring).
            console.log('[extractDocumentText] fetching file from url...');
            const fileRes = await fetch(file_url);
            if (!fileRes.ok) {
                console.log('[extractDocumentText] fetch failed: ' + fileRes.status);
                return Response.json({ error: `Failed to fetch file: ${fileRes.status}` }, { status: 500 });
            }
            const arrayBuffer = await fileRes.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);
            console.log('[extractDocumentText] fetched ' + buffer.length + ' bytes');

            let result;
            try {
                result = await mammoth.extractRawText({ buffer });
                text = result.value || '';
                console.log('[extractDocumentText] mammoth extracted ' + text.length + ' chars');
            } catch (mammothErr) {
                console.log('[extractDocumentText] mammoth failed: ' + mammothErr.message);
                text = '';
            }

            // Also extract docx-accurate paragraphs (id + text + protected)
            // directly from document.xml, so the in-place rewrite can match
            // paragraphs by their exact index instead of fragile text matching.
            let docXml = '';
            try {
                const zip = await JSZip.loadAsync(buffer);
                const docFile = zip.file('word/document.xml');
                if (docFile) {
                    docXml = await docFile.async('string');
                    paragraphs = extractParagraphs(docXml);
                    console.log('[extractDocumentText] JSZip extracted ' + paragraphs.length + ' paragraphs');
                }
            } catch (e) {
                console.log('[extractDocumentText] paragraph extraction failed: ' + e.message);
            }

            // Fallback 1: if mammoth returned empty text, extract directly from XML
            if (!text.trim() && docXml) {
                console.log('[extractDocumentText] mammoth returned empty text, falling back to XML extraction');
                const xmlText = docXml
                    .replace(/<w:p[ >]/g, '\n<w:p ')
                    .replace(/<[^>]+>/g, '')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&apos;/g, "'")
                    .replace(/&#\d+;/g, ' ')
                    .split('\n')
                    .map(line => line.trim())
                    .filter(Boolean)
                    .join('\n');
                text = xmlText;
                console.log('[extractDocumentText] XML fallback extracted ' + text.length + ' chars');
            }

            // Fallback 2: if still empty, use LLM vision model (handles .doc, corrupted .docx, etc.)
            if (!text.trim()) {
                console.log('[extractDocumentText] all local extraction failed, falling back to LLM vision');
                try {
                    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
                        prompt: `Extract the complete plain text content from this document. Output ONLY the raw text — no commentary, no summary, no extra formatting. Preserve all headings, paragraphs, numbered lists, bullet points, and table content as plain text. Do not omit or paraphrase anything.`,
                        file_urls: [file_url],
                        response_json_schema: {
                            type: 'object',
                            properties: {
                                text: {
                                    type: 'string',
                                    description: 'The complete verbatim plain text content of the document'
                                }
                            },
                            required: ['text']
                        }
                    });
                    text = llmResult?.text || '';
                    console.log('[extractDocumentText] LLM fallback extracted ' + text.length + ' chars');
                } catch (llmErr) {
                    console.log('[extractDocumentText] LLM fallback failed: ' + llmErr.message);
                }
            }
        } else {
            // PDF: use InvokeLLM with file_urls (vision model handles PDFs well)
            const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: `Extract the complete plain text content from this PDF document. Output ONLY the raw text — no commentary, no summary, no extra formatting. Preserve all headings, paragraphs, numbered lists, bullet points, and table content as plain text. Do not omit or paraphrase anything.`,
                file_urls: [file_url],
                response_json_schema: {
                    type: 'object',
                    properties: {
                        text: {
                            type: 'string',
                            description: 'The complete verbatim plain text content of the document'
                        }
                    },
                    required: ['text']
                }
            });
            text = result?.text || '';
        }

        if (!text.trim()) {
            return Response.json({ error: 'No text could be extracted from the document.' }, { status: 422 });
        }

        console.log(`[extractDocumentText] SUCCESS label="${label}" extracted ${text.length} chars, ${paragraphs.length} paragraphs — preview: ${text.slice(0, 150)}`);

        return Response.json({ text, paragraphs, label: label || 'document' });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});