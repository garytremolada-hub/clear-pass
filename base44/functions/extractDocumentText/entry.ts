import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
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
            // ── Attempt 1: Fetch + JSZip + XML extraction ──
            try {
                console.log('[extractDocumentText] fetching file...');
                const fileRes = await fetch(file_url);
                if (fileRes.ok) {
                    const arrayBuffer = await fileRes.arrayBuffer();
                    const buffer = new Uint8Array(arrayBuffer);
                    console.log('[extractDocumentText] fetched ' + buffer.length + ' bytes');

                    let docXml = '';
                    try {
                        const zip = await JSZip.loadAsync(buffer);
                        const docFile = zip.file('word/document.xml');
                        if (docFile) {
                            docXml = await docFile.async('string');
                            paragraphs = extractParagraphs(docXml);
                            console.log('[extractDocumentText] JSZip OK: ' + paragraphs.length + ' paragraphs');
                        }
                    } catch (zipErr) {
                        console.log('[extractDocumentText] JSZip failed: ' + zipErr.message);
                    }

                    if (docXml) {
                        // Extract text from XML by stripping tags, preserving paragraph breaks
                        text = docXml
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
                        console.log('[extractDocumentText] XML text: ' + text.length + ' chars');
                    }
                } else {
                    console.log('[extractDocumentText] fetch returned ' + fileRes.status);
                }
            } catch (fetchErr) {
                console.log('[extractDocumentText] fetch/extract failed: ' + fetchErr.message);
            }

            // ── Attempt 2: LLM with file_urls (works even if fetch failed) ──
            if (!text.trim()) {
                console.log('[extractDocumentText] falling back to LLM');
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
                    console.log('[extractDocumentText] LLM extracted ' + text.length + ' chars');
                } catch (llmErr) {
                    console.log('[extractDocumentText] LLM failed: ' + llmErr.message);
                }
            }
        } else {
            // PDF: use InvokeLLM with file_urls
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
        console.error('[extractDocumentText] FATAL:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});